import { IsString, IsNotEmpty, IsOptional, IsObject, ValidateNested } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Admin user details for tenant setup' })
  @IsOptional()
  @IsObject()
  adminUser?: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };
}
