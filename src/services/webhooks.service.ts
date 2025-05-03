import type { Request, Response } from "express"
import type { GitHubPushEventPayload, GitHubWebhookHeaders } from "../types/webhooks.types"
import { verifySignatureGitHub } from "../utils/verify"
import { exec } from "child_process"
import moment from "moment"
import { DeploymentStore } from "../db/store"
import { formatDate } from "../utils/datetime"

type GitHubGuardResponse = { payload: GitHubPushEventPayload, event: string }
type ENVIRONMENTS = 'DEV' | 'PROD' | 'LOCAL'
interface ExecuteDeploymentScript {
    script: string,
    branch: string,
    environment?: string | null,
    namespace?: string | null,
}
/**
 * Общие правила при обработке вебхуков
 */
const RULESET = {
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
    ] as string[]
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
            throw 401
        }

        const payload = req.body.toString()   // строка JSON

        let valid = false
        try {
            valid = await verifySignatureGitHub(secret, signature as string, payload)
        } catch (err) {
            console.error('Error verifying signature:', err)
            throw 401
        }
        if (!valid) {
            throw 401
        }

        // здесь уже безопасно обрабатывать вебхук
        console.log('✅ Verified GitHub event:', req.headers['x-github-event'])
        const body: GitHubPushEventPayload = JSON.parse(req.body.toString('utf-8'))
        if (!body) {
            throw 401
        }
        return {
            event: headers['x-github-event'],
            payload: body,
        }
    } catch (err) {
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
    if (!payload?.repository || !event) throw 401
    try {
        if (event?.toLocaleLowerCase() === 'push') {
            // берем коммит, по которому будем деплоить
            const commitSha = payload.head_commit?.id
            if (!commitSha) throw 400

            /**
             * ветка на которую был push
             */
            const branch = payload.ref.replace('refs/heads/', '')
            const configs = [
                pushForSoundSphereEngRepo(branch)
            ]

            const formattedDate = moment(Date.now()).format('DD.MM.YYYY_HH-mm-ss')
            const deployments = new DeploymentStore()

            for (const config of configs) {
                const commitName = `deploy-${formattedDate}___SHA:${commitSha}`
                // формируем команду, передаем SHA как аргумент
                const cmd = `bash ${config.script} ${commitName}`
                const nowMs = Date.now()
    
                if(!RULESET.enabled_branch_names.includes(config.branch)) {
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
                    })
                    exec(cmd, async (err, stdout, stderr) => {
                        if (err) {
                            console.error('❌ Deploy script failed:', stderr)
                            deployments.update(newDeployment.id, {
                                status: 'failed',
                                end_at: formatDate(),
                                execution_time: String(Date.now() - nowMs),
                            })
                            console.log('ERROR', err);
                            return reject(err)
                        }
                        console.log('✅ Deploy successful:', stdout)
                        deployments.update(newDeployment.id, {
                            status: 'success',
                            end_at: formatDate(),
                            execution_time: String(Date.now() - nowMs),
                        })
                        resolve(void 0)
                    })
                })
            }
        }
    } catch (err) {
        throw 401
    }
}

/**
 * Инкапсулирует логику вызова deploy скрипта для проекта sound-sphere-eng
 */
function pushForSoundSphereEngRepo(branch: string): ExecuteDeploymentScript {
    try {
        const environments: Record<string, ENVIRONMENTS> = {
            dev: 'DEV',
            main: 'PROD'
        } as const
        // выбираем скрипт
        const scriptPath =
            branch === 'dev'
                ? 'sound-sphere-eng-deploy-dev.sh'
                : 'sound-sphere-eng-deploy-prod.sh'
        return {
            script: scriptPath,
            branch,
            environment: environments[branch] ?? null,
            namespace: 'sound-sphere-eng',
        }
    } catch (err) {
        console.error(err)
        throw err
    }
}