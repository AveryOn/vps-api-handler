import type { Request, Response } from "express"
import type { GitHubPushEventPayload, GitHubWebhookHeaders } from "../types/webhooks.types"
import { verifySignatureGitHub } from "../utils/verify"
import { exec } from "child_process"
import moment from "moment"

type GitHubGuardResponse = { payload: GitHubPushEventPayload, event: string }
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
        if(event?.toLocaleLowerCase() === 'push') {
            // берем коммит, по которому будем деплоить
            const commitSha = payload.head_commit?.id
            if (!commitSha) throw 400
    
            // узнаём, куда правим: dev или main
            const branch = payload.ref.replace('refs/heads/', '')
            // выбираем скрипт
            const scriptPath =
                branch === 'dev'
                    ? 'sound-sphere-eng-deploy-dev.sh'
                    : 'sound-sphere-eng-deploy-prod.sh'
    
    
            // абсолютный путь до твоего скрипта на VPS
    
            const formattedDate = moment(Date.now()).format('DD.MM.YYYY_HH-mm-ss')
            // формируем команду, передаем SHA как аргумент
            const cmd = `bash ${scriptPath} deploy-${formattedDate}___SHA:${commitSha}`
    
            console.log(`🚀 Starting deploy for commit ${commitSha}`)
    
            await new Promise<void>((resolve, reject) => {
                exec(cmd, (err, stdout, stderr) => {
                    if (err) {
                        console.error('❌ Deploy script failed:', stderr)
                        return reject(err)
                    }
                    console.log('✅ Deploy successful:', stdout)
                    resolve(void 0)
                })
            })
        }
    } catch (err) {
        throw 401
    }
}