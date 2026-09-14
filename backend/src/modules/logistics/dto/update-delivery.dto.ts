import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DeliveryStatus } from '../entities/delivery-request.entity';

export class UpdateDeliveryDto {
  @ApiPropertyOptional({ enum: DeliveryStatus })
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

  @ApiPropertyOptional({ example: '2026-09-17' })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({ example: 'Afternoon (13:00 - 17:00)' })
  @IsString()
  @IsOptional()
  timeSlot?: string;

  @ApiPropertyOptional({ example: 4500 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amountCollectable?: number;

  @ApiPropertyOptional({ example: 'Delivery rescheduled per client request' })
  @IsString()
  @IsOptional()
  notes?: string;
}
