import { Router } from 'express'
import { getOrders, createOrder, getOrder } from '../controllers/orders.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.get('/', getOrders)
router.post('/', asyncHandler(createOrder))
router.get('/:id', asyncHandler(getOrder))

export default router
