import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import menuRoutes from './routes/menu.routes.js'
import orderRoutes from './routes/orders.routes.js'
import healthRoutes from './routes/health.routes.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    })
  )
  app.use(express.json())

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'))
  }

  app.use('/api/health', healthRoutes)
  app.use('/api/menu', menuRoutes)
  app.use('/api/orders', orderRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
