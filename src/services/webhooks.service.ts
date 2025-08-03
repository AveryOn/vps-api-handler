import type { Request, Response } from "express"
import type { GitHubPushEventPayload, GitHubWebhookHeaders, GitHubRepository, GitHubGuardResponse, ExecuteDeploymentScript, ENVIRONMENTS } from "../types/webhooks.types"
import { verifySignatureGitHub } from "../utils/verify"
import { exec } from "child_process"
import moment from "moment"
import { DeploymentStore } from "../db/store"
import { formatDate } from "../utils/datetime"
import path from "path"
import { __dirname } from "../const/global"


enum ProjectsNames {
    auth = 'auth',
    'vps-api-handler' = 'vps-api-handler',
    'spheres-dashboard' = 'spheres-dashboard',
}
/**
 * Общие правила при обработке вебхуков
 */
const RULESET = {
    /**
     * Таблица сопоставления ключей формата **{имя-репозитория + [dev/prod]}**: **имя-файла-скрипта.sh (в ./scripts)**
     */
    scripts: {
        [`${ProjectsNames.auth}-dev`]: 'auth-dev.sh',
        [`${ProjectsNames.auth}-prod`]: 'auth-prod.sh',
        [`${ProjectsNames['vps-api-handler']}-prod`]: 'deployments.sh',
        [`${ProjectsNames['vps-api-handler']}-dev`]: 'deployments.sh',
        [`${ProjectsNames['spheres-dashboard']}-prod`]: 'spheres-dashboard-prod.sh',
        [`${ProjectsNames['spheres-dashboard']}-dev`]: 'spheres-dashboard-dev.sh',
    },
    /**
     * Имена веток, которые допустимы для применения деплоя в среде
     */
    enabled_branch_names: [
        'dev',
        'main',
        'master',
        'develop',
        'prod',
        'production',
    ] as const
} as const

/**
 * Защита контроллера для вебхука пришедшего с гитхаба
 * @param req - объект запроса express
 * @returns {Promise<GitHubGuardResponse>} - объект полезной нагрузки вебхука
 */
export async function gitHubWebhookControllerGuard(req: Request): Promise<GitHubGuardResponse> {
    try {
        const headers = req.headers as GitHubWebhookHeaders
        const secret = process.env.WEBHOOKS_SECRET!
        const signature = headers['x-hub-signature-256']

        if (!signature) {
            console.error('[09] Error');
            throw 401
        }

        const payload = req.body.toString()

        let valid = false
        try {
            valid = await verifySignatureGitHub(secret, signature as string, payload)
        } catch (err) {
            console.error('[08] Error', err)
            throw 401
        }
        if (!valid) {
            console.error('[07] Error')
            throw 401
        }

        console.log('✅ Verified GitHub event:', req.headers['x-github-event'])
        const body: GitHubPushEventPayload = JSON.parse(req.body.toString('utf-8'))
        if (!body) {
            console.error('[06] Error')
            throw 401
        }
        return {
            event: headers['x-github-event'],
            payload: body,
        }
    } catch (err) {
        console.error('[05] Error', err)
        throw 401
    }
}

/**
 * Основной обработчик вебхуков гитхаба
 * @param {GitHubPushEventPayload} payload - payload вебхука
 */
