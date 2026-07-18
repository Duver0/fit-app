import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
import * as fs from 'node:fs'
import * as express from 'express'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : '*'

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  })

  // Ensure upload directory exists at startup
  const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
  fs.mkdirSync(uploadDir, { recursive: true })

  // Serve uploaded files statically with cross-origin headers
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads',
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    },
  })

  // Increase body parser limits for file uploads via GraphQL
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ limit: '10mb', extended: true }))

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
    }),
  )

  const port = process.env.PORT || 4000
  await app.listen(port)
  console.log(`API running on http://localhost:${port}`)
}
bootstrap()
