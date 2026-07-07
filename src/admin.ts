import { InlineKeyboard, type Bot, type Context } from "grammy";
import { randomBytes } from "node:crypto";
import { isAdminTelegramId } from "./config.js";
import {
  type AccessRequestKind,
  addUserCredits,
  approveUserAccess,
  denyPendingManualRequest,
  effectiveMembershipStatus,
  expireStaleMemberships,
  getAnalyticsSummary,
  getBroadcastRecipients,
  getPendingAccessUsers,
  getPrivateDropRecipients,
  getRecentPayments,
  getStats,
  getUser,
  getUserPayments,
  logEvent,
  removeUserAccess,
  type AccessType,
  type AnalyticsSummary,
  type PaymentRecord,
  type PrivateDropTier,
  type UserRecord
} from "./storage.js";

type PendingBroadcast = {
  adminId: string;
  message: string;
  createdAt: number;
};

type PendingPrivateDrop = PendingBroadcast & {
  tier: PrivateDropTier;
};

const pendingBroadcasts = new Map<string, PendingBroadcast>();
const pendingPrivateDrops = new Map<string, PendingPrivateDrop>();
const broadcastTtlMs = 10 * 60 * 1000;

function isAdmin(ctx: Context): boolean {
  return isAdminTelegramId(ctx.from?.id);
}

function commandArgs(ctx: Context): string {
  return ctx.message?.text?.replace(/^\/\w+(?:@\w+)?\s*/, "").trim() ?? "";
}

function accessTypeFrom(value: string | undefined): AccessType | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "girlfriend" || normalized === "goddess" || normalized === "vip" || normalized === "none") {
    return normalized;
  }
  return undefined;
}

function formatUserStatus(user: UserRecord | undefined): string {
  if (!user) return "No local user record found.";

  const latestPayment = user.paymentHistory?.at(-1);
  const membershipStatus = effectiveMembershipStatus(user);
  const manualRequests = user.manualPaymentRequests?.length
    ? user.manualPaymentRequests
        .slice(-5)
        .map((request) => {
          return `${request.requestId}: ${request.selectedType} - ${request.status}${request.note ? ` - ${request.note}` : ""}`;
        })
        .join("\n")
    : "Manual requests: none";

  const pending = user.lastTopUpRequest
    ? [
        `Last request: ${user.lastTopUpRequest.label}`,
        `Request type: ${user.lastTopUpRequest.kind}`,
        `Request status: ${user.lastTopUpRequest.status}`,
        user.lastTopUpRequest.price ? `Price: ${user.lastTopUpRequest.price}` : undefined,
        `Requested: ${user.lastTopUpRequest.requestedAt}`
      ]
        .filter(Boolean)
        .join("\n")
    : "Last request: none";

  return [
    `User ${user.telegramId}`,
    user.username ? `Username: @${user.username}` : "Username: none",
    user.firstName ? `First name: ${user.firstName}` : undefined,
    `Access type: ${user.currentAccessType}`,
    `Message credits: ${user.messageCredits}`,
    `Membership status: ${membershipStatus}`,
    user.membershipExpiresAt ? `Expires: ${user.membershipExpiresAt}` : "Expires: none",
    `Admin approval: ${user.adminApprovalStatus}`,
    user.lastPurchaseOfferId ? `Last purchase offer: ${user.lastPurchaseOfferId}` : "Last purchase offer: none",
    latestPayment
      ? `Last Stars payment: ${latestPayment.offerId} - ${latestPayment.stars} Stars - ${latestPayment.telegramPaymentChargeId}`
      : "Last Stars payment: none",
    manualRequests,
    pending
  ]
    .filter(Boolean)
    .join("\n");
}

async function deny(ctx: Context): Promise<void> {
  await ctx.reply("This door is private.");
}

function createBroadcastId(): string {
  return randomBytes(8).toString("hex");
}

function broadcastKeyboard(id: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("Send Broadcast", `ADMIN_BROADCAST_CONFIRM_${id}`)
    .text("Cancel", `ADMIN_BROADCAST_CANCEL_${id}`);
}

function privateDropKeyboard(id: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("Send Private Drop", `ADMIN_DROP_CONFIRM_${id}`)
    .text("Cancel", `ADMIN_DROP_CANCEL_${id}`);
}

function accessLabel(accessType: AccessType): string {
  if (accessType === "girlfriend") return "Girlfriend";
  if (accessType === "goddess") return "Goddess";
  if (accessType === "vip") return "VIP";
  return "None";
}

