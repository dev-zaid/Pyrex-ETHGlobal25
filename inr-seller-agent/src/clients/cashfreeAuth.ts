import axios from "axios";
import { logger } from "../utils/logger";
import { CashfreeAuthError } from "../errors";

const DEFAULT_TOKEN_URL =
  "https://www.cashfree.com/devstudio/preview/payouts/embed/bearerToken";
const SKEW_MS = 30 * 1000; // refresh slightly before expiry

const TOKEN_URL = process.env.CASHFREE_TOKEN_URL ?? DEFAULT_TOKEN_URL;

let cachedToken: string | null = null;
let cachedExpiry = 0;
let inflightRequest: Promise<string> | null = null;

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new CashfreeAuthError("Invalid Cashfree bearer token received");
  }
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );
  try {
    const payload = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(payload);
  } catch (error) {
    throw new CashfreeAuthError(
      "Unable to decode Cashfree bearer token payload",
      { raw: error }
    );
  }
}

async function fetchBearerToken(): Promise<{
  token: string;
  expiresAt: number;
}> {
  try {
    const response = await axios.get<string>(TOKEN_URL, {
      responseType: "text",
    });
    const html = response.data;
    const matches = Array.from(
      html.matchAll(/Bearer\s+([A-Za-z0-9._-]+)/g)
    ).map((m) => m[1]);
    const token = matches.find(
      (candidate) => candidate.includes(".") && candidate.length > 40
    );
    if (!token) {
      throw new CashfreeAuthError(
        "Cashfree bearer token not found in response",
        { raw: matches }
      );
    }
    const payload = decodeJwtPayload(token);
    const exp =
      typeof payload.exp === "number"
        ? payload.exp * 1000
        : Date.now() + 5 * 60 * 1000;
    return { token, expiresAt: exp };
  } catch (error) {
    if (error instanceof CashfreeAuthError) {
      throw error;
    }
    throw new CashfreeAuthError("Failed to fetch Cashfree bearer token", {
      raw: error,
    });
  }
}

export async function getCashfreeBearerToken(
  forceRefresh = false
): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cachedToken && now < cachedExpiry - SKEW_MS) {
    return cachedToken;
  }

  if (inflightRequest && !forceRefresh) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    const { token, expiresAt } = await fetchBearerToken();
    cachedToken = token;
    cachedExpiry = expiresAt;
    logger.info(
      { expiresAt: new Date(expiresAt).toISOString() },
      "Fetched new Cashfree bearer token"
    );
    return token;
  })();

  try {
    return await inflightRequest;
  } finally {
    inflightRequest = null;
  }
}

export function invalidateCashfreeToken(): void {
  cachedToken = null;
  cachedExpiry = 0;
}
