import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import { MulterError } from 'multer'

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let message = 'Error al subir el archivo'

    switch (exception.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'El archivo es demasiado grande. El tamaño máximo permitido es 20 MB.'
        break
      case 'LIMIT_FILE_COUNT':
        message = 'Demasiados archivos.'
        break
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Tipo de archivo inesperado.'
        break
      case 'LIMIT_FIELD_KEY':
        message = 'Nombre de campo demasiado largo.'
        break
      case 'LIMIT_PART_COUNT':
        message = 'Demasiadas partes en la solicitud.'
        break
    }

    response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message,
      error: 'Payload Too Large',
    })
  }
}