function privateDropTierFrom(value: string | undefined): PrivateDropTier | undefined {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "girlfriend" ||
    normalized === "goddess" ||
    normalized === "vip" ||
    normalized === "all_paid" ||
    normalized === "credits"
  ) {
    return normalized;
  }

  return undefined;
}

function privateDropTierLabel(tier: PrivateDropTier): string {
  if (tier === "all_paid") return "All paid users";
  if (tier === "credits") return "Message-credit users";
  return `${accessLabel(tier)} Access`;
}

function shortChargeId(chargeId: string): string {
  return chargeId.length <= 10 ? chargeId : `...${chargeId.slice(-10)}`;
}

function formatPaymentLine(payment: PaymentRecord): string {
  return [
    `${payment.createdAt}`,
    `User: ${payment.userId}`,
    `Offer: ${payment.offerId}`,
    `Stars: ${payment.stars}`,
    payment.usdReference ? `Ref: ${payment.usdReference}` : undefined,
    `Charge: ${shortChargeId(payment.telegramPaymentChargeId)}`,
    payment.delivered ? "Delivered" : "Not delivered",
    payment.refunded ? "Refunded" : undefined
  ]
    .filter(Boolean)
    .join("\n");
}

function formatPayments(title: string, payments: PaymentRecord[]): string {
  if (payments.length === 0) return `${title}\n\nNo Stars payments found yet.`;

  return `${title}\n\n${payments.map(formatPaymentLine).join("\n\n")}`;
}

function formatAnalytics(summary: AnalyticsSummary, expiredCleaned: number): string {
  const topOffers = summary.topOffers.length
    ? summary.topOffers.map((offer) => `${offer.offerId}: ${offer.count} purchase(s), ${offer.stars} Stars`).join("\n")
    : "No Stars offers purchased yet.";

  return [
    "Analytics",
    "",
    `Known users: ${summary.knownUsers}`,
    `Active users: ${summary.activeUsers}`,
    `Stopped users: ${summary.stoppedUsers}`,
    `Seen in last 24h: ${summary.seenLast24Hours}`,
    "",
    `Active memberships: ${summary.activeMemberships}`,
    `Expired memberships: ${summary.expiredMemberships}`,
    `Expired keys cleaned now: ${expiredCleaned}`,
    `Credit-only users: ${summary.creditedUsers}`,
    "",
    `Pending manual reviews: ${summary.pendingManualRequests}`,
    `Approved manual reviews: ${summary.approvedManualRequests}`,
    `Denied manual reviews: ${summary.deniedManualRequests}`,
    "",
    `Successful Stars payments: ${summary.successfulStarsPayments}`,
    `Total Stars collected: ${summary.totalStarsCollected}`,
    "",
    "Active access keys:",
    `Girlfriend: ${summary.accessCounts.girlfriend}`,
    `Goddess: ${summary.accessCounts.goddess}`,
    `VIP: ${summary.accessCounts.vip}`,
    "",
    "Top offers:",
    topOffers
  ].join("\n");
}

function manualAccessType(selectedType: string | undefined): AccessType | undefined {
  if (selectedType === "girlfriend" || selectedType === "goddess" || selectedType === "vip") return selectedType;
  if (selectedType === "private") return "vip";
  return undefined;
}

function manualRequestKind(selectedType: string | undefined): AccessRequestKind {
  return selectedType === "message_credits" ? "topup" : "membership";
}

function manualTypeLabel(selectedType: string | undefined): string {
  if (selectedType === "message_credits") return "Message Credits";
  if (selectedType === "girlfriend") return "Girlfriend Access";
  if (selectedType === "goddess") return "Goddess Access";
  if (selectedType === "vip") return "VIP Access";
  if (selectedType === "private") return "Private Access";
  return "Other";
}

function latestPendingManual(user: UserRecord): NonNullable<UserRecord["manualPaymentRequests"]>[number] | undefined {
  return [...(user.manualPaymentRequests ?? [])].reverse().find((request) => request.status === "pending");
}

function pendingManualCount(users: UserRecord[]): number {
  return users.reduce((count, user) => {
    return count + (user.manualPaymentRequests ?? []).filter((request) => request.status === "pending").length;
  }, 0);
}

