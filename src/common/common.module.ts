import { Module, Global } from '@nestjs/common';
import { QueryBuilderService } from './helpers/pagination';

@Global()
@Module({
  providers: [QueryBuilderService],
  exports: [QueryBuilderService],
})
export class CommonModule {}
