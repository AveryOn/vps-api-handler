import express, { type Request } from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cors from 'cors'
import { config } from 'dotenv'
import { verifySignatureGitHub } from './utils/verify'
import { GitHubPushEventPayload, GitHubWebhookHeaders } from './types/webhooks.types'
import { gitHubWebhookControllerGuard, gitHubWebhookHandler } from './services/webhooks.service'
config()

const app = express()
const PORT = process.env.PORT ?? 4000
app.set('trust proxy', 1)
// 1) CORS
const corsOptions = {
  origin: '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-GitHub-Event','X-Hub-Signature'],
  credentials: true
}
app.use(cors(corsOptions))

// 2) HTTP-headers protection
app.use(helmet())

// 3) Rate-limit (простой DDoS-щит)
app.use(rateLimit({
  windowMs: 15*60*1000,   // 15 минут
  max: 100,               // не больше 100 запросов с одного IP за window
  standardHeaders: true,
  legacyHeaders: false,
  validate: { 
    trustProxy: true,
    xForwardedForHeader: false, 
  },
}))

// 5) Webhook GitHub
app.get('/webhooks', express.raw({ type: '*/*' }), (req, res) => {
  console.log('GitHub Event:', req.headers['x-github-event'])
  res.status(200).send(req.headers)
})

app.post(
    '/webhooks',
    express.raw({ type: 'application/json' }),
    async (req: Request, res) => {
      
      // Если вебхук пришел с гитхаба
      if(req.headers['user-agent'].toLocaleLowerCase().includes('github')) {
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

app.use(express.json())

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`)
})
