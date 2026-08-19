// api/graphql.ts — Vercel serverless handler for the NestJS GraphQL API.
// Exposed by Vercel at /api/graphql (see vercel.json in Spec C-1).
import { NestFactory } from '@nestjs/core'
import { ExpressAdapter } from '@nestjs/platform-express'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from '../apps/api/dist/app.module'
import express from 'express'

// Reuse the Express instance and the bootstrapped Nest app across invocations
// to minimize cold-start cost on subsequent requests.
const expressApp = express()
let cachedApp: ReturnType<typeof NestFactory.create> | undefined

export default async function handler(req: any, res: any): Promise<void> {
  if (!cachedApp) {
    const adapter = new ExpressAdapter(expressApp)
    const app = await NestFactory.create(AppModule, adapter, {
      // Avoid binding to a port; Vercel invokes us per-request.
      logger: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['log', 'error', 'warn'],
    })

    const corsOrigin = (process.env.CORS_ORIGIN || '*')
      .split(',')
      .map((o: string) => o.trim())
      .filter(Boolean)

    app.enableCors({ origin: corsOrigin, credentials: true })

    app.useGlobalPipes(
      new ValidationPipe({ whitelist: false, transform: true }),
    )

    await app.init()
    cachedApp = app as any
  }

  // Vercel serves this function at /api/graphql, but the GraphQL module is
  // mounted at /graphql inside the Express app. Strip the /api prefix so the
  // Apollo middleware matches the incoming request path.
  if (typeof req.url === 'string' && req.url.startsWith('/api')) {
    req.url = req.url.slice(4) || '/'
  }

  // Delegate the request to the underlying Express/Nest server.
  expressApp(req, res)
}
