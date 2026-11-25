import { Controller, Get, Inject, Module } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  EBM_PROVIDER,
  type EbmProvider,
  NotConfiguredEbmProvider,
} from './ebm.service';

@ApiTags('ebm')
@ApiBearerAuth()
@Controller('ebm')
export class EbmController {
  constructor(@Inject(EBM_PROVIDER) private readonly ebm: EbmProvider) {}

  @Get('status')
  @ApiOperation({
    summary:
      'Whether an EBM integration is configured (it is not, until the client confirms the device)',
  })
  status() {
    return this.ebm.status();
  }
}

/** Isolated EBM boundary. Swap the provider here once the device is confirmed. */
@Module({
  controllers: [EbmController],
  providers: [{ provide: EBM_PROVIDER, useClass: NotConfiguredEbmProvider }],
  exports: [EBM_PROVIDER],
})
export class EbmModule {}
