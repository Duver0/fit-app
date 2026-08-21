import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import { Prisma } from '@prisma/client'

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    // If it's already an HttpException (including our mapped ones), let Nest handle it
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const res = exception.getResponse()
      response.status(status).json(
        typeof res === 'string' ? { message: res } : res,
      )
      return
    }

    // Prisma known request errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2025': // Record not found
          response.status(HttpStatus.NOT_FOUND).json({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Record not found',
            error: 'Not Found',
          })
          return

        case 'P2003': // Foreign key constraint failed
          response.status(HttpStatus.CONFLICT).json({
            statusCode: HttpStatus.CONFLICT,
            message: 'Foreign key constraint failed — related record does not exist',
            error: 'Conflict',
          })
          return

        case 'P2002': // Unique constraint failed
          response.status(HttpStatus.CONFLICT).json({
            statusCode: HttpStatus.CONFLICT,
            message: 'A record with this value already exists',
            error: 'Conflict',
          })
          return

        default:
          // Other Prisma errors → 500
          response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Database operation failed',
            error: 'Internal Server Error',
          })
          return
      }
    }

    // Prisma client initialization / connection errors
    if (exception instanceof Prisma.PrismaClientInitializationError) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database connection failed',
        error: 'Internal Server Error',
      })
      return
    }

    // Fallback — unexpected error
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    })
  }
}
