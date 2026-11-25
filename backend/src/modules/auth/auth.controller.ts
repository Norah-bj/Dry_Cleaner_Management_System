import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { RATE_LIMITS } from '../../common/rate-limits';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  refreshToken: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: RATE_LIMITS.login })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description:
      'Returns a short-lived access token, a refresh token and the user profile.',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  async login(@Body() dto: LoginDto): Promise<LoginResult> {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }

  @Public()
  @Throttle({ default: RATE_LIMITS.refresh })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Rotates the refresh token and returns a new pair.',
  })
  refresh(@Body() dto: RefreshTokenDto): Promise<LoginResult> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }
}
