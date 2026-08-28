import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'staff@ebenezer.rw' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password: string;
}
