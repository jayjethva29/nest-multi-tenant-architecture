import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, RequiredPermission } from '../decorators/permissions.decorator';
import { PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from '../../modules/permissions/entities';
import { User } from '../../modules/users/entities/user.entity';
import { TenantConnectionManager } from '../../core/connection/tenant-connection.manager';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantConnectionManager: TenantConnectionManager,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('PermissionsGuard: Checking permissions for the request');
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No specific permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('PermissionsGuard: User info from request:', user);

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has required permissions
    const hasPermission = await this.checkUserPermissions(
      user.tenantId,
      user.id,
      requiredPermissions,
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions to access this resource');
    }

    return true;
  }

  private async checkUserPermissions(
    tenantId: string,
    userId: string,
    requiredPermissions: RequiredPermission[],
  ): Promise<boolean> {
    try {
      // First, verify the user still exists and is active
      const userRepository = await this.tenantConnectionManager.getTenantRepository(tenantId, User);

      const user = await userRepository.findOne({
        where: { id: userId, active: true },
      });

      if (!user) {
        console.error(`User ${userId} not found or inactive in tenant ${tenantId}`);
        return false;
      }

      // Get user's permissions through their roles
      const userRoleRepository = await this.tenantConnectionManager.getTenantRepository(
        tenantId,
        UserRole,
      );

      const userRoles = await userRoleRepository.find({
        where: { userId },
        relations: ['role', 'role.permissions'],
      });

      const userPermissions = new Set<string>();

      userRoles.forEach((userRole) => {
        userRole.role.permissions.forEach((permission) => {
          userPermissions.add(`${permission.resource}:${permission.action}`);
        });
      });

      // Check if user has all required permissions
      return requiredPermissions.every((required) =>
        userPermissions.has(`${required.resource}:${required.action}`),
      );
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return false;
    }
  }
}
