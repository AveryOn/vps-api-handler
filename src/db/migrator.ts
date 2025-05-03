import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

export function runMigrations(
  dbFile: string = './deployments.sqlite',
  migrationsDir: string = path.resolve(__dirname, '../migrations')
) {
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
    const id = file
    const applied = db
      .prepare('SELECT 1 FROM migrations WHERE id = ?')
      .get(id)
    if (applied) continue

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    db.exec('BEGIN')
    db.exec(sql)
    db.prepare('INSERT INTO migrations (id, run_at) VALUES (?, ?)')
      .run(id, new Date().toISOString())
    db.exec('COMMIT')
    console.log(`✅ Applied migration: ${file}`)
  }
}
