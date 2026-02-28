import { BetaAnalyticsDataClient } from "@google-analytics/data";

/**
 * Reads and validates required environment variables for GA4 access.
 * This file must only be imported by server-side code (API routes, server actions).
 */
function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getGa4ClientConfig() {
  const clientEmail = getRequiredEnv("GOOGLE_CLIENT_EMAIL");
  const rawPrivateKey = getRequiredEnv("GOOGLE_PRIVATE_KEY");
  const propertyId = getRequiredEnv("GA4_PROPERTY_ID");

  // Most hosting providers store multiline keys with escaped newlines.
  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  return {
    property: `properties/${propertyId}`,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  };
}

export function createGa4Client() {
  const { credentials, property } = getGa4ClientConfig();
  const client = new BetaAnalyticsDataClient({ credentials });
  return { client, property };
}
