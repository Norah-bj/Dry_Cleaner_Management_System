import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaymentMethod, PaymentTxStatus } from '../entities/payment.entity';

export class QueryPaymentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'RCP-2026' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ enum: PaymentTxStatus })
  @IsEnum(PaymentTxStatus)
  @IsOptional()
  status?: PaymentTxStatus;

  @ApiPropertyOptional({ description: 'Filter by Order UUID' })
  @IsUUID()
  @IsOptional()
  orderId?: string;
}
