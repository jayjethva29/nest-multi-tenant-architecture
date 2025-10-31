import { Module, forwardRef } from '@nestjs/common';
import { TenantConnectionModule } from '../../core/connection/tenant-connection.module';
import { AuthModule } from '../auth/auth.module';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TenantConnectionModule, forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
