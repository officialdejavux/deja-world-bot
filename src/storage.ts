import { appendFile, copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type Mood = "experience" | "divine" | "balanced";
export type ConversationVibe = "sweet" | "goddess" | "talk" | "explore" | "private" | "after_hours" | "missed_you";
export type AccessType = "none" | "girlfriend" | "goddess" | "vip";
export type MembershipStatus = "none" | "pending" | "approved" | "expired" | "removed";
export type AdminApprovalStatus = "none" | "pending" | "approved" | "denied" | "removed";
export type AccessRequestKind = "topup" | "membership";
export type ManualPaymentStatus = "pending" | "approved" | "denied";
export type ManualPaymentType = "message_credits" | "girlfriend" | "goddess" | "vip" | "private" | "other";
export type PrivateDropTier = AccessType | "all_paid" | "credits";

export type AnalyticsSummary = {
  knownUsers: number;
  activeUsers: number;
  stoppedUsers: number;
  seenLast24Hours: number;
  activeMemberships: number;
  expiredMemberships: number;
  creditedUsers: number;
  pendingManualRequests: number;
  approvedManualRequests: number;
  deniedManualRequests: number;
  successfulStarsPayments: number;
  totalStarsCollected: number;
  successfulStripePayments: number;
  totalStripeRevenueCents: number;
  accessCounts: Record<AccessType, number>;
  membershipStatusCounts: Record<MembershipStatus, number>;
  topOffers: Array<{ offerId: string; count: number; stars: number }>;
};

export type FunnelSummary = {
  last24Hours: Record<string, number>;
  last7Days: Record<string, number>;
  total: Record<string, number>;
};

export type PaymentProvider = "telegram_stars" | "stripe" | "manual";

export type PaymentRecord = {
  userId: string;
  offerId: string;
  provider?: PaymentProvider;
  stars?: number;
  amountCents?: number;
  currency?: string;
  usdReference?: string;
  telegramPaymentChargeId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  manualRequestId?: string;
  manualPaymentType?: ManualPaymentType;
  approvedByAdminId?: string;
  providerPaymentChargeId?: string;
  payload: string;
  createdAt: string;
  delivered: boolean;
  deliveryResult: string;
  refunded: boolean;
};

export type ManualPaymentRequest = {
  requestId: string;
  userId: string;
  username?: string;
  selectedType: ManualPaymentType;
  note?: string;
  attachmentFileId?: string;
  createdAt: string;
  status: ManualPaymentStatus;
};

export type AccessRequest = {
  kind: AccessRequestKind;
  optionKey: string;
  label: string;
  price?: string;
  accessType?: AccessType;
  requestedAt: string;
  status: AdminApprovalStatus;
};

export type UserRecord = {
  telegramId: string;
  username?: string;
  firstName?: string;
  mood: Mood;
  conversationVibe?: ConversationVibe;
  lastRoomVisited?: string;
  lastGalleryCategory?: string;
  lastVoiceNoteCategory?: string;
  lastPurchaseOfferId?: string;
  currentAccessType: AccessType;
  messageCredits: number;
  membershipStatus: MembershipStatus;
  membershipExpiresAt?: string;
  lastTopUpRequest?: AccessRequest;
  adminApprovalStatus: AdminApprovalStatus;
  paymentHistory?: PaymentRecord[];
  manualPaymentRequests?: ManualPaymentRequest[];
  stopped: boolean;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
};

export type LinkRecord = {
  key: string;
  label: string;
  url: string;
  description: string;
};

export type TelegramUser = {
  id: number | string;
  username?: string;
  first_name?: string;
};

type UserMap = Record<string, UserRecord>;

function configuredDataDir(): string {
  const fromEnv = process.env.DATA_DIR?.trim();
  return fromEnv ? resolve(fromEnv) : resolve(process.cwd(), "data");
}

export const dataDir = configuredDataDir();
const usersFile = resolve(dataDir, "users.json");
const linksFile = resolve(dataDir, "links.json");
const eventsFile = resolve(dataDir, "events.jsonl");

export type BotEventName =
  | "start"
  | "age_confirmed"
  | "age_declined"
  | "mood_selected"
  | "deja_always_opened"
  | "paid_home_opened"
  | "todays_note_opened"
  | "room_opened"
  | "gallery_opened"
  | "voice_notes_opened"
  | "purchase_card_viewed"
  | "first_key_viewed"
  | "weekly_rhythm_opened"
  | "locked_door_viewed"
  | "stars_invoice_sent"
  | "stars_checkout_opened"
  | "stars_payment_success"
  | "stripe_checkout_created"
  | "stripe_checkout_opened"
  | "stripe_payment_success"
  | "stripe_webhook_received"
  | "manual_review_started"
  | "manual_payment_door_opened"
  | "manual_payment_type_selected"
  | "manual_proof_submitted"
  | "admin_approved"
  | "admin_denied"
  | "chat_credit_consumed"
  | "user_ran_out_of_credits"
  | "reup_clicked"
  | "private_drop_sent"
  | "analytics_viewed"
  | "access_expired";

type EventPayload = Record<string, string | number | boolean | undefined>;

const defaultLinks: LinkRecord[] = [
  {
    key: "website",
    label: "Official Website",
    url: "https://divinedeja.com",
    description: "The official home for Divine Deja clips, VIP access, tribute, private updates, and verified links."
  },
  {
    key: "verified_links",
    label: "Verified Links",
    url: "https://divinedeja.com/links",
    description: "Use this before trusting any profile, store, payment request, or message."
  },
  {
    key: "site_clips",
    label: "Watch Clips",
    url: "https://divinedeja.com/clips",
    description: "The official clip path from DivineDeja.com."
  },
  {
    key: "site_vip",
    label: "VIP / Custom",
    url: "https://divinedeja.com/vip",
    description: "The official request path for VIP and custom inquiries."
  },
  {
    key: "site_spoil",
    label: "Spoil Me",
    url: "https://divinedeja.com/spoil",
    description: "The official tribute path for gifts and appreciation."
  },
  {
    key: "site_access",
    label: "Private Access",
    url: "https://divinedeja.com/access",
    description: "Private updates, access notes, and official announcements."
  },
  {
    key: "site_about",
    label: "About Deja",
    url: "https://divinedeja.com/about",
    description: "About Divine Deja"
  },
  {
    key: "telegram",
    label: "Telegram",
    url: "https://t.me/dejaxx_a",
    description: "The official creator Telegram account for Deja."
  },
  {
    key: "bot",
    label: "Telegram Bot",
    url: "https://t.me/DejaWorldBot",
    description: "The official Telegram entrance to Divine Deja."
  },
  {
    key: "onlyfans",
    label: "OnlyFans",
    url: "https://onlyfans.com/tsdejavux",
    description: "The official premium page for approved Deja content."
  },
  {
    key: "iwantclips",
    label: "IWantClips",
    url: "https://iwantclips.com/store/1584177/Tsgoddessdeja",
    description: "The official IWantClips store."
  },
  {
    key: "throne",
    label: "Throne",
    url: "https://throne.com/goddessdejavux",
    description: "The official wishlist for gifts and offerings."
  },
  {
    key: "manyvids",
    label: "ManyVids",
    url: "https://www.manyvids.com/Profile/1008336502/tsdejavu/Store/Videos",
    description: "The official ManyVids store."
  },
  {
    key: "cashapp",
    label: "CashApp",
    url: "https://cash.app/Dasiaamess",
    description: "The verified CashApp tribute link from DivineDeja.com."
  },
  {
    key: "paypal",
    label: "PayPal",
    url: "https://paypal.me/Darinamess",
    description: "The verified PayPal link for direct Telegram requests."
  },
  {
    key: "venmo",
    label: "Venmo",
    url: "https://venmo.com/Dejjavu",
    description: "The verified Venmo tribute link from DivineDeja.com."
  },
  {
    key: "x",
    label: "X / Twitter",
    url: "https://x.com/spoildeja?s=20",
    description: "The official X page for Deja updates."
  },
  {
    key: "gallery",
    label: "Gallery",
    url: "https://divinedeja.com/gallery",
    description: "A polished glimpse into the official Divine Deja world."
  }
];

async function ensureParent(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

async function writeJson<T>(filePath: string, value: T): Promise<void> {
  await ensureParent(filePath);
  try {
    await copyFile(filePath, `${filePath}.bak`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  await ensureParent(filePath);

  try {
    const raw = await readFile(filePath, "utf8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await writeJson(filePath, fallback);
      return fallback;
    }
    throw error;
  }
}

function cleanEventPayload(payload: EventPayload = {}): EventPayload {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    })
  );
}

export async function logEvent(
  event: BotEventName,
  details: EventPayload & { userId?: number | string } = {}
): Promise<void> {
  try {
    await mkdir(dataDir, { recursive: true });
    const record = {
      event,
      createdAt: new Date().toISOString(),
      ...cleanEventPayload({
        ...details,
        userId: details.userId === undefined ? undefined : String(details.userId)
      })
    };

    await appendFile(eventsFile, `${JSON.stringify(record)}\n`, "utf8");
  } catch {
    // Event tracking should never interrupt the bot experience.
  }
}

const funnelEvents: BotEventName[] = [
  "start",
  "age_confirmed",
  "mood_selected",
  "deja_always_opened",
  "first_key_viewed",
  "weekly_rhythm_opened",
  "purchase_card_viewed",
  "stars_checkout_opened",
  "stars_invoice_sent",
  "stars_payment_success",
  "stripe_checkout_created",
  "stripe_checkout_opened",
  "stripe_payment_success",
  "manual_payment_door_opened",
  "manual_review_started",
  "manual_payment_type_selected",
  "manual_proof_submitted",
  "locked_door_viewed",
  "voice_notes_opened",
  "gallery_opened",
  "chat_credit_consumed",
  "user_ran_out_of_credits"
];

function zeroFunnelCounts(): Record<string, number> {
  return Object.fromEntries(funnelEvents.map((event) => [event, 0]));
}

function addFunnelCount(counts: Record<string, number>, event: string): void {
  counts[event] = (counts[event] ?? 0) + 1;
}

export async function getFunnelSummary(now = new Date()): Promise<FunnelSummary> {
  const summary: FunnelSummary = {
    last24Hours: zeroFunnelCounts(),
    last7Days: zeroFunnelCounts(),
    total: zeroFunnelCounts()
  };

  let raw = "";
  try {
    raw = await readFile(eventsFile, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return summary;
    throw error;
  }

  const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const tracked = new Set<string>(funnelEvents);

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;

    try {
      const record = JSON.parse(line) as { event?: string; createdAt?: string };
      if (!record.event || !tracked.has(record.event)) continue;

      const createdAt = new Date(record.createdAt ?? "").getTime();
      addFunnelCount(summary.total, record.event);

      if (Number.isFinite(createdAt) && createdAt >= weekAgo) {
        addFunnelCount(summary.last7Days, record.event);
      }

      if (Number.isFinite(createdAt) && createdAt >= dayAgo) {
        addFunnelCount(summary.last24Hours, record.event);
      }
    } catch {
      // Keep analytics resilient if an event line is ever partially written.
    }
  }

  return summary;
}

function normalizeUserRecord(record: UserRecord): UserRecord {
  return {
    ...record,
    ...(record.conversationVibe ? { conversationVibe: record.conversationVibe } : {}),
    ...(record.lastRoomVisited ? { lastRoomVisited: record.lastRoomVisited } : {}),
    ...(record.lastGalleryCategory ? { lastGalleryCategory: record.lastGalleryCategory } : {}),
    ...(record.lastVoiceNoteCategory ? { lastVoiceNoteCategory: record.lastVoiceNoteCategory } : {}),
    ...(record.lastPurchaseOfferId ? { lastPurchaseOfferId: record.lastPurchaseOfferId } : {}),
    currentAccessType: record.currentAccessType ?? "none",
    messageCredits: Number.isFinite(record.messageCredits) ? record.messageCredits : 0,
    membershipStatus: record.membershipStatus ?? "none",
    adminApprovalStatus: record.adminApprovalStatus ?? "none",
    paymentHistory: Array.isArray(record.paymentHistory) ? record.paymentHistory : [],
    manualPaymentRequests: Array.isArray(record.manualPaymentRequests) ? record.manualPaymentRequests : []
  };
}

function accessFields(existing: UserRecord | undefined): Pick<
  UserRecord,
  | "conversationVibe"
  | "lastRoomVisited"
  | "lastGalleryCategory"
  | "lastVoiceNoteCategory"
  | "lastPurchaseOfferId"
  | "currentAccessType"
  | "messageCredits"
  | "membershipStatus"
  | "adminApprovalStatus"
  | "membershipExpiresAt"
  | "lastTopUpRequest"
  | "paymentHistory"
  | "manualPaymentRequests"
> {
  const normalized = existing ? normalizeUserRecord(existing) : undefined;

  return {
    ...(normalized?.conversationVibe ? { conversationVibe: normalized.conversationVibe } : {}),
    ...(normalized?.lastRoomVisited ? { lastRoomVisited: normalized.lastRoomVisited } : {}),
    ...(normalized?.lastGalleryCategory ? { lastGalleryCategory: normalized.lastGalleryCategory } : {}),
    ...(normalized?.lastVoiceNoteCategory ? { lastVoiceNoteCategory: normalized.lastVoiceNoteCategory } : {}),
    ...(normalized?.lastPurchaseOfferId ? { lastPurchaseOfferId: normalized.lastPurchaseOfferId } : {}),
    currentAccessType: normalized?.currentAccessType ?? "none",
    messageCredits: normalized?.messageCredits ?? 0,
    membershipStatus: normalized?.membershipStatus ?? "none",
    adminApprovalStatus: normalized?.adminApprovalStatus ?? "none",
    ...(normalized?.membershipExpiresAt ? { membershipExpiresAt: normalized.membershipExpiresAt } : {}),
    ...(normalized?.lastTopUpRequest ? { lastTopUpRequest: normalized.lastTopUpRequest } : {}),
    paymentHistory: normalized?.paymentHistory ?? [],
    manualPaymentRequests: normalized?.manualPaymentRequests ?? []
  };
}

export async function ensureStorage(): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  await readJson<UserMap>(usersFile, {});
  await readJson<LinkRecord[]>(linksFile, defaultLinks);
}

