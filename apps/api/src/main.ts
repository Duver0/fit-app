import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
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

  // Serve uploaded files statically
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' })

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
