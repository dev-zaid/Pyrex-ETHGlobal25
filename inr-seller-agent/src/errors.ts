export interface CashfreeErrorDetails {
  httpStatus?: number;
  provider_status?: string;
  provider_sub_code?: string;
  provider_message?: string;
  raw?: unknown;
}

export class CashfreeApiError extends Error {
  constructor(message: string, public readonly details: CashfreeErrorDetails = {}) {
    super(message);
    this.name = 'CashfreeApiError';
  }
}

export class CashfreeFulfillmentError extends Error {
  constructor(
    message: string,
    public readonly details: CashfreeErrorDetails = {},
    public readonly statusCode = 502,
  ) {
    super(message);
    this.name = 'CashfreeFulfillmentError';
  }
}
