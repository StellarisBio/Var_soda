/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import variantRoutes from './routes/variants.js'
import userRoutes from './routes/users.js'
import dashboardRoutes from './routes/dashboard.js'
import verificationRoutes from './routes/verification.js'
import liftoverRoutes from './routes/liftover.js'
import autopvs1Routes from './routes/autopvs1.js'

// load env
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '..', 'uploads', 'avatars')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 静态文件服务：头像
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/variants', variantRoutes)
app.use('/api/users', userRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/verification', verificationRoutes)
app.use('/api/liftover', liftoverRoutes)
app.use('/api/autopvs1', autopvs1Routes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
