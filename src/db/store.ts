import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export interface Deployment {
    id: string
    number: number
    commit: string
    commit_hash: string
    branch: string
    script: string
    status: string          // pending | success | failed
    created_at: string      // ISO
    // опционально:
    environment?: string
    execution_time?: string // ISO
    namespace?: string
    end_at?: string         // ISO
}

export class DeploymentStore {
    private db: Database.Database

    constructor(dbFile: string = './deployments.sqlite') {
        this.db = new Database(dbFile)
        this.init()
    }

    private init() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS deployments (
                id TEXT PRIMARY KEY,
                number INTEGER NOT NULL,
                commit TEXT NOT NULL,
                commit_hash TEXT NOT NULL,
                branch TEXT NOT NULL,
                environment TEXT,
                script TEXT NOT NULL,
                execution_time TEXT,
                namespace TEXT,
                status TEXT NOT NULL,
                end_at TEXT,
                created_at TEXT NOT NULL
            );
        `
    )
    }

    /** Добавляет новый деплой и возвращает его */
    create(dep: Omit<Deployment, 'id' | 'created_at' | 'number'>): Deployment {
        // вычисляем next number
        const row = this.db
            .prepare('SELECT MAX(number) AS maxn FROM deployments')
            .get() as { maxn: number | null }
        const next = (row.maxn ?? 0) + 1

        const id = randomUUID()
        const now = new Date().toISOString()
        const stmt = this.db.prepare(`
            INSERT INTO deployments (
                id, number, commit, commit_hash, branch,
                environment, script, execution_time,
                namespace, status, end_at, created_at
            ) VALUES (
                @id, @number, @commit, @commit_hash, @branch,
                @environment, @script, @execution_time,
                @namespace, @status, @end_at, @created_at
            )
        `)
        stmt.run({
            id,
            number: next,
            commit: dep.commit,
            commit_hash: dep.commit_hash,
            branch: dep.branch,
            environment: dep.environment ?? null,
            script: dep.script,
            execution_time: dep.execution_time ?? null,
            namespace: dep.namespace ?? null,
            status: dep.status,
            end_at: dep.end_at ?? null,
            created_at: now,
        })

        return {
            id,
            number: next,
            created_at: now,
            ...dep,
        }
    }

    /** Возвращает все деплои (по number по возрастанию) */
    findAll(): Deployment[] {
        return this.db
            .prepare('SELECT * FROM deployments ORDER BY number')
            .all() as Deployment[]
    }

    /** Находит деплой по id */
    findById(id: string): Deployment | undefined {
        return this.db
            .prepare('SELECT * FROM deployments WHERE id = ?')
            .get(id) as Deployment | undefined
    }

    /** Обновляет статус и/или поля деплоя */
    update(id: string, patch: Partial<Omit<Deployment, 'id' | 'number' | 'created_at'>>) {
        const fields = Object.keys(patch)
        if (!fields.length) return
        const set = fields.map(f => `${f} = @${f}`).join(', ')
        const stmt = this.db.prepare(`
            UPDATE deployments SET ${set}
            WHERE id = @id
        `)
        stmt.run({ id, ...patch })
    }

    /** Удаляет деплой по id */
    delete(id: string) {
        this.db.prepare('DELETE FROM deployments WHERE id = ?').run(id)
    }
}
