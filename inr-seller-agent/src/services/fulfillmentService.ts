import { fetchReservation } from "../clients/orderbook";
import { logger } from "../utils/logger";
import { createDirectTransfer } from "../clients/cashfree";
import { CashfreeApiError, CashfreeFulfillmentError } from "../errors";

const AMOUNT_TOLERANCE = 1e-8;

export interface FulfillmentRequest {
  orderId: string;
  expectedAmount?: number;
}

export interface ReservationCheck {
  reservationId: string;
  amountToFulfill: number;
}

export interface FulfillmentResult {
  reservationId: string;
  amount: number;
  cashfree: {
    reference_id: string;
    status: string;
  };
}

export async function validateReservation({
  orderId,
  expectedAmount,
}: FulfillmentRequest): Promise<ReservationCheck> {
  const record = await fetchReservation(orderId);
  if (!record) {
    throw new Error(`Reservation ${orderId} not found or inactive`);
  }

  if (record.status !== "pending") {
    throw new Error(`Reservation ${orderId} is not pending`);
  }

  const reservedAmount = Number(record.amount_pyusd);
  if (!Number.isFinite(reservedAmount) || reservedAmount <= 0) {
    logger.warn({ record }, "Reservation amount invalid");
    throw new Error("Reservation amount invalid");
  }

  if (
    typeof expectedAmount === "number" &&
    Math.abs(expectedAmount - reservedAmount) > AMOUNT_TOLERANCE
  ) {
    throw new Error(
      `Requested amount (${expectedAmount}) does not match reserved liquidity (${reservedAmount})`
    );
  }

  return { reservationId: record.id, amountToFulfill: reservedAmount };
}

export async function fulfillOrder(
  request: FulfillmentRequest
): Promise<FulfillmentResult> {
  const { reservationId, amountToFulfill } = await validateReservation(request);

  const transferId = Date.now().toString();
  let transferResponse;
  try {
    transferResponse = await createDirectTransfer({
      transferMode: "upi",
      amount: amountToFulfill,
      transferId,
      beneDetails: {
        name: "Hackathon Seller",
        phone: "9999999999",
        email: "johndoe_1@cashfree.com",
        address1: "Becharam Chatterjee Road",
        vpa: "success@upi",
      },
    });
  } catch (error) {
    if (error instanceof CashfreeApiError) {
      logger.error(
        { orderId: request.orderId, details: error.details },
        "Cashfree transfer failed"
      );
      throw new CashfreeFulfillmentError(
        "Cashfree transaction failed",
        error.details
      );
    }
    logger.error(
      { orderId: request.orderId, error },
      "Cashfree transfer failed"
    );
    throw new CashfreeFulfillmentError("Cashfree transaction failed");
  }

  return {
    reservationId,
    amount: amountToFulfill,
    cashfree: {
      reference_id: transferResponse.referenceId,
      status: transferResponse.status,
    },
  };
}
