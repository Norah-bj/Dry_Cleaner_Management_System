import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('payments')
@ApiBearerAuth()
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:orderId/payments')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.RECEPTIONIST,
    UserRole.CASHIER,
  )
  @ApiOperation({ summary: 'Record a payment transaction on an order' })
  recordPayment(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() recordPaymentDto: RecordPaymentDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.paymentsService.recordPayment(orderId, recordPaymentDto, userId);
  }

  @Get('payments')
  @ApiOperation({
    summary: 'List all payment transactions with filters and pagination',
  })
  findAll(@Query() query: QueryPaymentsDto) {
    return this.paymentsService.findAll(query);
  }

  @Get('payments/summary')
  @ApiOperation({
    summary: 'Get daily collections breakdown and total outstanding receivables',
  })
  getSummary() {
    return this.paymentsService.getSummary();
  }

  @Get('orders/:orderId/payments')
  @ApiOperation({
    summary: 'List all payment transactions for a specific order',
  })
  findForOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.paymentsService.findForOrder(orderId);
  }
}
