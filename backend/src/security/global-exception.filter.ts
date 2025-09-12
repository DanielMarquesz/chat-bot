import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'object' && 'message' in exceptionResponse
        ? Array.isArray(exceptionResponse['message'])
          ? exceptionResponse['message'][0]
          : exceptionResponse['message']
        : exception.message;
    }

    this.logger.error({
      message: `Exception occurred during request processing: ${exception.message}`,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      stack: exception.stack,
    });

    response.status(status).json({
      statusCode: status,
      message: this.sanitizeErrorMessage(message, status),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private sanitizeErrorMessage(message: string, status: number): string {
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'An unexpected error occurred. Our team has been notified.';
    }

    if (message.includes('database') || 
        message.includes('sql') || 
        message.includes('query') ||
        message.includes('connection')) {
      return 'A data processing error occurred. Please try again later.';
    }

    if (message.includes('authentication') || 
        message.includes('password') || 
        message.includes('token') ||
        message.includes('login')) {
      return 'Authentication failed. Please check your credentials and try again.';
    }

    return message;
  }
}
