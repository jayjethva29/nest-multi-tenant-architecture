import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const user = request.user as JwtPayload;

    const { method, url, requestId, tenantId } = request;
    const userAgent = request.get('User-Agent') || '';
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(`Incoming Request: ${method} ${url}`, {
      requestId,
      tenantId: tenantId || user?.tenantId,
      userId: user?.sub,
      method,
      url,
      userAgent,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = response;
          const contentLength = response.get('content-length') || '0';
          const responseTime = Date.now() - startTime;

          // Log successful response
          this.logger.log(
            `Response: ${method} ${url} ${statusCode} ${contentLength}b ${responseTime}ms`,
            {
              requestId,
              tenantId: tenantId || user?.tenantId,
              userId: user?.sub,
              method,
              url,
              statusCode,
              contentLength,
              responseTime,
            },
          );
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;

          // Log error response
          this.logger.error(
            `Error Response: ${method} ${url} ${error.status || 500} ${responseTime}ms`,
            {
              requestId,
              tenantId: tenantId || user?.tenantId,
              userId: user?.sub,
              method,
              url,
              statusCode: error.status || 500,
              responseTime,
              error: error.message,
              stack: error.stack,
            },
          );
        },
      }),
    );
  }
}
