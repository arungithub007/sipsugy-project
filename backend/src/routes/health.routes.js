import { Router } from 'express'
import { checkDbConnection } from '../config/db.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await checkDbConnection()
    res.json({
      status: 'ok',
      service: 'sipsugy-backend',
      time: new Date().toISOString(),
      db,
    })
  })
)

export default router
