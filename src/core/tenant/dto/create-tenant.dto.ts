import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  ValidateNested,
  IsEmail,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class DatabaseConfigDto {
  @ApiProperty({ description: 'Database host' })
  @IsString()
  @IsNotEmpty()
  host: string;

  @ApiProperty({ description: 'Database port', default: 5432 })
  @IsOptional()
  port?: number;

  @ApiProperty({ description: 'Database username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Database password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

class AdminUserDto {
  @ApiProperty({ description: 'Admin user email', example: 'admin@company.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Admin user password (min 6 characters)',
    example: 'securePassword123',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Admin user first name', example: 'Admin' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Admin user last name', example: 'User' })
  @IsString()
  @IsNotEmpty()
  lastName: string;
}

class PoolOptionsDto {
  @ApiPropertyOptional({ description: 'Maximum pool connections', default: 5 })
  @IsOptional()
  max?: number;

  @ApiPropertyOptional({ description: 'Minimum pool connections', default: 0 })
  @IsOptional()
  min?: number;

  @ApiPropertyOptional({ description: 'Connection acquire timeout in ms', default: 60000 })
  @IsOptional()
  acquireTimeout?: number;

  @ApiPropertyOptional({ description: 'Connection timeout in ms', default: 60000 })
  @IsOptional()
  timeout?: number;

  @ApiPropertyOptional({ description: 'Idle timeout in ms', default: 30000 })
  @IsOptional()
  idleTimeoutMillis?: number;
}

export class CreateTenantDto {
  @ApiProperty({ description: 'Tenant display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Database configuration', type: DatabaseConfigDto })
  @ValidateNested()
  @Type(() => DatabaseConfigDto)
  database: DatabaseConfigDto;

  @ApiPropertyOptional({ description: 'Connection pool options', type: PoolOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PoolOptionsDto)
  poolOptions?: PoolOptionsDto;

  @ApiPropertyOptional({ description: 'Admin user details for tenant setup', type: AdminUserDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminUserDto)
  adminUser?: AdminUserDto;
}
