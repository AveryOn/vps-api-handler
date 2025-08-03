import express, { type Request } from 'express'
import { Router } from 'express';
import { gitHubWebhookControllerGuard, gitHubWebhookHandler } from '../services/webhooks.service';

const router = Router();


router.post(
    '/',
    express.raw({ type: 'application/json' }),
    async (req: Request, res) => {

        // Если вебхук пришел с гитхаба
        if (req.headers['user-agent'].toLocaleLowerCase().includes('github')) {
            const body = await gitHubWebhookControllerGuard(req)
            try {
                await gitHubWebhookHandler(body.payload, body.event)
                res.status(200).send('Deploy triggered')
                return
            } catch (err) {
                console.error(err)
                res.status(500).send('Deploy failed')
                return
            }
        }
        res.status(200).send('OK')
        return
    }
)

export default {
    path: '/webhooks',
    router,
} as const;