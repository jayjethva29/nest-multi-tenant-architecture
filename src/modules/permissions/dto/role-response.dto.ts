import { Permission } from '../entities/permission.entity';

export class RoleResponseDto {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}
