import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PickupsController } from './pickups.controller';
import { DeliveriesController } from './deliveries.controller';
import { DriversController } from './drivers.controller';
import { LogisticsService } from './logistics.service';
import { PickupRequest } from './entities/pickup-request.entity';
import { DeliveryRequest } from './entities/delivery-request.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Order } from '../orders/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PickupRequest, DeliveryRequest, Customer, Order]),
  ],
  controllers: [PickupsController, DeliveriesController, DriversController],
  providers: [LogisticsService],
  exports: [LogisticsService],
})
export class LogisticsModule {}
