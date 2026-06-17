/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
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

// CORS 配置 - 使用白名单而非全开放
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:3001']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 速率限制：认证端点（登录、注册、重置密码）- 15 分钟内最多 5 次
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: '请求过于频繁，请15分钟后重试' },
  standardHeaders: true,
  legacyHeaders: false,
})

// 速率限制：验证码发送 - 每分钟最多 3 次
const verificationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { success: false, error: '发送过于频繁，请稍后重试' },
  standardHeaders: true,
  legacyHeaders: false,
})

// 静态文件服务：头像
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

/**
 * API Routes
 */
// 仅在生产环境应用速率限制，开发环境允许无限次登录尝试
if (process.env.NODE_ENV === 'production') {
  app.use('/api/auth/login', authLimiter)
  app.use('/api/auth/register', authLimiter)
  app.use('/api/auth/reset-password', authLimiter)
  app.use('/api/verification/send', verificationLimiter)
}

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
