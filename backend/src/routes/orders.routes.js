import { Router } from 'express'
import { createOrder, getOrder } from '../controllers/orders.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.post('/', asyncHandler(createOrder))
router.get('/:id', asyncHandler(getOrder))

export default router
