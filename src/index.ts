import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cors from 'cors'
import { config } from 'dotenv'
import { verifyGitHubSignature } from './utils/github-hmac-signature'
config()

const app = express()
const PORT = process.env.PORT ?? 4000

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
  legacyHeaders: false
}))

// 4) Парсинг JSON (для остальных эндпоинтов)
app.use(express.json())

// 5) Webhook GitHub
app.get('/webhooks', express.raw({ type: '*/*' }), (req, res) => {
  console.log('GitHub Event:', req.headers['x-github-event'])
  res.status(200).send(req.headers)
})

app.post(
    '/webhooks', 
    express.raw({ type: '*/*' }), 
    (req, res, next) => {
        const event = req.headers['x-github-event']
        const signature = req.headers['x-hub-signature-256']

        console.log('HEADERS:', JSON.stringify(req.headers, null, 4));

        console.log('GitHub Event:', event)
        console.log('GitHub Signature:', signature)
        console.log('Payload:', JSON.stringify(req.body, null, 4))

        const isValidSign = verifyGitHubSignature(req, signature as string)
        if(isValidSign) {
            res.status(200).send('OK')
            next()
        }
        else {
            res
            .status(401)
            .send('Invalid signature')
        }
    })

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`)
})
