import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationResponseDto } from '../../common/dto';
import { User } from './entities/user.entity';

@ApiTags('Users V2')
@Controller('users-v2')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  create(@CurrentUser() user: any, @Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.createUser(user.tenantId, createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination, search, and filtering' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: PaginationResponseDto<User>,
  })
  findAll(
    @CurrentUser() user: any,
    @Query() query: UserQueryDto,
  ): Promise<PaginationResponseDto<User>> {
    return this.usersService.findAll(user.tenantId, query);
  }

  @Get('role/:role')
  @ApiOperation({ summary: 'Get users by role with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Users by role retrieved successfully',
    type: PaginationResponseDto<User>,
  })
  findByRole(
    @CurrentUser() user: any,
    @Param('role') role: string,
    @Query() query: Partial<UserQueryDto>,
  ): Promise<PaginationResponseDto<User>> {
    return this.usersService.findByRole(user.tenantId, role, query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active users with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Active users retrieved successfully',
    type: PaginationResponseDto<User>,
  })
  findActiveUsers(
    @CurrentUser() user: any,
    @Query() query: Partial<UserQueryDto>,
  ): Promise<PaginationResponseDto<User>> {
    return this.usersService.findActiveUsers(user.tenantId, query);
  }

  @Get('domain/:domain')
  @ApiOperation({ summary: 'Get users by email domain with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Users by email domain retrieved successfully',
    type: PaginationResponseDto<User>,
  })
  findByEmailDomain(
    @CurrentUser() user: any,
    @Param('domain') domain: string,
    @Query() query: Partial<UserQueryDto>,
  ): Promise<PaginationResponseDto<User>> {
    return this.usersService.findByEmailDomain(user.tenantId, domain, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics for the tenant' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  getUserStats(@CurrentUser() user: any): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  }> {
    return this.usersService.getUserStats(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  findOne(@CurrentUser() user: any, @Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(user.tenantId, id);
  }
}
