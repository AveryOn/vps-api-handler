import type { Request, Response } from "express"
import type { GitHubPushEventPayload, GitHubWebhookHeaders } from "../types/webhooks.types"
import { verifySignatureGitHub } from "../utils/verify"


/**
 * Защита контроллера для вебхука пришедшего с гитхаба
 * @param req - объект запроса express
 * @returns {Promise<GitHubPushEventPayload>} - объект полезной нагрузки вебхука
 */
export async function gitHubWebhookControllerGuard(req: Request): Promise<GitHubPushEventPayload> {
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
        if(!body) {
            throw 401
        } 
        return body
    } catch (err) {
        throw 401
    }
}

/**
 * Основной обработчик вебхуков гитхаба
 */
export function gitHubWebhookHandler(repository: GitHubPushEventPayload) {
    if(!repository) throw 401

    
}