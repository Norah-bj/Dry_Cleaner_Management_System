import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  OrderStatus,
  PaymentStatus,
  ServiceTier,
} from '../entities/order.entity';

export class QueryOrdersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'ORD-2026' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ enum: ServiceTier })
  @IsEnum(ServiceTier)
  @IsOptional()
  serviceTier?: ServiceTier;

  @ApiPropertyOptional({ description: 'Filter by Customer UUID' })
  @IsUUID()
  @IsOptional()
  customerId?: string;
}