export async function getUsers(): Promise<UserMap> {
  const users = await readJson<UserMap>(usersFile, {});
  return Object.fromEntries(Object.entries(users).map(([id, user]) => [id, normalizeUserRecord(user)]));
}

export async function getUser(telegramId: number | string): Promise<UserRecord | undefined> {
  const users = await getUsers();
  return users[String(telegramId)];
}

export async function saveUsers(users: UserMap): Promise<void> {
  await writeJson(usersFile, users);
}

export async function upsertUser(user: TelegramUser | undefined): Promise<UserRecord | undefined> {
  if (!user) return undefined;

  const users = await getUsers();
  const telegramId = String(user.id);
  const now = new Date().toISOString();
  const existing = users[telegramId];

  const record: UserRecord = {
    telegramId,
    username: user.username,
    firstName: user.first_name,
    mood: existing?.mood ?? "balanced",
    ...accessFields(existing),
    stopped: existing?.stopped ?? false,
    messageCount: (existing?.messageCount ?? 0) + 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now
  };

  users[telegramId] = record;
  await saveUsers(users);
  return record;
}

export async function setUserMood(telegramId: number | string, mood: Mood): Promise<void> {
  const users = await getUsers();
  const id = String(telegramId);
  const existing = users[id];
  const now = new Date().toISOString();

  users[id] = {
    telegramId: id,
    ...(existing?.username ? { username: existing.username } : {}),
    ...(existing?.firstName ? { firstName: existing.firstName } : {}),
    mood,
    ...accessFields(existing),
    stopped: existing?.stopped ?? false,
    messageCount: existing?.messageCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
}

export async function setUserConversationVibe(telegramId: number | string, conversationVibe: ConversationVibe): Promise<void> {
  const users = await getUsers();
  const id = String(telegramId);
  const existing = users[id];
  const now = new Date().toISOString();

  users[id] = {
    telegramId: id,
    ...(existing?.username ? { username: existing.username } : {}),
    ...(existing?.firstName ? { firstName: existing.firstName } : {}),
    mood: existing?.mood ?? "balanced",
    ...accessFields(existing),
    conversationVibe,
    stopped: existing?.stopped ?? false,
    messageCount: existing?.messageCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
}

export async function setUserStopped(telegramId: number | string, stopped: boolean): Promise<void> {
  const users = await getUsers();
  const id = String(telegramId);
  const existing = users[id];
  const now = new Date().toISOString();

  users[id] = {
    telegramId: id,
    ...(existing?.username ? { username: existing.username } : {}),
    ...(existing?.firstName ? { firstName: existing.firstName } : {}),
    mood: existing?.mood ?? "balanced",
    ...accessFields(existing),
    stopped,
    messageCount: existing?.messageCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
}

export async function deleteUser(telegramId: number | string): Promise<void> {
  const users = await getUsers();
  delete users[String(telegramId)];
  await saveUsers(users);
}

export async function getStats(): Promise<{ knownUsers: number; activeUsers: number; stoppedUsers: number }> {
  const users = Object.values(await getUsers());
  const stoppedUsers = users.filter((user) => user.stopped).length;

  return {
    knownUsers: users.length,
    activeUsers: users.length - stoppedUsers,
    stoppedUsers
  };
}

export async function getBroadcastRecipients(): Promise<UserRecord[]> {
  return Object.values(await getUsers()).filter((user) => !user.stopped);
}

export async function getLinks(): Promise<LinkRecord[]> {
  return readJson<LinkRecord[]>(linksFile, defaultLinks);
}

function membershipIsExpired(user: UserRecord, now = new Date()): boolean {
  if (!user.membershipExpiresAt) return false;
  const expiresAt = new Date(user.membershipExpiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= now.getTime();
}

export function effectiveMembershipStatus(user: UserRecord | undefined, now = new Date()): MembershipStatus {
  if (!user) return "none";
  if (user.membershipStatus === "approved" && user.currentAccessType !== "none" && membershipIsExpired(user, now)) {
    return "expired";
  }
  return user.membershipStatus;
}

export function hasActiveMembership(user: UserRecord | undefined, now = new Date()): boolean {
  if (!user || effectiveMembershipStatus(user, now) !== "approved" || user.currentAccessType === "none") return false;
  if (!user.membershipExpiresAt) return true;
  return new Date(user.membershipExpiresAt).getTime() > now.getTime();
}

export function hasChatAccess(user: UserRecord | undefined): boolean {
  return hasActiveMembership(user) || (user?.messageCredits ?? 0) > 0;
}

export async function expireStaleMemberships(now = new Date()): Promise<{ expired: number; users: UserRecord[] }> {
  const users = await getUsers();
  const expiredUsers: UserRecord[] = [];
  const nowIso = now.toISOString();

  for (const [id, user] of Object.entries(users)) {
    if (user.membershipStatus !== "approved" || user.currentAccessType === "none" || !membershipIsExpired(user, now)) {
      continue;
    }

    users[id] = {
      ...user,
      membershipStatus: "expired",
      updatedAt: nowIso
    };
    expiredUsers.push(users[id]);
  }

  if (expiredUsers.length > 0) {
    await saveUsers(users);

    for (const user of expiredUsers.slice(0, 100)) {
      await logEvent("access_expired", { userId: user.telegramId, accessType: user.currentAccessType });
    }
  }

  return { expired: expiredUsers.length, users: expiredUsers };
}

function paymentCreatedAt(payment: PaymentRecord): number {
  const createdAt = new Date(payment.createdAt).getTime();
  return Number.isFinite(createdAt) ? createdAt : 0;
}

export async function getRecentPayments(limit = 10): Promise<PaymentRecord[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
  const users = Object.values(await getUsers());

  return users
    .flatMap((user) => user.paymentHistory ?? [])
    .sort((left, right) => paymentCreatedAt(right) - paymentCreatedAt(left))
    .slice(0, safeLimit);
}

export async function getUserPayments(telegramId: number | string): Promise<PaymentRecord[]> {
  const user = await getUser(telegramId);

  return [...(user?.paymentHistory ?? [])].sort((left, right) => paymentCreatedAt(right) - paymentCreatedAt(left));
}

export async function getPrivateDropRecipients(tier: PrivateDropTier): Promise<UserRecord[]> {
  const users = Object.values(await getUsers()).filter((user) => !user.stopped);

  if (tier === "none") return [];
  if (tier === "all_paid") {
    return users.filter((user) => hasActiveMembership(user) || user.messageCredits > 0);
  }
  if (tier === "credits") {
    return users.filter((user) => user.messageCredits > 0);
  }

  return users.filter((user) => hasActiveMembership(user) && user.currentAccessType === tier);
}

export async function getAnalyticsSummary(now = new Date()): Promise<AnalyticsSummary> {
  const users = Object.values(await getUsers());
  const stoppedUsers = users.filter((user) => user.stopped).length;
  const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;
  const payments = users.flatMap((user) => user.paymentHistory ?? []);
  const manualRequests = users.flatMap((user) => user.manualPaymentRequests ?? []);
  const accessCounts: Record<AccessType, number> = { none: 0, girlfriend: 0, goddess: 0, vip: 0 };
  const membershipStatusCounts: Record<MembershipStatus, number> = {
    none: 0,
    pending: 0,
    approved: 0,
    expired: 0,
    removed: 0
  };
  const offerCounts = new Map<string, { count: number; stars: number }>();

  for (const user of users) {
    const membershipStatus = effectiveMembershipStatus(user, now);
    membershipStatusCounts[membershipStatus] += 1;

    if (hasActiveMembership(user, now)) {
      accessCounts[user.currentAccessType] += 1;
    } else {
      accessCounts.none += 1;
    }
  }

  for (const payment of payments) {
    const existing = offerCounts.get(payment.offerId) ?? { count: 0, stars: 0 };
    offerCounts.set(payment.offerId, {
      count: existing.count + 1,
      stars: existing.stars + (payment.stars ?? 0)
    });
  }

  return {
    knownUsers: users.length,
    activeUsers: users.length - stoppedUsers,
    stoppedUsers,
    seenLast24Hours: users.filter((user) => new Date(user.lastSeenAt).getTime() >= dayAgo).length,
    activeMemberships: users.filter((user) => hasActiveMembership(user, now)).length,
    expiredMemberships: users.filter((user) => effectiveMembershipStatus(user, now) === "expired").length,
    creditedUsers: users.filter((user) => !hasActiveMembership(user, now) && user.messageCredits > 0).length,
    pendingManualRequests: manualRequests.filter((request) => request.status === "pending").length,
    approvedManualRequests: manualRequests.filter((request) => request.status === "approved").length,
    deniedManualRequests: manualRequests.filter((request) => request.status === "denied").length,
    successfulStarsPayments: payments.filter(
      (payment) => payment.delivered && !payment.refunded && (payment.provider ?? "telegram_stars") === "telegram_stars"
    ).length,
    totalStarsCollected: payments
      .filter((payment) => payment.delivered && !payment.refunded && (payment.provider ?? "telegram_stars") === "telegram_stars")
      .reduce((sum, payment) => sum + (payment.stars ?? 0), 0),
    successfulStripePayments: payments.filter((payment) => payment.delivered && !payment.refunded && payment.provider === "stripe").length,
    totalStripeRevenueCents: payments
      .filter((payment) => payment.delivered && !payment.refunded && payment.provider === "stripe")
      .reduce((sum, payment) => sum + (payment.amountCents ?? 0), 0),
    accessCounts,
    membershipStatusCounts,
    topOffers: [...offerCounts.entries()]
      .map(([offerId, value]) => ({ offerId, count: value.count, stars: value.stars }))
      .sort((left, right) => right.count - left.count || right.stars - left.stars)
      .slice(0, 5)
  };
}

export async function consumeChatCredit(telegramId: number | string): Promise<UserRecord | undefined> {
  const users = await getUsers();
  const id = String(telegramId);
  const existing = users[id];
  if (!existing) return undefined;

  if (hasActiveMembership(existing)) return existing;
  if (existing.messageCredits <= 0) return existing;

  const now = new Date().toISOString();
  users[id] = {
    ...existing,
    messageCredits: existing.messageCredits - 1,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
  return users[id];
}

function membershipExpiration(days = 30, existingExpiresAt?: string): string {
  const existingExpires = existingExpiresAt ? new Date(existingExpiresAt).getTime() : NaN;
  const expires = Number.isFinite(existingExpires) && existingExpires > Date.now() ? new Date(existingExpires) : new Date();
  expires.setUTCDate(expires.getUTCDate() + days);
  return expires.toISOString();
}

function manualAccessType(selectedType: ManualPaymentType): AccessType | undefined {
  if (selectedType === "girlfriend" || selectedType === "goddess" || selectedType === "vip") return selectedType;
  if (selectedType === "private") return "vip";
  return undefined;
}

function latestManualRequestForAccess(
  existing: UserRecord | undefined,
  accessType: AccessType,
  statuses: ManualPaymentStatus[]
): ManualPaymentRequest | undefined {
  return [...(existing?.manualPaymentRequests ?? [])]
    .reverse()
    .find((request) => statuses.includes(request.status) && manualAccessType(request.selectedType) === accessType);
}

function manualRequestWasRecorded(existing: UserRecord | undefined, requestId: string | undefined): boolean {
  if (!requestId) return false;
  return (existing?.paymentHistory ?? []).some((payment) => payment.provider === "manual" && payment.manualRequestId === requestId);
}

function markManualRequestApproved(
  existing: UserRecord | undefined,
  approvedRequestId: string | undefined,
  approveAllPendingIfMissing = false
): Pick<UserRecord, "manualPaymentRequests"> {
  const requests = existing?.manualPaymentRequests ?? [];
  if (!approvedRequestId) {
    return approveAllPendingIfMissing ? markPendingManualRequests(existing, "approved") : { manualPaymentRequests: requests };
  }

  return {
    manualPaymentRequests: requests.map((request) => {
      return request.requestId === approvedRequestId ? { ...request, status: "approved" as const } : request;
    })
  };
}

function accessOfferId(accessType: AccessType): string | undefined {
  if (accessType === "girlfriend") return "girlfriend_access";
  if (accessType === "goddess") return "goddess_access";
  if (accessType === "vip") return "vip_deja";
  return undefined;
}

type ManualApprovalOptions = {
  adminId?: number | string;
  durationDays?: number;
  offerId?: string;
  label?: string;
  usdReference?: string;
  recordManualPayment?: boolean;
};

function markPendingManualRequests(
  existing: UserRecord | undefined,
  status: ManualPaymentStatus
): Pick<UserRecord, "manualPaymentRequests"> {
  const requests = existing?.manualPaymentRequests ?? [];
  return {
    manualPaymentRequests: requests.map((request) => {
      return request.status === "pending" ? { ...request, status } : request;
    })
  };
}

export async function approveUserAccess(
  telegramId: number | string,
  accessType: AccessType,
  options: ManualApprovalOptions = {}
): Promise<UserRecord> {
  const users = await getUsers();
  const id = String(telegramId);
  const now = new Date().toISOString();
  const existing = users[id];
  const offerId = options.offerId ?? accessOfferId(accessType);
  const pendingManual = latestManualRequestForAccess(existing, accessType, ["pending"]);
  const matchedManual = pendingManual ?? latestManualRequestForAccess(existing, accessType, ["approved"]);
  const alreadyRecordedManual = manualRequestWasRecorded(existing, matchedManual?.requestId);
  const shouldRecordManualPayment = Boolean(options.recordManualPayment && offerId && !alreadyRecordedManual);
  const expiresAt =
    accessType === "none"
      ? undefined
      : alreadyRecordedManual && existing?.membershipExpiresAt
        ? existing.membershipExpiresAt
        : membershipExpiration(options.durationDays ?? 30, existing?.membershipExpiresAt);
  const paidRequest: AccessRequest | undefined =
    shouldRecordManualPayment && offerId
      ? {
          kind: "membership",
          optionKey: offerId,
          label: options.label ?? offerId,
          ...(options.usdReference ? { price: options.usdReference } : {}),
          accessType,
          requestedAt: now,
          status: "approved"
        }
      : existing?.lastTopUpRequest
        ? { ...existing.lastTopUpRequest, status: "approved" as const }
        : undefined;

  const manualPayment: PaymentRecord | undefined =
    shouldRecordManualPayment && offerId
      ? {
          userId: id,
          offerId,
          provider: "manual",
          ...(options.usdReference ? { usdReference: options.usdReference } : {}),
          ...(matchedManual ? { manualRequestId: matchedManual.requestId, manualPaymentType: matchedManual.selectedType } : {}),
          ...(options.adminId ? { approvedByAdminId: String(options.adminId) } : {}),
          payload: matchedManual ? `manual:${matchedManual.requestId}` : `manual_admin:${id}:${offerId}:${now}`,
          createdAt: now,
          delivered: true,
          deliveryResult: expiresAt ? `Opened ${accessType} access until ${expiresAt}` : `Opened ${accessType} access`,
          refunded: false
        }
      : undefined;
  const history = existing?.paymentHistory ?? [];

  users[id] = {
    telegramId: id,
    ...(existing?.username ? { username: existing.username } : {}),
    ...(existing?.firstName ? { firstName: existing.firstName } : {}),
    mood: existing?.mood ?? "balanced",
    ...accessFields(existing),
    currentAccessType: accessType,
    membershipStatus: accessType === "none" ? "none" : "approved",
    ...(expiresAt ? { membershipExpiresAt: expiresAt } : {}),
    adminApprovalStatus: "approved",
    ...(offerId ? { lastPurchaseOfferId: offerId } : {}),
    ...(paidRequest ? { lastTopUpRequest: paidRequest } : {}),
    ...(manualPayment ? { paymentHistory: [...history, manualPayment].slice(-75) } : {}),
    ...markManualRequestApproved(existing, pendingManual?.requestId, !options.recordManualPayment),
    stopped: existing?.stopped ?? false,
    messageCount: existing?.messageCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
  return users[id];
}

export async function addUserCredits(telegramId: number | string, credits: number): Promise<UserRecord> {
  const users = await getUsers();
  const id = String(telegramId);
  const now = new Date().toISOString();
  const existing = users[id];

  users[id] = {
    telegramId: id,
    ...(existing?.username ? { username: existing.username } : {}),
    ...(existing?.firstName ? { firstName: existing.firstName } : {}),
    mood: existing?.mood ?? "balanced",
    ...accessFields(existing),
    messageCredits: Math.max(0, (existing?.messageCredits ?? 0) + credits),
    adminApprovalStatus: "approved",
    ...(existing?.lastTopUpRequest
      ? { lastTopUpRequest: { ...existing.lastTopUpRequest, status: "approved" as const } }
      : {}),
    ...markPendingManualRequests(existing, "approved"),
    stopped: existing?.stopped ?? false,
    messageCount: existing?.messageCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
  return users[id];
}

export async function denyPendingManualRequest(telegramId: number | string): Promise<UserRecord> {
  const users = await getUsers();
  const id = String(telegramId);
  const now = new Date().toISOString();
  const existing = users[id];
  const manualPaymentRequests = existing?.manualPaymentRequests ?? [];
  let deniedOne = false;

  const updatedRequests = [...manualPaymentRequests].reverse().map((request) => {
    if (!deniedOne && request.status === "pending") {
      deniedOne = true;
      return { ...request, status: "denied" as const };
    }
    return request;
  }).reverse();

  users[id] = {
    telegramId: id,
    ...(existing?.username ? { username: existing.username } : {}),
    ...(existing?.firstName ? { firstName: existing.firstName } : {}),
    mood: existing?.mood ?? "balanced",
    ...accessFields(existing),
    adminApprovalStatus: "denied",
    ...(existing?.lastTopUpRequest?.status === "pending"
      ? { lastTopUpRequest: { ...existing.lastTopUpRequest, status: "denied" as const } }
      : {}),
    manualPaymentRequests: updatedRequests,
    stopped: existing?.stopped ?? false,
    messageCount: existing?.messageCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
  return users[id];
}

export async function recordPaidCredits(
  telegramId: number | string,
  credits: number,
  request: Omit<AccessRequest, "requestedAt" | "status">
): Promise<UserRecord> {
  const users = await getUsers();
  const id = String(telegramId);
  const now = new Date().toISOString();
  const existing = users[id];

  const paidRequest: AccessRequest = {
    ...request,
    requestedAt: now,
    status: "approved"
  };

  users[id] = {
    telegramId: id,
    ...(existing?.username ? { username: existing.username } : {}),
    ...(existing?.firstName ? { firstName: existing.firstName } : {}),
    mood: existing?.mood ?? "balanced",
    ...accessFields(existing),
    messageCredits: Math.max(0, (existing?.messageCredits ?? 0) + credits),
    lastTopUpRequest: paidRequest,
    adminApprovalStatus: "approved",
    stopped: existing?.stopped ?? false,
    messageCount: existing?.messageCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
  return users[id];
}

export async function recordPendingAccessRequest(
  telegramId: number | string,
  request: Omit<AccessRequest, "requestedAt" | "status">
): Promise<UserRecord> {
  const users = await getUsers();
  const id = String(telegramId);
  const now = new Date().toISOString();
  const existing = users[id];

  const pendingRequest: AccessRequest = {
    ...request,
    requestedAt: now,
    status: "pending"
  };

  users[id] = {
    telegramId: id,
    ...(existing?.username ? { username: existing.username } : {}),
    ...(existing?.firstName ? { firstName: existing.firstName } : {}),
    mood: existing?.mood ?? "balanced",
    ...accessFields(existing),
    lastTopUpRequest: pendingRequest,
    adminApprovalStatus: "pending",
    stopped: existing?.stopped ?? false,
    messageCount: existing?.messageCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
  return users[id];
}

export async function recordPaidMembership(
  telegramId: number | string,
  accessType: AccessType,
  days: number,
  request: Omit<AccessRequest, "requestedAt" | "status">
): Promise<UserRecord> {
  const users = await getUsers();
  const id = String(telegramId);
  const now = new Date().toISOString();
  const existing = users[id];

  const paidRequest: AccessRequest = {
    ...request,
    requestedAt: now,
    status: "approved"
  };

  users[id] = {
    telegramId: id,
    ...(existing?.username ? { username: existing.username } : {}),
    ...(existing?.firstName ? { firstName: existing.firstName } : {}),
    mood: existing?.mood ?? "balanced",
    ...accessFields(existing),
    currentAccessType: accessType,
    membershipStatus: "approved",
    membershipExpiresAt: membershipExpiration(days),
    lastTopUpRequest: paidRequest,
    adminApprovalStatus: "approved",
    stopped: existing?.stopped ?? false,
    messageCount: existing?.messageCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
  return users[id];
}

export type StarsPaymentDeliveryInput = {
  offerId: string;
  stars: number;
  usdReference?: string;
  telegramPaymentChargeId: string;
  providerPaymentChargeId?: string;
  payload: string;
  credits?: number;
  accessType?: AccessType;
  durationDays?: number;
  request: Omit<AccessRequest, "requestedAt" | "status">;
};

export async function recordStarsPaymentDelivery(
  telegramId: number | string,
  input: StarsPaymentDeliveryInput
): Promise<{ user: UserRecord; payment: PaymentRecord; alreadyProcessed: boolean }> {
  const users = await getUsers();
  const id = String(telegramId);
  const now = new Date().toISOString();
  const existing = users[id];
  const history = existing?.paymentHistory ?? [];
  const processed = history.find((payment) => payment.telegramPaymentChargeId === input.telegramPaymentChargeId);

  if (processed && existing) {
    return { user: existing, payment: processed, alreadyProcessed: true };
  }

  const paidRequest: AccessRequest = {
    ...input.request,
    requestedAt: now,
    status: "approved"
  };

  const payment: PaymentRecord = {
    userId: id,
    offerId: input.offerId,
    provider: "telegram_stars",
    stars: input.stars,
    ...(input.usdReference ? { usdReference: input.usdReference } : {}),
    telegramPaymentChargeId: input.telegramPaymentChargeId,
    ...(input.providerPaymentChargeId ? { providerPaymentChargeId: input.providerPaymentChargeId } : {}),
    payload: input.payload,
    createdAt: now,
    delivered: true,
    deliveryResult: input.credits
      ? `Added ${input.credits} message credits`
      : input.accessType
        ? `Opened ${input.accessType} access`
        : "Payment recorded",
    refunded: false
  };

  users[id] = {
    telegramId: id,
    ...(existing?.username ? { username: existing.username } : {}),
    ...(existing?.firstName ? { firstName: existing.firstName } : {}),
    mood: existing?.mood ?? "balanced",
    ...accessFields(existing),
    ...(input.credits ? { messageCredits: Math.max(0, (existing?.messageCredits ?? 0) + input.credits) } : {}),
    ...(input.accessType
      ? {
          currentAccessType: input.accessType,
          membershipStatus: "approved" as const,
          membershipExpiresAt: membershipExpiration(input.durationDays ?? 30)
        }
      : {}),
    lastPurchaseOfferId: input.offerId,
    lastTopUpRequest: paidRequest,
    adminApprovalStatus: "approved",
    paymentHistory: [...history, payment].slice(-75),
    stopped: existing?.stopped ?? false,
    messageCount: existing?.messageCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
  return { user: users[id], payment, alreadyProcessed: false };
}

export type StripePaymentDeliveryInput = {
  offerId: string;
  amountCents: number;
  currency: string;
  usdReference?: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string;
  payload: string;
  credits?: number;
  accessType?: AccessType;
  durationDays?: number;
  request: Omit<AccessRequest, "requestedAt" | "status">;
};

export async function recordStripePaymentDelivery(
  telegramId: number | string,
  input: StripePaymentDeliveryInput
): Promise<{ user: UserRecord; payment: PaymentRecord; alreadyProcessed: boolean }> {
  const users = await getUsers();
  const id = String(telegramId);
  const now = new Date().toISOString();
  const existing = users[id];
  const history = existing?.paymentHistory ?? [];
  const processed = history.find((payment) => payment.stripeCheckoutSessionId === input.stripeCheckoutSessionId);

  if (processed && existing) {
    return { user: existing, payment: processed, alreadyProcessed: true };
  }

  const paidRequest: AccessRequest = {
    ...input.request,
    requestedAt: now,
    status: "approved"
  };

  const payment: PaymentRecord = {
    userId: id,
    offerId: input.offerId,
    provider: "stripe",
    amountCents: input.amountCents,
    currency: input.currency.toLowerCase(),
    ...(input.usdReference ? { usdReference: input.usdReference } : {}),
    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    ...(input.stripePaymentIntentId ? { stripePaymentIntentId: input.stripePaymentIntentId } : {}),
    payload: input.payload,
    createdAt: now,
    delivered: true,
    deliveryResult: input.credits
      ? `Added ${input.credits} message credits`
      : input.accessType
        ? `Opened ${input.accessType} access`
        : "Payment recorded",
    refunded: false
  };

  users[id] = {
    telegramId: id,
    ...(existing?.username ? { username: existing.username } : {}),
    ...(existing?.firstName ? { firstName: existing.firstName } : {}),
    mood: existing?.mood ?? "balanced",
    ...accessFields(existing),
    ...(input.credits ? { messageCredits: Math.max(0, (existing?.messageCredits ?? 0) + input.credits) } : {}),
    ...(input.accessType
      ? {
          currentAccessType: input.accessType,
          membershipStatus: "approved" as const,
          membershipExpiresAt: membershipExpiration(input.durationDays ?? 30)
        }
      : {}),
    lastPurchaseOfferId: input.offerId,
    lastTopUpRequest: paidRequest,
    adminApprovalStatus: "approved",
    paymentHistory: [...history, payment].slice(-75),
    stopped: existing?.stopped ?? false,
    messageCount: existing?.messageCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
  return { user: users[id], payment, alreadyProcessed: false };
}

export async function createManualPaymentRequest(
  user: TelegramUser,
  selectedType: ManualPaymentType,
  details: { note?: string; attachmentFileId?: string }
): Promise<{ user: UserRecord; request: ManualPaymentRequest }> {
  const users = await getUsers();
  const id = String(user.id);
  const now = new Date().toISOString();
  const existing = users[id];
  const request: ManualPaymentRequest = {
    requestId: `manual_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
    userId: id,
    ...(user.username ? { username: user.username } : existing?.username ? { username: existing.username } : {}),
    selectedType,
    ...(details.note ? { note: details.note } : {}),
    ...(details.attachmentFileId ? { attachmentFileId: details.attachmentFileId } : {}),
    createdAt: now,
    status: "pending"
  };

  users[id] = {
    telegramId: id,
    username: user.username ?? existing?.username,
    firstName: user.first_name ?? existing?.firstName,
    mood: existing?.mood ?? "balanced",
    ...accessFields(existing),
    adminApprovalStatus: "pending",
    manualPaymentRequests: [...(existing?.manualPaymentRequests ?? []), request].slice(-25),
    stopped: existing?.stopped ?? false,
    messageCount: existing?.messageCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
  return { user: users[id], request };
}

export async function setUserMemory(
  telegramId: number | string,
  memory: Partial<Pick<UserRecord, "lastRoomVisited" | "lastGalleryCategory" | "lastVoiceNoteCategory" | "lastPurchaseOfferId">>
): Promise<UserRecord | undefined> {
  const users = await getUsers();
  const id = String(telegramId);
  const existing = users[id];
  if (!existing) return undefined;

  const now = new Date().toISOString();
  users[id] = {
    ...existing,
    ...memory,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
  return users[id];
}

export async function removeUserAccess(telegramId: number | string): Promise<UserRecord> {
  const users = await getUsers();
  const id = String(telegramId);
  const now = new Date().toISOString();
  const existing = users[id];

  users[id] = {
    telegramId: id,
    ...(existing?.username ? { username: existing.username } : {}),
    ...(existing?.firstName ? { firstName: existing.firstName } : {}),
    mood: existing?.mood ?? "balanced",
    currentAccessType: "none",
    messageCredits: 0,
    membershipStatus: "removed",
    adminApprovalStatus: "removed",
    ...(existing?.lastTopUpRequest
      ? { lastTopUpRequest: { ...existing.lastTopUpRequest, status: "removed" as const } }
      : {}),
    ...markPendingManualRequests(existing, "denied"),
    stopped: existing?.stopped ?? false,
    messageCount: existing?.messageCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now
  };

  await saveUsers(users);
  return users[id];
}

export async function getPendingAccessUsers(): Promise<UserRecord[]> {
  return Object.values(await getUsers()).filter((user) => {
    return (
      user.adminApprovalStatus === "pending" ||
      user.lastTopUpRequest?.status === "pending" ||
      user.manualPaymentRequests?.some((request) => request.status === "pending")
    );
  });
}
