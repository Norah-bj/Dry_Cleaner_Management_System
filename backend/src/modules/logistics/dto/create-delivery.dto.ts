import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { DeliveryStatus } from '../entities/delivery-request.entity';

export class CreateDeliveryDto {
  @ApiProperty({ description: 'Order UUID' })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'Nyamata Sector Office Area' })
  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @ApiProperty({ example: '2026-09-16' })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiPropertyOptional({ example: 'Morning (08:00 - 12:00)' })
  @IsString()
  @IsOptional()
  timeSlot?: string;

  @ApiPropertyOptional({
    example: 4500,
    description: 'Amount to collect on delivery',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amountCollectable?: number;

  @ApiPropertyOptional({
    enum: DeliveryStatus,
    default: DeliveryStatus.SCHEDULED,
  })
  @IsEnum(DeliveryStatus)
  @IsOptional()
  status?: DeliveryStatus;

  @ApiPropertyOptional({ example: 'DRV-001' })
  @IsString()
  @IsOptional()
  assignedDriverId?: string;

  @ApiPropertyOptional({ example: 'Jean Paul' })
  @IsString()
  @IsOptional()
  assignedDriverName?: string;

  @ApiPropertyOptional({ example: 'Ring doorbell twice' })
  @IsString()
  @IsOptional()
  notes?: string;
}
