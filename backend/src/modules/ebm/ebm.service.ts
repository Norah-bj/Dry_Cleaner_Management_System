import { Injectable } from '@nestjs/common';

/**
 * EBM (Rwanda's Electronic Billing Machine) boundary - CLAUDE.md rule 9.
 *
 * The client's EBM device/software is not confirmed yet
 * (docs/requirements/CLIENT-QUESTIONS.md §1), so this module deliberately
 * integrates with nothing. It exists so the rest of the system has one
 * place to call when a sale needs an EBM receipt; the real provider is
 * plugged in behind `EbmProvider` once we know what the shop uses.
 *
 * Until then the shop keeps issuing EBM receipts on its own machine, and
 * EDCMS receipts are clearly labelled as not being tax receipts.
 */
export interface EbmSale {
  receiptNumber: string;
  orderNumber: string;
  amount: number;
}

export type EbmStatus =
  | { configured: false; message: string }
  | { configured: true; provider: string };

export interface EbmProvider {
  status(): EbmStatus;
  /** Returns the EBM receipt reference, or null when EBM isn't configured. */
  recordSale(sale: EbmSale): Promise<string | null>;
}

@Injectable()
export class NotConfiguredEbmProvider implements EbmProvider {
  status(): EbmStatus {
    return {
      configured: false,
      message:
        'EBM is not connected. Issue tax receipts on the shop’s EBM machine as usual. EDCMS receipts are not EBM tax receipts.',
    };
  }

  recordSale(): Promise<string | null> {
    return Promise.resolve(null);
  }
}

export const EBM_PROVIDER = Symbol('EBM_PROVIDER');
