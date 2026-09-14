import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Payment,
  PaymentMethod,
  PaymentTxStatus,
} from './entities/payment.entity';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { Order, PaymentStatus } from '../orders/entities/order.entity';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { PaginatedResult } from '../../common/types/paginated-result';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  private async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    try {
      const result = (await this.dataSource.query(
        `SELECT nextval('receipt_number_seq') AS num`,
      )) as Array<{ num: string | number }>;
      const seq = String(result[0].num).padStart(5, '0');
      return `RCP-${year}-${seq}`;
    } catch {
      const count = await this.paymentsRepository.count();
      return `RCP-${year}-${String(count + 1).padStart(5, '0')}`;
    }
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    try {
      const result = (await this.dataSource.query(
        `SELECT nextval('invoice_number_seq') AS num`,
      )) as Array<{ num: string | number }>;
      const seq = String(result[0].num).padStart(5, '0');
      return `INV-${year}-${seq}`;
    } catch {
      const count = await this.invoicesRepository.count();
      return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
    }
  }

  async recordPayment(
    orderId: string,
    dto: RecordPaymentDto,
    userId?: string,
  ): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      if (order.balance <= 0 && order.paymentStatus === PaymentStatus.PAID) {
        throw new BadRequestException('Order is already fully paid');
      }

      const paymentAmount = Number(dto.amount);
      if (paymentAmount <= 0) {
        throw new BadRequestException(
          'Payment amount must be greater than zero',
        );
      }

      const receiptNumber = await this.generateReceiptNumber();

      const payment = manager.create(Payment, {
        receiptNumber,
        orderId,
        amount: paymentAmount,
        paymentMethod: dto.paymentMethod,
        status: PaymentTxStatus.COMPLETED,
        referenceNumber: dto.referenceNumber ?? null,
        receivedByUserId: userId ?? null,
        notes: dto.notes ?? null,
      });

      const savedPayment = await manager.save(Payment, payment);

      // Recalculate Order financial state
      const newAmountPaid = Number(order.amountPaid) + paymentAmount;
      const newBalance = Math.max(0, Number(order.total) - newAmountPaid);
      const newPaymentStatus =
        newBalance === 0
          ? PaymentStatus.PAID
          : newAmountPaid > 0
            ? PaymentStatus.PARTIALLY_PAID
            : PaymentStatus.UNPAID;

      order.amountPaid = newAmountPaid;
      order.balance = newBalance;
      order.paymentStatus = newPaymentStatus;

      await manager.save(Order, order);

      // If fully paid, create invoice if not exists
      if (newPaymentStatus === PaymentStatus.PAID) {
        const existingInvoice = await manager.findOne(Invoice, {
          where: { orderId },
        });

        if (!existingInvoice) {
          const invoiceNumber = await this.generateInvoiceNumber();
          const invoice = manager.create(Invoice, {
            invoiceNumber,
            orderId,
            totalAmount: order.total,
            status: InvoiceStatus.PAID,
          });
          await manager.save(Invoice, invoice);
        }
      }

      return savedPayment;
    });
  }

  async findAll(query: QueryPaymentsDto): Promise<PaginatedResult<Payment>> {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .leftJoinAndSelect('order.customer', 'customer')
      .orderBy('payment.createdAt', 'DESC')
      .skip(skip)
      .take(perPage);

    if (query.search) {
      qb.andWhere(
        '(payment.receiptNumber ILIKE :search OR order.orderNumber ILIKE :search OR customer.name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.paymentMethod) {
      qb.andWhere('payment.paymentMethod = :method', {
        method: query.paymentMethod,
      });
    }

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }

    if (query.orderId) {
      qb.andWhere('payment.orderId = :orderId', { orderId: query.orderId });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        perPage,
        total,
      },
    };
  }

  async getSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayPayments = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('payment.paymentMethod', 'method')
      .addSelect('SUM(payment.amount)', 'total')
      .where('payment.createdAt >= :today', { today })
      .andWhere('payment.status = :status', {
        status: PaymentTxStatus.COMPLETED,
      })
      .groupBy('payment.paymentMethod')
      .getRawMany<{ method: PaymentMethod; total: string }>();

    const methodBreakdown: Record<PaymentMethod, number> = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.MOMO]: 0,
      [PaymentMethod.BANK_TRANSFER]: 0,
      [PaymentMethod.CARD]: 0,
    };

    let todayTotal = 0;
    for (const row of todayPayments) {
      const amount = parseFloat(row.total) || 0;
      if (row.method in methodBreakdown) {
        methodBreakdown[row.method] = amount;
      }
      todayTotal += amount;
    }

    // Outstanding balances from active orders
    const outstandingResult = await this.ordersRepository
      .createQueryBuilder('order')
      .select('SUM(order.balance)', 'totalOutstanding')
      .where('order.paymentStatus != :status', { status: PaymentStatus.PAID })
      .getRawOne<{ totalOutstanding: string | null }>();

    const totalOutstanding =
      parseFloat(outstandingResult?.totalOutstanding ?? '0') || 0;

    return {
      todayTotal,
      methodBreakdown,
      totalOutstanding,
    };
  }

  async findForOrder(orderId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }
}
