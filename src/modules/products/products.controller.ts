import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query-v2.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationResponseDto } from '../../common/dto';
import { Product } from './entities/product.entity';

@ApiTags('Products V2')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  create(@CurrentUser() user: any, @Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(user.tenantId, createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with pagination, search, and filtering' })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: PaginationResponseDto<Product>,
  })
  findAll(
    @CurrentUser() user: any,
    @Query() query: ProductQueryDto,
  ): Promise<PaginationResponseDto<Product>> {
    return this.productsService.findAll(user.tenantId, query);
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get products by category with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Products by category retrieved successfully',
    type: PaginationResponseDto<Product>,
  })
  findByCategory(
    @CurrentUser() user: any,
    @Param('category') category: string,
    @Query() query: Partial<ProductQueryDto>,
  ): Promise<PaginationResponseDto<Product>> {
    return this.productsService.findByCategory(user.tenantId, category, query);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock products' })
  @ApiResponse({
    status: 200,
    description: 'Low stock products retrieved successfully',
    type: PaginationResponseDto<Product>,
  })
  findLowStockProducts(
    @CurrentUser() user: any,
    @Query('threshold') threshold?: number,
    @Query() query?: Partial<ProductQueryDto>,
  ): Promise<PaginationResponseDto<Product>> {
    return this.productsService.findLowStockProducts(user.tenantId, threshold || 10, query);
  }

  @Get('price-range')
  @ApiOperation({ summary: 'Get products in a specific price range' })
  @ApiResponse({
    status: 200,
    description: 'Products in price range retrieved successfully',
    type: PaginationResponseDto<Product>,
  })
  findInPriceRange(
    @CurrentUser() user: any,
    @Query('minPrice') minPrice: number,
    @Query('maxPrice') maxPrice: number,
    @Query() query: Partial<ProductQueryDto>,
  ): Promise<PaginationResponseDto<Product>> {
    return this.productsService.findInPriceRange(user.tenantId, minPrice, maxPrice, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  findOne(@CurrentUser() user: any, @Param('id') id: string): Promise<Product> {
    return this.productsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(user.tenantId, id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  remove(@CurrentUser() user: any, @Param('id') id: string): Promise<void> {
    return this.productsService.remove(user.tenantId, id);
  }
}
