import express, { type Request } from 'express'
import './const/global'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cors from 'cors'
import { config } from 'dotenv'
import { gitHubWebhookControllerGuard, gitHubWebhookHandler } from './services/webhooks.service'
import routes from './routes'
config()

const app = express()
const PORT = process.env.PORT ?? 4000

console.debug({
  PORT, 
  WEBHOOKS_SECRET: process.env.WEBHOOKS_SECRET
})
app.set('trust proxy', 1);
// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-GitHub-Event', 'X-Hub-Signature'],
  credentials: true,
}))
// HTTP-headers protection
app.use(helmet())
// 3) Rate-limit (простой DDoS-щит)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 минут
  max: 10000,               // не больше 100 запросов с одного IP за window
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: true,
    xForwardedForHeader: false,
  },
}))
// Регистрация маршрутов
routes.forEach((route) => {
  app.use(route.path, route.router)
})
app.use(express.json())
console.debug('HELLO WORLD 123')

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`)
})