export function adminReviewKeyboard(
  telegramId: number | string,
  requestKind: AccessRequestKind,
  accessType?: AccessType
): InlineKeyboard {
  const userId = String(telegramId);
  const keyboard = new InlineKeyboard();

  if (requestKind === "topup") {
    keyboard.text("Add 10 messages", `ADMIN_CREDITS_${userId}_10`).row();
    keyboard.text("Add 30 messages", `ADMIN_CREDITS_${userId}_30`).row();
    keyboard.text("Add 60 messages", `ADMIN_CREDITS_${userId}_60`).row();
  } else if (accessType && accessType !== "none") {
    keyboard.text(`Approve ${accessLabel(accessType)}`, `ADMIN_APPROVE_${userId}_${accessType}`).row();
  }

  keyboard.text("Deny Review", `ADMIN_DENY_${userId}`).row();
  keyboard.text("Check Status", `ADMIN_STATUS_${userId}`);
  return keyboard;
}

function getPendingBroadcast(id: string): PendingBroadcast | undefined {
  const pending = pendingBroadcasts.get(id);

  if (!pending) return undefined;
  if (Date.now() - pending.createdAt > broadcastTtlMs) {
    pendingBroadcasts.delete(id);
    return undefined;
  }

  return pending;
}

function getPendingPrivateDrop(id: string): PendingPrivateDrop | undefined {
  const pending = pendingPrivateDrops.get(id);

  if (!pending) return undefined;
  if (Date.now() - pending.createdAt > broadcastTtlMs) {
    pendingPrivateDrops.delete(id);
    return undefined;
  }

  return pending;
}

