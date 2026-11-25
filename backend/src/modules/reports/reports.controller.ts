import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UserRole } from '../users/entities/user.entity';
import { DashboardService } from './dashboard.service';
import {
  EXPORT_DATASETS,
  type ExportDataset,
  ReportsService,
  toCsv,
} from './reports.service';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ReportRangeDto {
  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Inclusive, business time zone. Default: today',
  })
  @IsOptional()
  @Matches(DATE, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @Matches(DATE, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}

/** Per PAGES.md RBAC: reports are for the owner and manager. */
const CAN_SEE_REPORTS = [UserRole.SUPER_ADMIN, UserRole.MANAGER];

@ApiTags('reports')
@ApiBearerAuth()
@Controller()
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly dashboardService: DashboardService,
  ) {}

  @Get('reports/summary')
  @Roles(...CAN_SEE_REPORTS)
  @ApiOperation({
    summary:
      'Revenue, orders, customers, outstanding, inventory and logistics for a date range',
  })
  summary(@Query() q: ReportRangeDto) {
    return this.reportsService.summary(
      this.reportsService.normalizeRange(q.from, q.to),
    );
  }

  @Get('reports/export/:dataset')
  @Roles(...CAN_SEE_REPORTS)
  @ApiOperation({
    summary:
      'CSV download (opens in Excel): payments, orders, customers or inventory',
  })
  async export(
    @Param('dataset', new ParseEnumPipe(EXPORT_DATASETS))
    dataset: ExportDataset,
    @Query() q: ReportRangeDto,
    @Res() res: Response,
  ) {
    const range = this.reportsService.normalizeRange(q.from, q.to);
    const rows = await this.reportsService.exportRows(dataset, range);
    res
      .status(200)
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="edcms-${dataset}-${range.from}_to_${range.to}.csv"`,
        'Cache-Control': 'no-store',
      })
      .send(toCsv(rows));
  }

  @Get('dashboard/summary')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.RECEPTIONIST,
    UserRole.CASHIER,
    UserRole.LAUNDRY_STAFF,
  )
  @ApiOperation({
    summary:
      "Today's numbers, laundry flow, orders needing attention, today's runs",
  })
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.summary(user.role);
  }
}