export async function gitHubWebhookHandler(
    payload: GitHubPushEventPayload,
    event: string
): Promise<void> {
    if (!payload?.repository || !event) {
        console.error('[01] Error')
        throw 401;
    }
    try {
        if (event?.toLowerCase() === 'push') {
            // берем коммит, по которому будем деплоить
            const commitSha = payload.head_commit?.id
            if (!commitSha) {
                console.error('[02] Error')
                throw 400
            }

            /** ветка на которую был push */
            const branch = payload.ref.replace('refs/heads/', '')
            const configs = [
                pushForSoundSphereEngRepo(branch, payload?.repository),
            ]

            const formattedDate = moment(Date.now()).format('DD.MM.YYYY_HH-mm-ss')
            const deployments = new DeploymentStore()

            for (const config of configs) {
                const commitName = `deploy-${formattedDate}___SHA:${commitSha}`
                // формируем команду, передаем SHA как аргумент
                const cmd = `bash ${config.script} ${commitName}`
                const nowMs = Date.now()
    
                if(!RULESET.enabled_branch_names.includes(config.branch as any)) {
                    return void 0
                }

                console.log(`🚀 Starting deploy for commit ${commitSha}`)
    
                await new Promise<void>((resolve, reject) => {
                    const newDeployment = deployments.create({
                        branch: config.branch,
                        commit_name: commitName,
                        commit_hash: commitSha,
                        script: config.script,
                        status: 'pending',
                        end_at: null,
                        environment: config.environment,
                        execution_time: null,
                        namespace: config.namespace,
                        side: config.side,
                    })
                    exec(cmd, { maxBuffer: 1024 * 1024 }, async (err, stdout, stderr) => {
                        if (err) {
                            console.error('[03] Error', stderr)
                            deployments.update(newDeployment.id, {
                                status: 'failed',
                                end_at: formatDate(),
                                execution_time: String(Date.now() - nowMs),
                            })
                            console.log('[03-1] Error', err);
                            return reject(err)
                        }
                        console.log('✅ Deploy successful:', stdout)
                        deployments.update(newDeployment.id, {
                            status: 'success',
                            end_at: formatDate(),
                            execution_time: String(Date.now() - nowMs),
                        })
                        resolve(void 0);
                    })
                })
            }
        }
    } catch (err) {
        console.error('[04] Error', err);
        throw 401;
    }
}

/**
 * Инкапсулирует логику вызова deploy скрипта для проекта sound-sphere-eng
 */
function pushForSoundSphereEngRepo(branch: string, repository: GitHubRepository): ExecuteDeploymentScript {
    try {
        const environments: Partial<Record<typeof RULESET.enabled_branch_names[number], ENVIRONMENTS>> = {
            dev: 'DEV',
            develop: 'DEV',
            prod: 'PROD',
            production: 'PROD',
            main: 'PROD',
            master: 'PROD',
        } as const;

        const envBranches: Partial<Record<ENVIRONMENTS, typeof RULESET.enabled_branch_names[number][]>> = {
            DEV: ['dev', 'develop'],
            PROD: ['main', 'master', 'prod', 'production']
        } as const;
        // выбираем скрипт
        let scriptPath: string | null = null
        if(envBranches.DEV.includes(branch as any)) {
            scriptPath = RULESET.scripts[`${repository.name}-dev`];
            console.debug('KEY-NAME', `${repository.name}-dev`)
            if(scriptPath) {
                scriptPath = path.join(__dirname, 'scripts', scriptPath)
            }
            else throw 'Не удалось сформировать путь до скрипта';
        }
        else if(envBranches.PROD.includes(branch as any)) {
            scriptPath = RULESET.scripts[`${repository.name}-prod`]
            console.debug('KEY-NAME', `${repository.name}-prod`)
            if(scriptPath) {
                scriptPath = path.join(__dirname, 'scripts', scriptPath)
            }
            else throw 'Не удалось сформировать путь до скрипта'
        }
        let side: ExecuteDeploymentScript['side'] = null
        const repoName = repository.name.toLowerCase();

        // Опеределяем какой репозиторий обновили клиентский или серверный
        if (repoName.includes('client') || repoName.includes('front')) {
            side = 'client';
        }
        else if (repoName.includes('api') || repoName.includes('server') || repoName.includes('backend')) {
            side = 'server';
        }
        return {
            script: scriptPath,
            branch,
            environment: environments[branch] ?? null,
            namespace: 'sound-sphere-eng',
            side: side,
        }
    } catch (err) {
        console.error('[010] Error', err);
        throw err;
    }
}