export function registerAdminCommands(bot: Bot): void {
  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx)) {
      await deny(ctx);
      return;
    }

    const pending = await getPendingAccessUsers();
    const manualCount = pendingManualCount(pending);
    await ctx.reply(
      [
        "Admin",
        "",
        `Pending manual reviews: ${manualCount}`,
        `Pending users: ${pending.length}`,
        "",
        "Available commands:",
        "",
        "/stats - View simple bot stats",
        "/analytics - View payment, access, and user analytics",
        "/recent_payments [LIMIT] - View recent Stars payments",
        "/user_payments USER_ID - View one user's Stars payments",
        "/private_drop TIER Message text - Send a paid-tier drop after preview",
        "/expire_access - Mark stale memberships as expired",
        "/broadcast Message text - Preview a broadcast before sending it",
        "/pending - View any older pending access requests",
        "/user_status USER_ID - View access status",
        "/approve_user USER_ID ACCESS_TYPE - Manually approve girlfriend, goddess, or vip access",
        "/add_credits USER_ID NUMBER - Manually add message credits",
        "/remove_access USER_ID - Remove access and credits",
        "",
        "Private drop tiers: girlfriend, goddess, vip, all_paid, credits"
      ].join("\n")
    );
  });

  bot.command("stats", async (ctx) => {
    if (!isAdmin(ctx)) {
      await deny(ctx);
      return;
    }

    const stats = await getStats();
    await ctx.reply(
      `Stats\n\nKnown users: ${stats.knownUsers}\nActive users: ${stats.activeUsers}\nStopped users: ${stats.stoppedUsers}`
    );
  });

  bot.command("analytics", async (ctx) => {
    if (!isAdmin(ctx)) {
      await deny(ctx);
      return;
    }

    const expired = await expireStaleMemberships();
    const summary = await getAnalyticsSummary();
    await logEvent("analytics_viewed", { adminId: ctx.from?.id });
    await ctx.reply(formatAnalytics(summary, expired.expired));
  });

  bot.command("recent_payments", async (ctx) => {
    if (!isAdmin(ctx)) {
      await deny(ctx);
      return;
    }

    const limitValue = commandArgs(ctx).split(/\s+/)[0];
    const limit = limitValue ? Number(limitValue) : 10;
    if (!Number.isFinite(limit) || limit <= 0) {
      await ctx.reply("Use:\n/recent_payments\n/recent_payments 20");
      return;
    }

    const payments = await getRecentPayments(limit);
    await ctx.reply(formatPayments("Recent Stars Payments", payments));
  });

  bot.command("user_payments", async (ctx) => {
    if (!isAdmin(ctx)) {
      await deny(ctx);
      return;
    }

    const userId = commandArgs(ctx).split(/\s+/)[0];
    if (!userId || !/^\d+$/.test(userId)) {
      await ctx.reply("Use:\n/user_payments USER_ID");
      return;
    }

    const payments = await getUserPayments(userId);
    await ctx.reply(formatPayments(`Stars Payments for ${userId}`, payments));
  });

  bot.command("expire_access", async (ctx) => {
    if (!isAdmin(ctx)) {
      await deny(ctx);
      return;
    }

    const result = await expireStaleMemberships();
    const users = result.users
      .slice(0, 15)
      .map((user) => `${user.telegramId}${user.username ? ` (@${user.username})` : ""} - ${user.currentAccessType}`)
      .join("\n");

    await ctx.reply(
      result.expired === 0
        ? "No stale access keys needed cleanup."
        : `Expired access cleanup complete.\n\nMarked expired: ${result.expired}\n\n${users}`
    );
  });

  bot.command("private_drop", async (ctx) => {
    if (!isAdmin(ctx)) {
      await deny(ctx);
      return;
    }

    const args = commandArgs(ctx);
    const match = args.match(/^(\S+)\s+([\s\S]+)$/);
    const tier = privateDropTierFrom(match?.[1]);
    const message = match?.[2]?.trim();

    if (!tier || !message) {
      await ctx.reply(
        [
          "Use:",
          "/private_drop girlfriend Your message",
          "/private_drop goddess Your message",
          "/private_drop vip Your message",
          "/private_drop all_paid Your message",
          "/private_drop credits Your message",
          "",
          "I will show a preview before anything sends."
        ].join("\n")
      );
      return;
    }

    if (message.length > 3400) {
      await ctx.reply("Keep private drops under 3,400 characters so Telegram sends them cleanly.");
      return;
    }

    const recipients = await getPrivateDropRecipients(tier);
    if (recipients.length === 0) {
      await ctx.reply(`No active recipients found for ${privateDropTierLabel(tier)}.`);
      return;
    }

    const id = createBroadcastId();
    pendingPrivateDrops.set(id, {
      adminId: String(ctx.from?.id),
      tier,
      message,
      createdAt: Date.now()
    });

    await ctx.reply(
      [
        "Private drop preview",
        "",
        `Tier: ${privateDropTierLabel(tier)}`,
        `Recipients ready: ${recipients.length}`,
        "",
        message,
        "",
        "Send it only when it feels exactly right."
      ].join("\n"),
      {
        reply_markup: privateDropKeyboard(id)
      }
    );
  });

  bot.command("broadcast", async (ctx) => {
    if (!isAdmin(ctx)) {
      await deny(ctx);
      return;
    }

    const message = commandArgs(ctx);
    if (!message) {
      await ctx.reply("Use:\n/broadcast Your message here\n\nI will show a preview before anything sends.");
      return;
    }

    if (message.length > 3500) {
      await ctx.reply("Keep broadcasts under 3,500 characters so Telegram sends them cleanly.");
      return;
    }

    const recipients = await getBroadcastRecipients();
    if (recipients.length === 0) {
      await ctx.reply("There are no active users to broadcast to yet.");
      return;
    }

    const id = createBroadcastId();
    pendingBroadcasts.set(id, {
      adminId: String(ctx.from?.id),
      message,
      createdAt: Date.now()
    });

    await ctx.reply(
      `Broadcast preview\n\n${message}\n\nRecipients ready: ${recipients.length}\n\nSend it only when it feels exactly right.`,
      {
        reply_markup: broadcastKeyboard(id)
      }
    );
  });

  bot.command("approve_user", async (ctx) => {
    if (!isAdmin(ctx)) {
      await deny(ctx);
      return;
    }

    const [userId, accessValue] = commandArgs(ctx).split(/\s+/);
    const accessType = accessTypeFrom(accessValue);

    if (!userId || !/^\d+$/.test(userId) || !accessType || accessType === "none") {
      await ctx.reply("Use:\n/approve_user USER_ID girlfriend\n/approve_user USER_ID goddess\n/approve_user USER_ID vip");
      return;
    }

    const user = await approveUserAccess(userId, accessType);
    await logEvent("admin_approved", { userId, adminId: ctx.from?.id, accessType });
    await ctx.reply(`Access approved.\n\n${formatUserStatus(user)}`);

    try {
      await ctx.api.sendMessage(
        user.telegramId,
        `Your ${accessLabel(accessType)} key is open now.\n\nCome back to Deja Always. I left the door ready for you.`
      );
    } catch {
      // User may have blocked the bot or not opened it again.
    }
  });

  bot.command("add_credits", async (ctx) => {
    if (!isAdmin(ctx)) {
      await deny(ctx);
      return;
    }

    const [userId, numberValue] = commandArgs(ctx).split(/\s+/);
    const credits = Number(numberValue);

    if (!userId || !/^\d+$/.test(userId) || !Number.isInteger(credits) || credits <= 0) {
      await ctx.reply("Use:\n/add_credits USER_ID NUMBER");
      return;
    }

    const user = await addUserCredits(userId, credits);
    await logEvent("admin_approved", { userId, adminId: ctx.from?.id, credits });
    await ctx.reply(`Credits added.\n\n${formatUserStatus(user)}`);

    try {
      await ctx.api.sendMessage(
        user.telegramId,
        `Your messages are open now.\n\nCredits added: ${credits}\nMessages available: ${user.messageCredits}`
      );
    } catch {
      // User may have blocked the bot or not opened it again.
    }
  });

  bot.command("remove_access", async (ctx) => {
    if (!isAdmin(ctx)) {
      await deny(ctx);
      return;
    }

    const userId = commandArgs(ctx).split(/\s+/)[0];
    if (!userId || !/^\d+$/.test(userId)) {
      await ctx.reply("Use:\n/remove_access USER_ID");
      return;
    }

    const user = await removeUserAccess(userId);
    await ctx.reply(`Access removed.\n\n${formatUserStatus(user)}`);
  });

  bot.command("user_status", async (ctx) => {
    if (!isAdmin(ctx)) {
      await deny(ctx);
      return;
    }

    const userId = commandArgs(ctx).split(/\s+/)[0];
    if (!userId || !/^\d+$/.test(userId)) {
      await ctx.reply("Use:\n/user_status USER_ID");
      return;
    }

    await ctx.reply(formatUserStatus(await getUser(userId)));
  });

  bot.command("pending", async (ctx) => {
    if (!isAdmin(ctx)) {
      await deny(ctx);
      return;
    }

    const pending = await getPendingAccessUsers();
    if (pending.length === 0) {
      await ctx.reply("No pending access confirmations right now.");
      return;
    }

    const lines = pending.slice(0, 20).map((user) => {
      const request = user.lastTopUpRequest;
      const manual = latestPendingManual(user);
      return [
        `${user.telegramId}${user.username ? ` (@${user.username})` : ""}`,
        manual ? `Manual payment: ${manualTypeLabel(manual.selectedType)} - ${manual.requestId}` : undefined,
        manual?.note ? `Note: ${manual.note}` : undefined,
        request ? `${request.label} - ${request.kind}` : "pending",
        request?.price ? `Price: ${request.price}` : undefined,
        manual
          ? `Review with /user_status ${user.telegramId}, then approve access or add credits after confirming payment.`
          : request?.kind === "topup"
          ? `Review with /user_status ${user.telegramId} or remove with /remove_access ${user.telegramId}`
          : `Review with /user_status ${user.telegramId} or approve with /approve_user ${user.telegramId} ${request?.accessType ?? "girlfriend"}`
      ]
        .filter(Boolean)
        .join("\n");
    });

    await ctx.reply(`Pending confirmations\n\n${lines.join("\n\n")}`);

    for (const user of pending.slice(0, 5)) {
      const request = user.lastTopUpRequest;
      const manual = latestPendingManual(user);
      const requestKind = manual ? manualRequestKind(manual.selectedType) : request?.kind;
      if (!requestKind) continue;

      await ctx.reply(`Review\n\n${formatUserStatus(user)}`, {
        reply_markup: adminReviewKeyboard(
          user.telegramId,
          requestKind,
          manual ? manualAccessType(manual.selectedType) : request?.accessType
        )
      });
    }
  });

  bot.callbackQuery(/^ADMIN_APPROVE_(\d+)_(girlfriend|goddess|vip)$/, async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "Private.", show_alert: true });
      return;
    }

    const userId = ctx.match[1];
    const accessType = accessTypeFrom(ctx.match[2]);

    if (!accessType || accessType === "none") {
      await ctx.answerCallbackQuery({ text: "That access type is not available.", show_alert: true });
      return;
    }

    const user = await approveUserAccess(userId, accessType);
    await logEvent("admin_approved", { userId, adminId: ctx.from.id, accessType });
    await ctx.answerCallbackQuery({ text: `${accessLabel(accessType)} access approved.` });
    await ctx.reply(`Access approved.\n\n${formatUserStatus(user)}`);

    try {
      await ctx.api.sendMessage(
        user.telegramId,
        `Your ${accessLabel(accessType)} key is open now.\n\nCome back to Deja Always. I left the door ready for you.`
      );
    } catch {
      // User may have blocked the bot or not opened it again.
    }
  });

  bot.callbackQuery(/^ADMIN_CREDITS_(\d+)_(10|30|60)$/, async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "Private.", show_alert: true });
      return;
    }

    const userId = ctx.match[1];
    const credits = Number(ctx.match[2]);
    const user = await addUserCredits(userId, credits);
    await logEvent("admin_approved", { userId, adminId: ctx.from.id, credits });

    await ctx.answerCallbackQuery({ text: `${credits} messages added.` });
    await ctx.reply(`Credits added.\n\n${formatUserStatus(user)}`);

    try {
      await ctx.api.sendMessage(
        user.telegramId,
        `Your messages are open now.\n\nCredits added: ${credits}\nMessages available: ${user.messageCredits}`
      );
    } catch {
      // User may have blocked the bot or not opened it again.
    }
  });

  bot.callbackQuery(/^ADMIN_DENY_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "Private.", show_alert: true });
      return;
    }

    const userId = ctx.match[1];
    const user = await denyPendingManualRequest(userId);
    await logEvent("admin_denied", { userId, adminId: ctx.from.id });
    await ctx.answerCallbackQuery({ text: "Manual review denied." });
    await ctx.reply(`Manual review denied.\n\n${formatUserStatus(user)}`);

    try {
      await ctx.api.sendMessage(
        user.telegramId,
        "Your manual payment review was not approved yet.\n\nThat usually means I need clearer proof or the payment was not confirmed. Use /paysupport when you are ready to send the right details."
      );
    } catch {
      // User may have blocked the bot or not opened it again.
    }
  });

  bot.callbackQuery(/^ADMIN_STATUS_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "Private.", show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery({ text: "Status opened." });
    await ctx.reply(formatUserStatus(await getUser(ctx.match[1])));
  });

  bot.callbackQuery(/^ADMIN_DROP_(CONFIRM|CANCEL)_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "Private.", show_alert: true });
      return;
    }

    const action = ctx.match[1];
    const id = ctx.match[2];
    const pending = getPendingPrivateDrop(id);

    if (!pending || pending.adminId !== String(ctx.from.id)) {
      await ctx.answerCallbackQuery({ text: "This private drop preview expired.", show_alert: true });
      return;
    }

    if (action === "CANCEL") {
      pendingPrivateDrops.delete(id);
      await ctx.answerCallbackQuery({ text: "Private drop canceled." });
      await ctx.reply("Private drop canceled. Nothing was sent.");
      return;
    }

    await ctx.answerCallbackQuery({ text: "Sending private drop." });

    const recipients = await getPrivateDropRecipients(pending.tier);
    let sent = 0;
    let failed = 0;
    const dropMessage = `Private Drop\n\n${pending.message}\n\nCome back to Deja Always when you want the room open again.`;

    for (const user of recipients) {
      try {
        await ctx.api.sendMessage(user.telegramId, dropMessage);
        sent += 1;
      } catch {
        failed += 1;
      }
    }

    pendingPrivateDrops.delete(id);
    await logEvent("private_drop_sent", {
      adminId: ctx.from.id,
      tier: pending.tier,
      sent,
      failed
    });
    await ctx.reply(
      `Private drop complete.\n\nTier: ${privateDropTierLabel(pending.tier)}\nSent: ${sent}\nFailed: ${failed}`
    );
  });

  bot.callbackQuery(/^ADMIN_BROADCAST_(CONFIRM|CANCEL)_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "Private.", show_alert: true });
      return;
    }

    const action = ctx.match[1];
    const id = ctx.match[2];
    const pending = getPendingBroadcast(id);

    if (!pending || pending.adminId !== String(ctx.from.id)) {
      await ctx.answerCallbackQuery({ text: "This preview expired.", show_alert: true });
      return;
    }

    if (action === "CANCEL") {
      pendingBroadcasts.delete(id);
      await ctx.answerCallbackQuery({ text: "Broadcast canceled." });
      await ctx.reply("Broadcast canceled. Nothing was sent.");
      return;
    }

    await ctx.answerCallbackQuery({ text: "Sending broadcast." });

    const recipients = await getBroadcastRecipients();
    let sent = 0;
    let failed = 0;

    for (const user of recipients) {
      try {
        await ctx.api.sendMessage(user.telegramId, pending.message);
        sent += 1;
      } catch {
        failed += 1;
      }
    }

    pendingBroadcasts.delete(id);
    await ctx.reply(`Broadcast complete.\n\nSent: ${sent}\nFailed: ${failed}`);
  });
}
