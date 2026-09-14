import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus, ServiceTier } from '../entities/order.entity';
import { MaterialType } from '../entities/order-material.entity';

export class CreateOrderItemDto {
  @ApiProperty({ example: 'Men Suit 2pc' })
  @IsString()
  @IsNotEmpty()
  garmentName: string;

  @ApiPropertyOptional({ example: 'Suits & Blazers' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ enum: ServiceTier, default: ServiceTier.STANDARD })
  @IsEnum(ServiceTier)
  @IsOptional()
  serviceTier?: ServiceTier;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateOrderMaterialDto {
  @ApiProperty({ enum: MaterialType, example: MaterialType.HANGER })
  @IsEnum(MaterialType)
  materialType: MaterialType;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  customerProvided?: boolean;

  @ApiProperty({ example: 300 })
  @IsNumber()
  @Min(0)
  unitCharge: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Customer UUID' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ enum: ServiceTier, default: ServiceTier.STANDARD })
  @IsEnum(ServiceTier)
  @IsOptional()
  serviceTier?: ServiceTier;

  @ApiPropertyOptional({ enum: OrderStatus, default: OrderStatus.RECEIVED })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ example: 'H-042' })
  @IsString()
  @IsOptional()
  storageHangerId?: string;

  @ApiPropertyOptional({ example: 'B-015' })
  @IsString()
  @IsOptional()
  storageBoxId?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ example: '2026-09-16T17:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  expectedCompletion?: string;

  @ApiPropertyOptional({ example: 'Handle silk jacket with care' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ type: [CreateOrderMaterialDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderMaterialDto)
  materials?: CreateOrderMaterialDto[];
}
