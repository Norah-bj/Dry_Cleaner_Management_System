import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CustomersService } from './customers.service';
import { Customer, CustomerStatus } from './entities/customer.entity';

type MockRepo = jest.Mocked<
  Pick<
    Repository<Customer>,
    'query' | 'create' | 'save' | 'findOne' | 'findAndCount'
  >
>;

describe('CustomersService', () => {
  let service: CustomersService;
  let repo: MockRepo;

  beforeEach(() => {
    repo = {
      query: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    service = new CustomersService(repo as unknown as Repository<Customer>);
  });

  describe('create', () => {
    it('generates a customer number from the sequence and saves', async () => {
      repo.query.mockResolvedValue([{ nextval: '7' }]);
      repo.create.mockImplementation((input) => input as Customer);
      repo.save.mockImplementation((input) =>
        Promise.resolve({ id: 'new-id', ...input } as Customer),
      );

      const result = await service.create({
        name: 'Jean Claude',
        phone: '0788123456',
      });

      expect(repo.query).toHaveBeenCalledWith(
        "SELECT nextval('customer_number_seq') AS nextval",
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerNumber: 'C-00007',
          name: 'Jean Claude',
        }),
      );
      expect(result.customerNumber).toBe('C-00007');
    });
  });

  describe('findOne', () => {
    it('returns the customer when found', async () => {
      const customer = { id: '1', name: 'Alice' } as Customer;
      repo.findOne.mockResolvedValue(customer);

      await expect(service.findOne('1')).resolves.toBe(customer);
    });

    it('throws NotFoundException when missing', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('paginates and searches across name/phone/customer number', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 2,
        perPage: 10,
        search: 'jean',
      });

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.meta).toEqual({ page: 2, perPage: 10, total: 0 });
    });
  });

  describe('update', () => {
    it('merges changes onto the existing customer', async () => {
      const existing = {
        id: '1',
        name: 'Old Name',
        status: CustomerStatus.ACTIVE,
      } as Customer;
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((input) =>
        Promise.resolve(input as Customer),
      );

      const result = await service.update('1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });
  });
});
