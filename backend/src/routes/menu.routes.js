import { Router } from 'express'
import { listMenu } from '../controllers/menu.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get('/', asyncHandler(listMenu))

export default router
