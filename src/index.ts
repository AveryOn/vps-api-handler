import express, { type Request } from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cors from 'cors'
import { config } from 'dotenv'
import { verifySignature } from './utils/verify'
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
  legacyHeaders: false,
  validate: { trustProxy: false },
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
      const secret = process.env.WEBHOOKS_SECRET!
      const signature = req.headers['x-hub-signature-256']
      if (!signature) {
        res.status(400).send('Missing X-Hub-Signature-256 header')
        throw 400
      }
  
      const payload = req.body.toString()   // строка JSON
  
      let valid = false
      try {
        valid = await verifySignature(secret, signature as string, payload)
      } catch (err) {
        console.error('Error verifying signature:', err)
        throw 400
      }
      if (!valid) {
        res.status(401).send('Unauthorized')
        throw 401
      }
  
      // здесь уже безопасно обрабатывать вебхук
      console.log('✅ Verified GitHub event:', req.headers['x-github-event'])
      console.log('Payload:', payload)
  
      res.status(200).send('OK')
    }
  )

app.use(express.json())

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`)
})
