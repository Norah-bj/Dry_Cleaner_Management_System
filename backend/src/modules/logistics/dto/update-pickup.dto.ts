import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PickupStatus } from '../entities/pickup-request.entity';

export class UpdatePickupDto {
  @ApiPropertyOptional({ enum: PickupStatus })
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

  @ApiPropertyOptional({ example: '2026-09-16' })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({ example: 'Afternoon (13:00 - 17:00)' })
  @IsString()
  @IsOptional()
  timeSlot?: string;

  @ApiPropertyOptional({ example: 'Customer rescheduled' })
  @IsString()
  @IsOptional()
  notes?: string;
}
