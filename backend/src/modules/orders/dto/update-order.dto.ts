import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateOrderDto {
  @ApiPropertyOptional({ example: 'H-042' })
  @IsString()
  @IsOptional()
  storageHangerId?: string;

  @ApiPropertyOptional({ example: 'B-015' })
  @IsString()
  @IsOptional()
  storageBoxId?: string;

  @ApiPropertyOptional({ example: '2026-09-17T14:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  expectedCompletion?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ example: 'Customer called to add fragrance' })
  @IsString()
  @IsOptional()
  notes?: string;
}
