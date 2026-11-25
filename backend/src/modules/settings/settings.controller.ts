import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import { RATE_LIMITS } from '../../common/rate-limits';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'All business settings (any signed-in staff)' })
  get() {
    return this.settingsService.get();
  }

  @Patch()
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update business settings (owner/manager)' })
  update(@Body() dto: UpdateSettingsDto, @CurrentUser('id') userId?: string) {
    return this.settingsService.update(dto, userId);
  }

  @Get('setup-status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'First-run checklist of what the owner still needs to set',
  })
  setupStatus() {
    return this.settingsService.getSetupStatus();
  }

  @Get('public')
  @Public()
  @Throttle({ default: RATE_LIMITS.publicRead })
  @ApiOperation({
    summary: 'Contact details, hours and time windows for the customer page',
  })
  getPublic() {
    return this.settingsService.getPublic();
  }
}
