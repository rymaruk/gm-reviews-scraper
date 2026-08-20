import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app } from './app.ts'

const port = Number(process.env.PORT ?? 8787)
const rootDir = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(rootDir, '../dist')

if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const express = await import('express')
  app.use(express.default.static(distDir))
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`Reviews API listening on http://127.0.0.1:${port}`)
})
