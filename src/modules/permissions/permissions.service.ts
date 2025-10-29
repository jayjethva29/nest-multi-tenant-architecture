import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Permission, Role, UserRole } from './entities';
import { CreateRoleDto, CreatePermissionDto, AssignRoleDto, UpdateRoleDto } from './dto';
import { User } from '../users/entities/user.entity';
import { TenantConnectionManager } from '../../core/connection/tenant-connection.manager';

@Injectable()
export class PermissionsService {
  constructor(private readonly tenantConnectionManager: TenantConnectionManager) {}

  // Permission management
  async createPermission(
    tenantId: string,
    createPermissionDto: CreatePermissionDto,
  ): Promise<Permission> {
    const { name, resource, action, description } = createPermissionDto;

    const permissionRepository = await this.tenantConnectionManager.getTenantRepository(
      tenantId,
      Permission,
    );

    const existingPermission = await permissionRepository.findOne({
      where: { name },
    });

    if (existingPermission) {
      throw new BadRequestException(`Permission with name "${name}" already exists`);
    }

    const permission = permissionRepository.create({
      name,
      resource,
      action,
      description,
    });

    return await permissionRepository.save(permission);
  }

  async findAllPermissions(tenantId: string): Promise<Permission[]> {
    const permissionRepository = await this.tenantConnectionManager.getTenantRepository(
      tenantId,
      Permission,
    );
    return await permissionRepository.find({
      order: { resource: 'ASC', action: 'ASC' },
    });
  }

