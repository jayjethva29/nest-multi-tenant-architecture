import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PermissionsService } from './permissions.service';
import {
  CreateRoleDto,
  CreatePermissionDto,
  AssignRoleDto,
  UpdateRoleDto,
  RoleResponseDto,
  PermissionResponseDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // Permission endpoints
  @Post('permissions')
  @RequirePermissions({ resource: 'roles', action: 'create' })
  async createPermission(
    @Body() createPermissionDto: CreatePermissionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PermissionResponseDto> {
    return await this.permissionsService.createPermission(user.tenantId, createPermissionDto);
  }

  @Get('permissions')
  @RequirePermissions({ resource: 'roles', action: 'read' })
  async getAllPermissions(@CurrentUser() user: JwtPayload): Promise<PermissionResponseDto[]> {
    return await this.permissionsService.findAllPermissions(user.tenantId);
  }

  @Get('permissions/:id')
  @RequirePermissions({ resource: 'roles', action: 'read' })
  async getPermissionById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PermissionResponseDto> {
    return await this.permissionsService.findPermissionById(user.tenantId, id);
  }

  @Delete('permissions/:id')
  @RequirePermissions({ resource: 'roles', action: 'delete' })
  async deletePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    await this.permissionsService.deletePermission(user.tenantId, id);
    return { message: 'Permission deleted successfully' };
  }

  // Role endpoints
  @Post('roles')
  @RequirePermissions({ resource: 'roles', action: 'create' })
  async createRole(
    @Body() createRoleDto: CreateRoleDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RoleResponseDto> {
    return await this.permissionsService.createRole(user.tenantId, createRoleDto);
  }

  @Get('roles')
  @RequirePermissions({ resource: 'roles', action: 'read' })
  async getAllRoles(@CurrentUser() user: JwtPayload): Promise<RoleResponseDto[]> {
    return await this.permissionsService.findAllRoles(user.tenantId);
  }

  @Get('roles/:id')
  @RequirePermissions({ resource: 'roles', action: 'read' })
  async getRoleById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<RoleResponseDto> {
    return await this.permissionsService.findRoleById(user.tenantId, id);
  }

  @Put('roles/:id')
  @RequirePermissions({ resource: 'roles', action: 'update' })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RoleResponseDto> {
    return await this.permissionsService.updateRole(user.tenantId, id, updateRoleDto);
  }

  @Delete('roles/:id')
  @RequirePermissions({ resource: 'roles', action: 'delete' })
  async deleteRole(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    await this.permissionsService.deleteRole(user.tenantId, id);
    return { message: 'Role deleted successfully' };
  }

  // User role assignment endpoints
  @Post('roles/assign')
  @RequirePermissions({ resource: 'roles', action: 'assign' })
  async assignRoleToUser(
    @Body() assignRoleDto: AssignRoleDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    await this.permissionsService.assignRoleToUser(user.tenantId, assignRoleDto);
    return { message: 'Role assigned successfully' };
  }

  @Delete('roles/:roleId/users/:userId')
  @RequirePermissions({ resource: 'roles', action: 'assign' })
  async removeRoleFromUser(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    await this.permissionsService.removeRoleFromUser(user.tenantId, userId, roleId);
    return { message: 'Role removed successfully' };
  }

  @Get('users/:userId/roles')
  @RequirePermissions({ resource: 'roles', action: 'read' })
  async getUserRoles(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<RoleResponseDto[]> {
    return await this.permissionsService.getUserRoles(user.tenantId, userId);
  }

  @Get('users/:userId/permissions')
  @RequirePermissions({ resource: 'roles', action: 'read' })
  async getUserPermissions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PermissionResponseDto[]> {
    return await this.permissionsService.getUserPermissions(user.tenantId, userId);
  }

  @Get('roles/:roleId/users')
  @RequirePermissions({ resource: 'roles', action: 'read' })
  async getRoleUsers(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.permissionsService.getRoleUsers(user.tenantId, roleId);
  }

  // Initialize default permissions (should be called during tenant setup)
  @Post('initialize')
  @RequirePermissions({ resource: 'roles', action: 'create' })
  async initializeDefaultPermissions(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    await this.permissionsService.initializeDefaultPermissions(user.tenantId);
    return { message: 'Default permissions and roles initialized successfully' };
  }
}
