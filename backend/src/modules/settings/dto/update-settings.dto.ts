import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../payments/entities/payment.entity';
import { UserRole } from '../../users/entities/user.entity';
import { MaterialType } from '../../orders/entities/order-material.entity';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class OpeningHoursDayDto {
  @IsInt()
  @Min(0)
  @Max(6)
  day: number;

  @IsBoolean()
  closed: boolean;

  @IsOptional()
  @Matches(TIME, { message: 'open must be HH:MM' })
  open?: string;

  @IsOptional()
  @Matches(TIME, { message: 'close must be HH:MM' })
  close?: string;
}

export class MaterialChargesDto {
  @IsOptional() @IsNumber() @Min(0) BAG?: number;
  @IsOptional() @IsNumber() @Min(0) COVER?: number;
  @IsOptional() @IsNumber() @Min(0) HANGER?: number;
  @IsOptional() @IsNumber() @Min(0) ENVELOPE?: number;
}

export class TurnaroundDto {
  @IsOptional() @IsString() @MaxLength(80) STANDARD?: string;
  @IsOptional() @IsString() @MaxLength(80) EXPRESS?: string;
  @IsOptional() @IsString() @MaxLength(80) SAME_DAY?: string;
}

/** Every field optional: the Settings page saves one section at a time. */
export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  businessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional({
    description: 'Number customers WhatsApp, e.g. 0788123456',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsappNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  tin?: string | null;

  @ApiPropertyOptional({ type: [OpeningHoursDayDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningHoursDayDto)
  openingHours?: OpeningHoursDayDto[];

  @ApiPropertyOptional({ example: ['08:00-10:00', '14:00-16:00'] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  timeSlots?: string[];

  @ApiPropertyOptional({ enum: PaymentMethod, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(PaymentMethod, { each: true })
  enabledPaymentMethods?: PaymentMethod[];

  @ApiPropertyOptional({
    description: `Charge per unit for ${Object.values(MaterialType).join(', ')}`,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MaterialChargesDto)
  materialCharges?: MaterialChargesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TurnaroundDto)
  turnaround?: TurnaroundDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowDiscounts?: boolean;

  @ApiPropertyOptional({ enum: UserRole, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(UserRole, { each: true })
  discountRoles?: UserRole[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  receiptFooter?: string | null;
}
