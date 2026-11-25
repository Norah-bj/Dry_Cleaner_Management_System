import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Pickup request from the public customer page (no login). The customer is
 * identified by phone: an existing customer with that exact phone is reused,
 * otherwise a new customer record is created.
 */
export class PublicPickupRequestDto {
  @ApiProperty({ example: 'Jean Claude' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: '0788123456' })
  @IsString()
  @Matches(/^\+?[0-9 ]{9,16}$/, {
    message: 'phone must be a valid phone number',
  })
  phone: string;

  @ApiProperty({ example: 'Nyamata, near the market' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address: string;

  @ApiProperty({ example: '2026-12-01' })
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional({ example: '14:00-16:00' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timeSlot?: string;

  @ApiPropertyOptional({ example: '3 suits and 2 dresses' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
