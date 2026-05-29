/**
 * Drizzle ORM schema — khớp 1-1 với Alembic ở mrnine-gateway.
 *
 * MongoDB giữ nguyên cho Playground assets / Chat / etc.
 * Postgres chỉ dùng cho:
 *   - users + auth (NextAuth share)
 *   - api_keys (sk-mrnine-*)
 *   - balance + transactions + ledger
 *   - provider_keys + model_map (admin)
 *   - requests + daily_usage (gateway ghi, dashboard đọc)
 */
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────────
export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "deleted"]);
export const apiKeyStatusEnum = pgEnum("api_key_status", ["active", "disabled", "revoked"]);
export const providerKeyStatusEnum = pgEnum("provider_key_status", ["active", "cooling", "disabled"]);
export const ledgerKindEnum = pgEnum("ledger_kind", [
  "topup",
  "spend",
  "refund",
  "adjust",
  "signup_bonus",
]);
export const txnStatusEnum = pgEnum("txn_status", ["pending", "completed", "failed", "refunded"]);

// ── Users ──────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }),
    displayName: varchar("display_name", { length: 120 }),
    isAdmin: boolean("is_admin").notNull().default(false),
    status: userStatusEnum("status").notNull().default("active"),
    balanceMicroUsd: bigint("balance_micro_usd", { mode: "number" }).notNull().default(0),
    lifetimeTopupMicroUsd: bigint("lifetime_topup_micro_usd", { mode: "number" }).notNull().default(0),
    lifetimeSpendMicroUsd: bigint("lifetime_spend_micro_usd", { mode: "number" }).notNull().default(0),
    lowBalanceNotifiedAt: timestamp("low_balance_notified_at", { withTimezone: true }),
    referralCode: varchar("referral_code", { length: 16 }).unique(),
    referredBy: uuid("referred_by"),
    referralBonusGranted: boolean("referral_bonus_granted").notNull().default(false),
    digestEnabled: boolean("digest_enabled").notNull().default(true),
    lastDigestAt: timestamp("last_digest_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("ix_users_email").on(t.email),
  }),
);

// ── API keys ───────────────────────────────────────────────────────
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    keyHash: varchar("key_hash", { length: 255 }).notNull().unique(),
    keyPrefix: varchar("key_prefix", { length: 64 }).notNull(),
    status: apiKeyStatusEnum("status").notNull().default("active"),
    rpmOverride: integer("rpm_override"),
    tpmOverride: integer("tpm_override"),
    dailyTokensOverride: integer("daily_tokens_override"),
    allowedModels: jsonb("allowed_models").$type<string[] | null>(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userIdx: index("ix_api_keys_user_id").on(t.userId),
    hashIdx: uniqueIndex("ix_api_keys_key_hash").on(t.keyHash),
  }),
);

// ── Provider keys (aiyan + future) ─────────────────────────────────
export const providerKeys = pgTable(
  "provider_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: varchar("provider", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    keyEncrypted: text("key_encrypted").notNull(),
    weight: integer("weight").notNull().default(100),
    status: providerKeyStatusEnum("status").notNull().default("active"),
    cooldownUntil: timestamp("cooldown_until", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    providerIdx: index("ix_provider_keys_provider").on(t.provider),
    providerStatusIdx: index("ix_provider_keys_provider_status").on(t.provider, t.status),
  }),
);

// ── Model map ──────────────────────────────────────────────────────
export const modelMap = pgTable(
  "model_map",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicName: varchar("public_name", { length: 120 }).notNull().unique(),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerModel: varchar("provider_model", { length: 120 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    inputCostPerMtok: numeric("input_cost_per_mtok", { precision: 10, scale: 4 }).notNull().default("0"),
    outputCostPerMtok: numeric("output_cost_per_mtok", { precision: 10, scale: 4 }).notNull().default("0"),
    markup: numeric("markup", { precision: 6, scale: 3 }).notNull().default("1.20"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    publicNameIdx: uniqueIndex("ix_model_map_public_name").on(t.publicName),
  }),
);

// ── Balance ledger ─────────────────────────────────────────────────
export const balanceLedger = pgTable(
  "balance_ledger",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: ledgerKindEnum("kind").notNull(),
    deltaMicroUsd: bigint("delta_micro_usd", { mode: "number" }).notNull(),
    balanceAfterMicroUsd: bigint("balance_after_micro_usd", { mode: "number" }).notNull(),
    requestId: varchar("request_id", { length: 64 }),
    note: text("note"),
    metadataJson: jsonb("metadata_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userIdx: index("ix_balance_ledger_user_id").on(t.userId),
    requestIdIdx: index("ix_balance_ledger_request_id").on(t.requestId),
  }),
);

// ── Transactions ───────────────────────────────────────────────────
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerRef: varchar("provider_ref", { length: 255 }).unique(),
    amountVnd: integer("amount_vnd").notNull(),
    amountMicroUsd: bigint("amount_micro_usd", { mode: "number" }).notNull(),
    fxRate: integer("fx_rate").notNull(),
    status: txnStatusEnum("status").notNull().default("pending"),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("ix_transactions_user_id").on(t.userId),
  }),
);

