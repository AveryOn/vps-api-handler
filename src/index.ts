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
  max: 10000,               // не больше 100 запросов с одного IP за window
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: true,
    xForwardedForHeader: false,
  },
}))

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


/**
 * GET ALL Deployments
 */
app.get('/deployments', (req, res) => {
  const commit_hash = req.query['commit_hash']
  if(commit_hash) {
    res.json(deployments.findByHash(commit_hash as string))
    return
  }
  res.json(deployments.findAll())
})

/**
 * CREATE Deployment
 */
app.post('/deployments', (req, res) => {
  const body = req.body
  if(!body) {
    res.status(400).send('invalid input')
    return
  }
  try {
    const newDeployment = deployments.create(body)
    res.send(newDeployment)

  } catch (err) {
    res.status(500).send('Не удалось создать запись для deploy')
  }
})


/**
 * UPDATE Deployment
*/
app.patch('/deployments/update/:id', (req, res) => {
  const body = req.body
  const id = req.params['id']
  if(!id || !body) {
    res.status(400).send('invalid input data')
    return
  }
  try {
    deployments.update(id, body)
    res.send(true)

  } catch (err) {
    res.status(500).send('Не удалось создать запись для deploy')
  }
})


// HTML-таблица с деплойами и авто-обновлением
app.get('/deployments/history', (req, res) => {
  // 1) Сгенерировать nonce
  const nonce = randomBytes(16).toString('base64')

  // 2) Выдать CSP, разрешив наш inline-скрипт и inline-стили с этим nonce
  res.setHeader(
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'nonce-${nonce}'`
    ].join('; ')
  )

  // 3) Построить строки таблицы
  const rows = deployments.findAll().map(d => `
    <tr>
      <td>${d.number}</td>
      <td>${d.commit_name}</td>
      <td>${d.commit_hash}</td>
      <td>${d.branch}</td>
      <td>${d.script}</td>
      <td>${d.status}</td>
      <td>${d.created_at}</td>
      <td>${d.repo||'-'}</td>
      <td>${d.environment||'-'}</td>
      <td>${d.execution_time||'-'}</td>
      <td>${d.namespace||'-'}</td>
      <td>${d.end_at||'-'}</td>
    </tr>
  `).join('')

  const html = initTabelClient(rows, nonce, '/deployments')
  // 4) Отдать HTML, вставив nonce в оба тега
  res.send(html)
})

// HTML-таблица с выбраннм по hash деплоями
app.get('/deployments/history/:commit_hash', (req, res) => {
  const commit_hash = req.params['commit_hash']
  if(!commit_hash) {
    res.status(400).send('invalid input data')
    return
  }

  // 1) Сгенерировать nonce
  const nonce = randomBytes(16).toString('base64')

  // 2) Выдать CSP, разрешив наш inline-скрипт и inline-стили с этим nonce
  res.setHeader(
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'nonce-${nonce}'`
    ].join('; ')
  )

  // 3) Построить строки таблицы
  const rows = deployments.findByHash(commit_hash).map(d => `
    <tr>
      <td>${d.number}</td>
      <td>${d.commit_name}</td>
      <td>${d.commit_hash}</td>
      <td>${d.branch}</td>
      <td>${d.script}</td>
      <td>${d.status}</td>
      <td>${d.created_at}</td>
      <td>${d.repo||'-'}</td>
      <td>${d.environment||'-'}</td>
      <td>${d.execution_time||'-'}</td>
      <td>${d.namespace||'-'}</td>
      <td>${d.end_at||'-'}</td>
    </tr>
  `).join('')

  const html = initTabelClient(rows, nonce, `/deployments?commit_hash=${commit_hash}`)
  // 4) Отдать HTML, вставив nonce в оба тега
  res.send(html)
})


app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`)
})
