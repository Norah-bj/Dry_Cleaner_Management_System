import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessSettings } from './entities/business-settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ServiceItem } from '../catalog/entities/service-item.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';

export interface SetupItem {
  key: string;
  done: boolean;
  label: string;
}

/** What the public customer page may see. No staff or financial data. */
export interface PublicSettings {
  businessName: string;
  phone: string | null;
  whatsappNumber: string | null;
  address: string | null;
  openingHours: BusinessSettings['openingHours'];
  timeSlots: string[];
  turnaround: BusinessSettings['turnaround'];
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(BusinessSettings)
    private readonly settingsRepository: Repository<BusinessSettings>,
    @InjectRepository(ServiceItem)
    private readonly serviceItemsRepository: Repository<ServiceItem>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * The single settings row. Recreated with only the documented facts if it
   * is ever missing (e.g. after a test truncates the table) - never with
   * invented prices, hours or payment methods.
   */
  async get(): Promise<BusinessSettings> {
    const existing = await this.settingsRepository.findOne({
      where: { id: 1 },
    });
    if (existing) return existing;
    return this.settingsRepository.save(
      this.settingsRepository.create({
        id: 1,
        businessName: 'EBENEZER DRY CLEANER',
        ownerName: 'HIRWA Triphine',
        address: 'Nyamata, Bugesera, Rwanda',
        openingHours: [],
        timeSlots: [],
        enabledPaymentMethods: [],
        materialCharges: {},
        turnaround: {},
        allowDiscounts: false,
        discountRoles: [],
      }),
    );
  }

  async update(
    dto: UpdateSettingsDto,
    userId?: string,
  ): Promise<BusinessSettings> {
    const settings = await this.get();
    const before = JSON.parse(JSON.stringify(settings)) as Record<
      string,
      unknown
    >;
    const { materialCharges, turnaround, ...rest } = dto;
    Object.assign(settings, rest);
    if (materialCharges) {
      // Replace the whole map so the owner can clear a charge.
      settings.materialCharges = Object.fromEntries(
        Object.entries(materialCharges).filter(
          ([, v]) => v !== undefined && v !== null,
        ),
      );
    }
    if (turnaround) settings.turnaround = { ...turnaround };
    if (dto.timeSlots)
      settings.timeSlots = dto.timeSlots.map((s) => s.trim()).filter(Boolean);
    settings.updatedByUserId = userId ?? null;
    const saved = await this.settingsRepository.save(settings);
    const changed = Object.keys(dto).filter(
      (k) =>
        JSON.stringify(before[k]) !==
        JSON.stringify((saved as unknown as Record<string, unknown>)[k]),
    );
    if (changed.length > 0) {
      await this.auditService.log({
        actorId: userId,
        action: 'settings.updated',
        entityType: 'settings',
        entityId: '1',
        summary: `Changed settings: ${changed.join(', ')}`,
        details: Object.fromEntries(
          changed.map((k) => [
            k,
            {
              before: before[k],
              after: (saved as unknown as Record<string, unknown>)[k],
            },
          ]),
        ),
      });
    }
    return saved;
  }

  async getPublic(): Promise<PublicSettings> {
    const s = await this.get();
    return {
      businessName: s.businessName,
      phone: s.phone,
      whatsappNumber: s.whatsappNumber,
      address: s.address,
      openingHours: s.openingHours,
      timeSlots: s.timeSlots,
      turnaround: s.turnaround,
    };
  }

  /** The owner's first-run checklist, shown on the dashboard until complete. */
  async getSetupStatus(): Promise<{ complete: boolean; items: SetupItem[] }> {
    const s = await this.get();
    const pricedItems = await this.serviceItemsRepository
      .createQueryBuilder('item')
      .where('item.isActive = true')
      .andWhere(
        '(item.priceStandard IS NOT NULL OR item.priceExpress IS NOT NULL OR item.priceSameDay IS NOT NULL)',
      )
      .getCount();
    const staff = await this.usersRepository.count({
      where: { isActive: true },
    });
    const drivers = await this.usersRepository.count({
      where: { isActive: true, role: UserRole.DRIVER },
    });

    const items: SetupItem[] = [
      {
        key: 'prices',
        done: pricedItems > 0,
        label: 'Add your services and prices',
      },
      {
        key: 'payments',
        done: s.enabledPaymentMethods.length > 0,
        label: 'Choose the payment methods you accept',
      },
      { key: 'contact', done: !!s.phone, label: 'Add the shop phone number' },
      {
        key: 'hours',
        done: s.openingHours.length > 0,
        label: 'Set your opening hours',
      },
      {
        key: 'slots',
        done: s.timeSlots.length > 0,
        label: 'Set pickup and delivery time windows',
      },
      { key: 'staff', done: staff > 1, label: 'Create logins for your staff' },
      {
        key: 'drivers',
        done: drivers > 0,
        label: 'Add at least one driver (if you do pickups/deliveries)',
      },
    ];
    return { complete: items.every((i) => i.done), items };
  }
}
