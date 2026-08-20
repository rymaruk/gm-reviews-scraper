import cors from 'cors'
import express from 'express'
import {
  handleDeleteCampaign,
  handleHealth,
  handlePatchCampaign,
  handleResolvePlace,
  handleReviews,
  handleStore,
} from './handlers.ts'

export const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

const router = express.Router()

router.get('/health', (_req, res) => {
  const result = handleHealth()
  res.status(result.status).json(result.body)
})

router.get('/store', async (_req, res) => {
  const result = await handleStore()
  res.status(result.status).json(result.body)
})

router.delete('/campaigns/:id', async (req, res) => {
  const result = await handleDeleteCampaign(String(req.params.id))
  res.status(result.status).json(result.body)
})

router.patch('/campaigns/:id', async (req, res) => {
  const result = await handlePatchCampaign(String(req.params.id), req.body)
  res.status(result.status).json(result.body)
})

router.post('/places/resolve', async (req, res) => {
  const result = await handleResolvePlace(req.body)
  res.status(result.status).json(result.body)
})

router.post('/reviews', async (req, res) => {
  const result = await handleReviews(req.body)
  res.status(result.status).json(result.body)
})

app.use('/api', router)
app.use('/', router)