  async findPermissionById(tenantId: string, id: string): Promise<Permission> {
    const permissionRepository = await this.tenantConnectionManager.getTenantRepository(
      tenantId,
      Permission,
    );
    const permission = await permissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID "${id}" not found`);
    }

    return permission;
  }

  async deletePermission(tenantId: string, id: string): Promise<void> {
    const permissionRepository = await this.tenantConnectionManager.getTenantRepository(
      tenantId,
      Permission,
    );
    const result = await permissionRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Permission with ID "${id}" not found`);
    }
  }

  // Role management
  async createRole(tenantId: string, createRoleDto: CreateRoleDto): Promise<Role> {
    const { name, description, isDefault, permissionIds } = createRoleDto;

    const roleRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, Role);
    const permissionRepository = await this.tenantConnectionManager.getTenantRepository(
      tenantId,
      Permission,
    );

    const existingRole = await roleRepository.findOne({
      where: { name },
    });

    if (existingRole) {
      throw new BadRequestException(`Role with name "${name}" already exists`);
    }

    const role = roleRepository.create({
      name,
      description,
      isDefault: isDefault || false,
    });

    if (permissionIds && permissionIds.length > 0) {
      const permissions = await permissionRepository.findByIds(permissionIds);
      if (permissions.length !== permissionIds.length) {
        throw new BadRequestException('One or more permission IDs are invalid');
      }
      role.permissions = permissions;
    }

    return await roleRepository.save(role);
  }

  async findAllRoles(tenantId: string): Promise<Role[]> {
    const roleRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, Role);
    return await roleRepository.find({
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
  }

  async findRoleById(tenantId: string, id: string): Promise<Role> {
    const roleRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, Role);
    const role = await roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    return role;
  }

  async updateRole(tenantId: string, id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findRoleById(tenantId, id);
    const permissionRepository = await this.tenantConnectionManager.getTenantRepository(
      tenantId,
      Permission,
    );
    const roleRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, Role);

    const { permissionIds, ...updateData } = updateRoleDto;

    Object.assign(role, updateData);

    if (permissionIds !== undefined) {
      if (permissionIds.length > 0) {
        const permissions = await permissionRepository.findByIds(permissionIds);
        if (permissions.length !== permissionIds.length) {
          throw new BadRequestException('One or more permission IDs are invalid');
        }
        role.permissions = permissions;
      } else {
        role.permissions = [];
      }
    }

    return await roleRepository.save(role);
  }

  async deleteRole(tenantId: string, id: string): Promise<void> {
    const role = await this.findRoleById(tenantId, id);
    const userRoleRepository = await this.tenantConnectionManager.getTenantRepository(
      tenantId,
      UserRole,
    );
    const roleRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, Role);

    // Check if role is assigned to any users
    const userRoleCount = await userRoleRepository.count({
      where: { roleId: id },
    });

    if (userRoleCount > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.name}" as it is assigned to ${userRoleCount} user(s)`,
      );
    }

    await roleRepository.remove(role);
  }

  // User role assignment
  async assignRoleToUser(tenantId: string, assignRoleDto: AssignRoleDto): Promise<UserRole> {
    const { userId, roleId } = assignRoleDto;

    const userRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, User);
    const roleRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, Role);
    const userRoleRepository = await this.tenantConnectionManager.getTenantRepository(
      tenantId,
      UserRole,
    );

    // Verify user exists
    const user = await userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    // Verify role exists
    const role = await roleRepository.findOne({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }

    // Check if assignment already exists
    const existingAssignment = await userRoleRepository.findOne({
      where: { userId, roleId },
    });

    if (existingAssignment) {
      throw new BadRequestException(`User already has this role assigned`);
    }

    const userRole = userRoleRepository.create({
      userId,
      roleId,
    });

    return await userRoleRepository.save(userRole);
  }

  async removeRoleFromUser(tenantId: string, userId: string, roleId: string): Promise<void> {
    const userRoleRepository = await this.tenantConnectionManager.getTenantRepository(
      tenantId,
      UserRole,
    );
    const userRole = await userRoleRepository.findOne({
      where: { userId, roleId },
    });

    if (!userRole) {
      throw new NotFoundException(`Role assignment not found`);
    }

    await userRoleRepository.remove(userRole);
  }

  async getUserRoles(tenantId: string, userId: string): Promise<Role[]> {
    const userRoleRepository = await this.tenantConnectionManager.getTenantRepository(
      tenantId,
      UserRole,
    );
    const userRoles = await userRoleRepository.find({
      where: { userId },
      relations: ['role', 'role.permissions'],
    });

    return userRoles.map((userRole) => userRole.role);
  }

  async getUserPermissions(tenantId: string, userId: string): Promise<Permission[]> {
    const roles = await this.getUserRoles(tenantId, userId);
    const permissions = new Map<string, Permission>();

    roles.forEach((role) => {
      role.permissions.forEach((permission) => {
        permissions.set(permission.id, permission);
      });
    });

    return Array.from(permissions.values());
  }

  async hasPermission(
    tenantId: string,
    userId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(tenantId, userId);

    return permissions.some(
      (permission) => permission.resource === resource && permission.action === action,
    );
  }

  async getRoleUsers(tenantId: string, roleId: string): Promise<User[]> {
    const userRoleRepository = await this.tenantConnectionManager.getTenantRepository(
      tenantId,
      UserRole,
    );
    const userRoles = await userRoleRepository.find({
      where: { roleId },
      relations: ['user'],
    });

    return userRoles.map((userRole) => userRole.user);
  }

  // Initialize default permissions for a new tenant
  async initializeDefaultPermissions(tenantId: string): Promise<void> {
    const permissionRepository = await this.tenantConnectionManager.getTenantRepository(
      tenantId,
      Permission,
    );
    const roleRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, Role);

    const defaultPermissions = [
      // User permissions
      {
        name: 'users:create',
        resource: 'users',
        action: 'create',
        description: 'Create new users',
      },
      { name: 'users:read', resource: 'users', action: 'read', description: 'View users' },
      { name: 'users:update', resource: 'users', action: 'update', description: 'Update users' },
      { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },

      // Product permissions
      {
        name: 'products:create',
        resource: 'products',
        action: 'create',
        description: 'Create new products',
      },
      { name: 'products:read', resource: 'products', action: 'read', description: 'View products' },
      {
        name: 'products:update',
        resource: 'products',
        action: 'update',
        description: 'Update products',
      },
      {
        name: 'products:delete',
        resource: 'products',
        action: 'delete',
        description: 'Delete products',
      },

      // Role permissions
      {
        name: 'roles:create',
        resource: 'roles',
        action: 'create',
        description: 'Create new roles',
      },
      { name: 'roles:read', resource: 'roles', action: 'read', description: 'View roles' },
      { name: 'roles:update', resource: 'roles', action: 'update', description: 'Update roles' },
      { name: 'roles:delete', resource: 'roles', action: 'delete', description: 'Delete roles' },
      {
        name: 'roles:assign',
        resource: 'roles',
        action: 'assign',
        description: 'Assign roles to users',
      },
    ];

    for (const permData of defaultPermissions) {
      const existingPermission = await permissionRepository.findOne({
        where: { name: permData.name },
      });

      if (!existingPermission) {
        const permission = permissionRepository.create(permData);
        await permissionRepository.save(permission);
      }
    }

    // Create default roles
    await this.createDefaultRoles(tenantId);
  }

  private async createDefaultRoles(tenantId: string): Promise<void> {
    const permissionRepository = await this.tenantConnectionManager.getTenantRepository(
      tenantId,
      Permission,
    );
    const roleRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, Role);

    const allPermissions = await permissionRepository.find();

    // Admin role - all permissions
    const adminRole = await roleRepository.findOne({
      where: { name: 'admin' },
    });

    if (!adminRole) {
      const admin = roleRepository.create({
        name: 'admin',
        description: 'Administrator with full access',
        isDefault: false,
        permissions: allPermissions,
      });
      await roleRepository.save(admin);
    }

    // User role - basic permissions
    const userRole = await roleRepository.findOne({
      where: { name: 'user' },
    });

    if (!userRole) {
      const userPermissions = allPermissions.filter(
        (p) =>
          (p.resource === 'products' && p.action === 'read') ||
          (p.resource === 'users' && p.action === 'read'),
      );

      const user = roleRepository.create({
        name: 'user',
        description: 'Basic user with read-only access',
        isDefault: true,
        permissions: userPermissions,
      });
      await roleRepository.save(user);
    }

    // Manager role - moderate permissions
    const managerRole = await roleRepository.findOne({
      where: { name: 'manager' },
    });

    if (!managerRole) {
      const managerPermissions = allPermissions.filter(
        (p) => p.resource !== 'roles' || p.action === 'read',
      );

      const manager = roleRepository.create({
        name: 'manager',
        description: 'Manager with product and user management',
        isDefault: false,
        permissions: managerPermissions,
      });
      await roleRepository.save(manager);
    }
  }
}
