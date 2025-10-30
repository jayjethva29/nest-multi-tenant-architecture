import { SetMetadata } from '@nestjs/common'

export const ResponseMessage = (message: string) =>
  SetMetadata('responseMessage', message)

export const ExcludeFromTransformation = () =>
  SetMetadata('excludeFromTransformation', true)
