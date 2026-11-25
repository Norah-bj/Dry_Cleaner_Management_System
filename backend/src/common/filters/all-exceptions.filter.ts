import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';

/**
 * The one place error responses are produced (docs/architecture/API.md
 * "Error shape"): { statusCode, error, message, path, timestamp }.
 *
 * Unexpected errors are logged in full on the server but the client only
 * gets "Internal server error" - no stack traces, SQL or table names leak.
 * Database constraint violations that slipped past service-level checks
 * become 409/400 instead of 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ??
            exception.message);
    } else if (exception instanceof QueryFailedError) {
      const code = (exception.driverError as { code?: string }).code;
      if (code === PG_UNIQUE_VIOLATION) {
        status = HttpStatus.CONFLICT;
        message = 'That record already exists';
      } else if (code === PG_FOREIGN_KEY_VIOLATION) {
        status = HttpStatus.CONFLICT;
        message =
          'That record is still in use, or refers to something that does not exist';
      } else if (code === PG_CHECK_VIOLATION) {
        status = HttpStatus.BAD_REQUEST;
        message = 'That change is not allowed (it would break a data rule)';
      }
    }

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.originalUrl} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({
      statusCode: status,
      error: (HttpStatus[status] ?? 'Error')
        .toString()
        .toLowerCase()
        .replace(
          /(^|_)(\w)/g,
          (_m, sep: string, c: string) => (sep ? ' ' : '') + c.toUpperCase(),
        ),
      message,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
