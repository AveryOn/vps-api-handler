import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { __dirname } from '../const/global'

/**
 * Прогоняет все *.sql из папки migrations в корне проекта.
 */
export function runMigrations(
    dbFile: string = path.resolve(process.cwd(), 'deployments.sqlite'),
    migrationsDir: string = path.resolve(process.cwd(), 'migrations')
  ) {
    // если нет папки миграций — ничего не делаем
    if (!fs.existsSync(migrationsDir)) {
      console.warn(`⚠️ Migrations directory not found at ${migrationsDir}, skipping`)
      return
    }
  
    const db = new Database(dbFile)
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        run_at TEXT NOT NULL
      );
    `)
  
    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()
  
    for (const file of files) {
      const already = db
        .prepare('SELECT 1 FROM migrations WHERE id = ?')
        .get(file)
      if (already) continue
  
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
      db.exec('BEGIN')
      db.exec(sql)
      db.prepare('INSERT INTO migrations (id, run_at) VALUES (?, ?)')
        .run(file, new Date().toISOString())
      db.exec('COMMIT')
      console.log(`✅ Applied migration: ${file}`)
    }
  }