// ── Requests (gateway writes, dashboard reads) ─────────────────────
export const requests = pgTable(
  "requests",
  {
    id: serial("id").primaryKey(),
    requestId: varchar("request_id", { length: 64 }).notNull().unique(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
    provider: varchar("provider", { length: 64 }),
    providerKeyId: uuid("provider_key_id").references(() => providerKeys.id, { onDelete: "set null" }),
    endpoint: varchar("endpoint", { length: 64 }).notNull(),
    publicModel: varchar("public_model", { length: 120 }),
    providerModel: varchar("provider_model", { length: 120 }),
    stream: boolean("stream").notNull().default(false),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    costProviderMicroUsd: bigint("cost_provider_micro_usd", { mode: "number" }).notNull().default(0),
    costUserMicroUsd: bigint("cost_user_micro_usd", { mode: "number" }).notNull().default(0),
    profitMicroUsd: bigint("profit_micro_usd", { mode: "number" }).notNull().default(0),
    statusCode: integer("status_code").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    errorMessage: text("error_message"),
    debugPayload: jsonb("debug_payload"),
    clientIp: varchar("client_ip", { length: 64 }),
    userAgent: varchar("user_agent", { length: 255 }),
    sessionId: varchar("session_id", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    requestIdIdx: uniqueIndex("ix_requests_request_id").on(t.requestId),
    userIdx: index("ix_requests_user_id").on(t.userId),
    apiKeyIdx: index("ix_requests_api_key_id").on(t.apiKeyId),
    userCreatedIdx: index("ix_requests_user_created").on(t.userId, t.createdAt),
    sessionIdx: index("ix_requests_session").on(t.sessionId),
  }),
);

// ── Daily usage aggregate ──────────────────────────────────────────
export const dailyUsage = pgTable(
  "daily_usage",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: timestamp("day", { withTimezone: true }).notNull(),
    publicModel: varchar("public_model", { length: 120 }),
    requestsOk: integer("requests_ok").notNull().default(0),
    requestsErr: integer("requests_err").notNull().default(0),
    promptTokens: bigint("prompt_tokens", { mode: "number" }).notNull().default(0),
    completionTokens: bigint("completion_tokens", { mode: "number" }).notNull().default(0),
    totalTokens: bigint("total_tokens", { mode: "number" }).notNull().default(0),
    costUserMicroUsd: bigint("cost_user_micro_usd", { mode: "number" }).notNull().default(0),
  },
  (t) => ({
    userDayIdx: index("ix_daily_user_day").on(t.userId, t.day),
    uniqUserDayModel: uniqueIndex("uq_daily_user_day_model").on(t.userId, t.day, t.publicModel),
  }),
);

export type User = typeof users.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Request = typeof requests.$inferSelect;

// ── Coupons ────────────────────────────────────────────────────────
export const couponKindEnum = pgEnum("coupon_kind", ["fixed_micro_usd", "fixed_vnd"]);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    kind: couponKindEnum("kind").notNull(),
    valueMicroUsd: bigint("value_micro_usd", { mode: "number" }).notNull(),
    maxRedemptions: integer("max_redemptions").notNull().default(1),
    redeemedCount: integer("redeemed_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    codeIdx: uniqueIndex("ix_coupons_code").on(t.code),
  }),
);

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: serial("id").primaryKey(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    creditedMicroUsd: bigint("credited_micro_usd", { mode: "number" }).notNull(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uniqUserCoupon: uniqueIndex("uq_coupon_redemptions_user").on(t.couponId, t.userId),
    couponIdx: index("ix_coupon_redemptions_coupon").on(t.couponId),
  }),
);

export type Coupon = typeof coupons.$inferSelect;

// ── User webhooks ──────────────────────────────────────────────────
export const userWebhooks = pgTable(
  "user_webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secret: varchar("secret", { length: 128 }).notNull(),
    events: jsonb("events").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    enabled: boolean("enabled").notNull().default(true),
    lastFiredAt: timestamp("last_fired_at", { withTimezone: true }),
    lastStatus: integer("last_status"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userIdx: index("ix_user_webhooks_user").on(t.userId),
  }),
);

export type UserWebhook = typeof userWebhooks.$inferSelect;

export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", [
  "pending",
  "succeeded",
  "failed",
]);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: serial("id").primaryKey(),
    webhookId: uuid("webhook_id")
      .notNull()
      .references(() => userWebhooks.id, { onDelete: "cascade" }),
    event: varchar("event", { length: 64 }).notNull(),
    payload: jsonb("payload").notNull(),
    status: webhookDeliveryStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }).notNull().defaultNow(),
    lastStatus: integer("last_status"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    pendingIdx: index("ix_webhook_deliveries_pending").on(t.status, t.nextRetryAt),
    webhookIdx: index("ix_webhook_deliveries_webhook").on(t.webhookId),
  }),
);

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;

// ── Audit log (admin actions) ─────────────────────────────────────
export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    actorEmail: varchar("actor_email", { length: 255 }),
    action: varchar("action", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 64 }),
    targetId: varchar("target_id", { length: 128 }),
    metadata: jsonb("metadata"),
    ip: varchar("ip", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    actorIdx: index("ix_audit_actor").on(t.actorEmail),
    actionIdx: index("ix_audit_action").on(t.action),
    createdIdx: index("ix_audit_created").on(t.createdAt),
  }),
);

export type AuditEntry = typeof auditLog.$inferSelect;
