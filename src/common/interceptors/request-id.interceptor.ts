import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Generate or extract request ID
    const requestId = request.headers['x-request-id'] || uuidv4();

    // Attach request ID to request object
    request.requestId = requestId;

    // Set response header
    const response = context.switchToHttp().getResponse();
    response.setHeader('x-request-id', requestId);

    return next.handle();
  }
}
