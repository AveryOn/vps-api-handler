import express, { type Request } from 'express'
import './const/global'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cors from 'cors'
import { config } from 'dotenv'
import { gitHubWebhookControllerGuard, gitHubWebhookHandler } from './services/webhooks.service'
import { randomBytes } from 'crypto'
config()

// DataBase
import { runMigrations } from './db/migrator'
import { DeploymentStore, DB_NAME } from './db/store'
import { initTabelClient } from './statics/deployment-table'

/* 
  INIT DataBase
*/
const deployments = new DeploymentStore()
runMigrations(DB_NAME)

const app = express()
const PORT = process.env.PORT ?? 4000
app.set('trust proxy', 1)
// 1) CORS
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-GitHub-Event', 'X-Hub-Signature'],
  credentials: true
}
app.use(cors(corsOptions))

// 2) HTTP-headers protection
app.use(helmet())

// 3) Rate-limit (простой DDoS-щит)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 минут
  max: 100,               // не больше 100 запросов с одного IP за window
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: true,
    xForwardedForHeader: false,
  },
}))

// HTML-таблица с деплойами и авто-обновлением
app.get('/deployments', (req, res) => {
  // 1) Генерим случайный nonce
  const nonce = randomBytes(16).toString('base64')

  // 2) Вешаем CSP, разрешая только наш inline-скрипт с этим nonce
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'`
  )

  // 3) Собираем таблицу
  const rows = deployments.findAll().map(d => `
    <tr>
      <td>${d.number}</td>
      <td>${d.commit}</td>
      <td>${d.commit_hash}</td>
      <td>${d.branch}</td>
      <td>${d.script}</td>
      <td>${d.status}</td>
      <td>${d.created_at}</td>
      <td>${d.environment || ''}</td>
      <td>${d.execution_time || ''}</td>
      <td>${d.namespace || ''}</td>
      <td>${d.end_at || ''}</td>
    </tr>
  `).join('')

  // 4) Возвращаем HTML, вставляя nonce в <script>
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Deployments</title>
  <style>
    body{font-family:sans-serif;padding:20px}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #ccc;padding:8px;text-align:left}
    th{background:#f0f0f0}
    tr:nth-child(even){background:#fafafa}
    tr:hover{background:#f5f5f5}
  </style>
</head>
<body>
  <h1>История деплоев</h1>
  <table id="tbl">
    <thead>
      <tr>
        <th>#</th><th>Commit</th><th>Hash</th><th>Branch</th>
        <th>Script</th><th>Status</th><th>Created At</th>
        <th>Env</th><th>Exec Time</th><th>Namespace</th><th>End At</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <script nonce="${nonce}">
    async function load() {
      const res = await fetch('/deployments')
      const data = await res.json()
      const body = document.querySelector('#tbl tbody')
      body.innerHTML = data.map(d => \`
        <tr>
          <td>\${d.number}</td>
          <td>\${d.commit}</td>
          <td>\${d.commit_hash}</td>
          <td>\${d.branch}</td>
          <td>\${d.script}</td>
          <td>\${d.status}</td>
          <td>\${d.created_at}</td>
          <td>\${d.environment||''}</td>
          <td>\${d.execution_time||''}</td>
          <td>\${d.namespace||''}</td>
          <td>\${d.end_at||''}</td>
        </tr>\`
      ).join('')
    }
    load()
    setInterval(load, 5000)
  </script>
</body>
</html>`)
})

app.post(
  '/webhooks',
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

app.use(express.json())

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`)
})
