import { Router } from 'express';
// DataBase
import { runMigrations } from '../db/migrator'
import { DeploymentStore, DB_NAME } from '../db/store'
import { initTabelClient } from '../statics/deployment-table'
import { randomBytes } from 'crypto'

const router = Router();

/* 
  INIT DataBase
*/
const deployments = new DeploymentStore()
runMigrations(DB_NAME)

/**
 * GET ALL Deployments
 */
router.get('/', (req, res) => {
    const commit_hash = req.query['commit_hash']
    if (commit_hash) {
        res.json(deployments.findByHash(commit_hash as string))
        return
    }
    res.json(deployments.findAll())
})

/**
 * CREATE Deployment
 */
router.post('/', (req, res) => {
    const body = req.body
    if (!body) {
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
router.patch('/update/:id', (req, res) => {
    const body = req.body
    const id = req.params['id']
    if (!id || !body) {
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
router.get('/history', (req, res) => {
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

    const LIMIT = 15
    const PAGE = 1
    const q = new URLSearchParams(req.url.split('?')[1] || '');
    const limit = Math.max(1, parseInt(req.query.limit as string || `${LIMIT}`, 10) || LIMIT);
    const page  = Math.max(1, parseInt(req.query.page as string  || `${PAGE}`,  10) || PAGE);
    const offset = (page - 1) * limit;

    console.debug('[GET: /deployments/history] => paginate-info', { limit, page, offset, })

    // 3) Построить строки таблицы
    const rows = deployments.findAll({ limit, offset }).map(d => `
      <tr>
        <td>${d.number}</td>
        <td>${d.commit_name}</td>
        <td>${d.commit_hash}</td>
        <td>${d.branch}</td>
        <td>${d.script}</td>
        <td>${d.status}</td>
        <td>${d.created_at}</td>
        <td>${d.side || '-'}</td>
        <td>${d.environment || '-'}</td>
        <td>${d.execution_time || '-'}</td>
        <td>${d.namespace || '-'}</td>
        <td>${d.end_at || '-'}</td>
      </tr>
    `).join('')

    console.debug('[GET: /deployments/history] => ROWS LENGTH', rows.length)

    const html = initTabelClient(rows, nonce, '/deployments')
    // 4) Отдать HTML, вставив nonce в оба тега
    res.send(html)
})

// HTML-таблица с выбраннм по hash деплоями
router.get('/history/:commit_hash', (req, res) => {
    const commit_hash = req.params['commit_hash']
    if (!commit_hash) {
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
        <td>${d.side || '-'}</td>
        <td>${d.environment || '-'}</td>
        <td>${d.execution_time || '-'}</td>
        <td>${d.namespace || '-'}</td>
        <td>${d.end_at || '-'}</td>
      </tr>
    `).join('')

    const html = initTabelClient(rows, nonce, `/deployments?commit_hash=${commit_hash}`)
    // 4) Отдать HTML, вставив nonce в оба тега
    res.send(html)
})

export default {
    path: '/deployments',
    router,
} as const;