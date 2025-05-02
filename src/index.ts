import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cors from 'cors'
import { config } from 'dotenv'
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
  console.log('Payload:', req.body.toString())
  res.status(200).send('OK')
})

app.post('/webhooks', express.raw({ type: '*/*' }), (req, res) => {
    console.log('GitHub Event:', req.headers['x-github-event'])
    console.log('Payload:', req.body.toString())
    res.status(200).send('OK')
})

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`)
})
