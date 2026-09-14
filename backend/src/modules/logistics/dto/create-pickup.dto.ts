import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PickupStatus } from '../entities/pickup-request.entity';

export class CreatePickupDto {
  @ApiProperty({ description: 'Customer UUID' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ description: 'Optional linked Order UUID' })
  @IsUUID()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ example: 'Nyamata Town, Near Taxi Park' })
  @IsString()
  @IsNotEmpty()
  pickupAddress: string;

  @ApiProperty({ example: '2026-09-15' })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiPropertyOptional({ example: 'Morning (08:00 - 12:00)' })
  @IsString()
  @IsOptional()
  timeSlot?: string;

  @ApiPropertyOptional({ enum: PickupStatus, default: PickupStatus.REQUESTED })
  @IsEnum(PickupStatus)
  @IsOptional()
  status?: PickupStatus;

  @ApiPropertyOptional({ example: 'DRV-001' })
  @IsString()
  @IsOptional()
  assignedDriverId?: string;

  @ApiPropertyOptional({ example: 'Jean Paul' })
  @IsString()
  @IsOptional()
  assignedDriverName?: string;

  @ApiPropertyOptional({ example: 'Call before arriving' })
  @IsString()
  @IsOptional()
  notes?: string;
}
