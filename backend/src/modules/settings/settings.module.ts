import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessSettings } from './entities/business-settings.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { ServiceItem } from '../catalog/entities/service-item.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessSettings, ServiceItem, User])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
