import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { PaginatedResult } from '../../common/types/paginated-result';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
  ) {}

  /**
   * customer_number is generated from a dedicated Postgres sequence
   * (see the CreateCustomers migration) so concurrent creates never
   * collide - format "C-00001" is illustrative, matches every mockup
   * in docs/design/, not a client-confirmed numbering scheme. Easy to
   * change in this one place if the client wants something else.
   */
  private async nextCustomerNumber(): Promise<string> {
    const [{ nextval }] = await this.customersRepository.query<
      { nextval: string }[]
    >("SELECT nextval('customer_number_seq') AS nextval");
    return `C-${nextval.padStart(5, '0')}`;
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const customerNumber = await this.nextCustomerNumber();
    const customer = this.customersRepository.create({
      ...dto,
      customerNumber,
    });
    return this.customersRepository.save(customer);
  }

  async findAll(query: QueryCustomersDto): Promise<PaginatedResult<Customer>> {
    const { page, perPage, search } = query;

    const where = search
      ? [
          { name: ILike(`%${search}%`) },
          { phone: ILike(`%${search}%`) },
          { customerNumber: ILike(`%${search}%`) },
        ]
      : undefined;

    const [data, total] = await this.customersRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return { data, meta: { page, perPage, total } };
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);
    Object.assign(customer, dto);
    return this.customersRepository.save(customer);
  }
}
