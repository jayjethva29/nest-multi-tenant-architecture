import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface Response<T> {
  data: T
}

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<Response<T>> | any {
    const excludeFromTransformation =
      this.reflector.get<boolean>(
        'excludeFromTransformation',
        context.getHandler()
      ) || false

    if (excludeFromTransformation) {
      return next.handle()
    }

    const message =
      this.reflector.get<string>('responseMessage', context.getHandler()) || ''

    return next.handle().pipe(
      map((data) => ({
        statusCode: context.switchToHttp().getResponse().statusCode,
        message: message,
        data
      }))
    )
  }
}
