type OptionalString = string | undefined;

function readOptional(name: string): OptionalString {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function readRequired(name: string): string {
  const value = readOptional(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function readBoolean(name: string, fallback = false): boolean {
  const value = readOptional(name);
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function readNumber(name: string, fallback: number): number {
  const value = readOptional(name);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  appUrl: readOptional("APP_URL"),
  openaiApiKey: readOptional("OPENAI_API_KEY"),
  anthropicApiKey: readOptional("ANTHROPIC_API_KEY"),
  syncSharedSecret: readOptional("SYNC_SHARED_SECRET"),
  wcBaseUrl: readOptional("WC_BASE_URL"),
  wcConsumerKey: readOptional("WC_CONSUMER_KEY"),
  wcConsumerSecret: readOptional("WC_CONSUMER_SECRET"),
  ebayClientId: readOptional("EBAY_CLIENT_ID"),
  ebayClientSecret: readOptional("EBAY_CLIENT_SECRET"),
  ebayMarketplaceId: readOptional("EBAY_MARKETPLACE_ID") ?? "EBAY_US",
  ebayCategoryId: readOptional("EBAY_CATEGORY_ID"),
  ebayMerchantLocationKey: readOptional("EBAY_MERCHANT_LOCATION_KEY"),
  ebayFulfillmentPolicyId: readOptional("EBAY_FULFILLMENT_POLICY_ID"),
  ebayPaymentPolicyId: readOptional("EBAY_PAYMENT_POLICY_ID"),
  ebayReturnPolicyId: readOptional("EBAY_RETURN_POLICY_ID"),
  ebayNotificationVerificationToken: readOptional(
    "EBAY_NOTIFICATION_VERIFICATION_TOKEN",
  ),
  ebayValidateSignature: readBoolean("EBAY_VALIDATE_SIGNATURE", false),
  ebaySandbox: readBoolean("EBAY_SANDBOX", false),
  mysqlHost: readOptional("MYSQLHOST"),
  mysqlPort: readNumber("MYSQLPORT", 3306),
  mysqlUser: readOptional("MYSQLUSER"),
  mysqlPassword: readOptional("MYSQLPASSWORD"),
  mysqlDatabase: readOptional("MYSQLDATABASE"),
  databaseUrl: readOptional("DATABASE_URL") ?? readOptional("MYSQL_URL"),
};

export function hasWooEnv() {
  return Boolean(env.wcBaseUrl && env.wcConsumerKey && env.wcConsumerSecret);
}

export function hasEbayEnv() {
  return Boolean(
    env.ebayClientId &&
      env.ebayClientSecret &&
      env.ebayCategoryId &&
      env.ebayMerchantLocationKey &&
      env.ebayFulfillmentPolicyId &&
      env.ebayPaymentPolicyId &&
      env.ebayReturnPolicyId,
  );
}

export function hasDatabaseEnv() {
  return Boolean(
    env.databaseUrl ||
      (env.mysqlHost && env.mysqlUser && env.mysqlPassword && env.mysqlDatabase),
  );
}
