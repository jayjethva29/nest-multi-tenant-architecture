import { ApiProperty } from '@nestjs/swagger';

export class TenantResponseDto {
  @ApiProperty({ description: 'Tenant ID (UUID)' })
  id: string;

  @ApiProperty({ description: 'Tenant display name' })
  name: string;

  @ApiProperty({ description: 'Tenant status' })
  active: boolean;

  @ApiProperty({ description: 'Tenant creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Admin user JWT token', required: false })
  adminToken?: string;

  @ApiProperty({ description: 'Database provisioning status' })
  status: 'provisioned' | 'failed' | 'pending';
}
