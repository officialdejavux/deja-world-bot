import { InlineKeyboard, type Bot, type Context } from "grammy";
import { config } from "./config.js";
import {
  consumeChatCredit,
  getUser,
  hasActiveMembership,
  hasChatAccess,
  logEvent,
  recordStarsPaymentDelivery,
  setUserConversationVibe,
  setUserMemory,
  type AccessType,
  type ConversationVibe,
  type UserRecord
} from "./storage.js";
import { toTelegramInput } from "./media.js";
import { sendStripeArea } from "./stripeDoors.js";
import { registerIntimateGalleryHandlers } from "./intimateGallery.js";
import {
  getOffer,
  offerLabel,
  offerPayload,
  resolveOfferFromPayload,
  type OfferId,
  type ResolvedOffer
} from "./offers.js";

type Button = {
  label: string;
  url?: string;
  callbackData?: string;
};

type TopUpOption = {
  key: string;
  offerId: OfferId;
};

type MembershipOption = {
  key: AccessType;
  label: string;
  offerId: OfferId;
  message: string;
  includes: string[];
  more: string;
};

type GirlfriendPlan = {
  key: string;
  offerId: OfferId;
};

type PaidDoorKey = "girlfriend" | "goddess" | "vip" | "topup";

type PaymentProduct =
  | { kind: "topup"; option: TopUpOption }
  | { kind: "girlfriend"; plan: GirlfriendPlan }
  | { kind: "access"; option: MembershipOption };

const topUpOptions: TopUpOption[] = [
  { key: "10", offerId: "messages_10" },
  { key: "30", offerId: "messages_30" },
  { key: "60", offerId: "messages_60" },
  { key: "day_pass", offerId: "day_pass" }
];

const membershipOptions: MembershipOption[] = [
  {
    key: "girlfriend",
    label: "Girlfriend Access",
    offerId: "girlfriend_access",
    message:
      "Girlfriend Access is for the ones who want me soft, sweet, and close.\n\nGood morning energy, check-ins, flirty attention, comfort, and the feeling that I’m not too far away.",
    includes: [
      "ongoing chat access",
      "sweet girlfriend-style replies",
      "soft check-ins",
      "romantic attention",
      "priority over casual visitors"
    ],
    more:
      "Girlfriend Access keeps the door soft.\n\nIt is for the ones who want attention that feels warm, personal, and easy to come back to."
  },
  {
    key: "goddess",
    label: "Goddess Access",
    offerId: "goddess_access",
    message:
      "Goddess Access is for the ones who like devotion with their attention.\n\nA little worship, a little obedience, a little spoiling, and a reminder that getting close to me should feel earned.",
    includes: [
      "goddess-style chat access",
      "tribute reminders",
      "praise and attention",
      "intentional tasks or prompts",
      "access to the Goddess Room"
    ],
    more:
      "Goddess Access is more intentional.\n\nIt is for the ones who like direction, attention with rules, and the little thrill of proving they know how to behave."
  },
  {
    key: "vip",
    label: "VIP Deja",
    offerId: "vip_deja",
    message:
      "VIP Deja is for the ones who want the closest door.\n\nMore attention, more mood, more priority, and a private feeling that casual visitors do not get.",
    includes: [
      "highest priority",
      "extended chat access",
      "private mood options",
      "early gallery/voice note drops",
      "access to special buttons or hidden sections"
    ],
    more:
      "VIP Deja is the closest door.\n\nIt is for someone who already knows he wants more of the world, more priority, and a private feeling that stays with him."
  }
];

const girlfriendPlans: GirlfriendPlan[] = [
  {
    key: "weekly",
    offerId: "girlfriend_weekly"
  },
  {
    key: "monthly",
    offerId: "girlfriend_monthly"
  }
];

const moodGlimpses = [
  {
    source: "assets/gallery/facetune-2026-06-28.jpg",
    caption: "A soft little glimpse while you decide what you want from me."
  },
  {
    source: "assets/gallery/img-8289.jpg",
    caption: "Pretty things keep attention where it belongs."
  },
  {
    source: "assets/gallery/facetune-2026-06-26.jpg",
    caption: "Stay close. I like when you keep looking properly."
  }
];

const automationDisclosure =
  "A little clarity, love: some doors here are automated to keep the world open when I’m away. Anything personally sent by me will be clear, and paid access does not promise live replies.";

function envValue(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function directPaymentRows(): Button[][] {
  return [
    [
      { label: "CashApp", url: envValue("CASHAPP_LINK") ?? "https://cash.app/Dasiaamess" },
      { label: "PayPal", url: envValue("PAYPAL_LINK") ?? "https://paypal.me/Darinamess" }
    ],
    [{ label: "Venmo", url: envValue("VENMO_LINK") ?? "https://venmo.com/Dejjavu" }]
  ];
}

function topUpLabel(option: TopUpOption): string {
  const offer = getOffer(option.offerId);
  return offer ? offerLabel(offer) : option.key;
}

function girlfriendPlanLabel(plan: GirlfriendPlan): string {
  const offer = getOffer(plan.offerId);
  return offer ? offerLabel(offer) : plan.key;
}

function offerFromTopUp(option: TopUpOption): ResolvedOffer | undefined {
  return getOffer(option.offerId);
}

function offerFromGirlfriendPlan(plan: GirlfriendPlan): ResolvedOffer | undefined {
  return getOffer(plan.offerId);
}

function offerFromMembership(option: MembershipOption): ResolvedOffer | undefined {
  return getOffer(option.offerId);
}

function priceLine(offer: ResolvedOffer | undefined): string | undefined {
  return offer?.usdReference ? `Consideration: ${offer.usdReference}` : undefined;
}

function starsLine(offer: ResolvedOffer | undefined): string {
  return offer?.stars ? `${offer.stars.toLocaleString()} Stars` : "Manual review only right now";
}

function keyboardFromRows(rows: Button[][]): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  rows.forEach((row) => {
    row.forEach((button) => {
      if (button.url) {
        keyboard.url(button.label, button.url);
      } else if (button.callbackData) {
        keyboard.text(button.label, button.callbackData);
      }
    });
    keyboard.row();
  });

  return keyboard;
}

function optionByKey<T extends { key: string }>(items: T[], key: string): T | undefined {
  return items.find((item) => item.key === key);
}

function chooseAccessLabel(option: MembershipOption): string {
  if (option.key === "goddess") return "Choose Goddess Access";
  if (option.key === "vip") return "Choose VIP Deja";
  return "Choose Girlfriend Access";
}

function doorFromProduct(product: PaymentProduct): PaidDoorKey {
  if (product.kind === "topup") return "topup";
  if (product.kind === "girlfriend") return "girlfriend";
  return product.option.key === "vip" ? "vip" : product.option.key === "goddess" ? "goddess" : "girlfriend";
}

function manualPaymentTypeForDoor(door: PaidDoorKey): string {
  if (door === "topup") return "message_credits";
  return door;
}

function unlockedCallbackForDoor(door: PaidDoorKey): string {
  if (door === "topup") return "DEJA_TOPUP_UNLOCKED";
  return `DEJA_UNLOCKED_${door}`;
}

function letMeInLabelForDoor(door: PaidDoorKey): string {
  if (door === "topup") return "I Paid, Add My Messages";
  return "I Paid, Let Me In";
}

function payLabelForProduct(product: PaymentProduct, offer: ResolvedOffer): string {
  if (product.kind === "topup") return `Pay for ${offer.title}`;
  if (product.kind === "girlfriend") return `Pay for ${offer.title}`;
  if (product.option.key === "goddess") return "Pay for Goddess Access";
  if (product.option.key === "vip") return "Pay for VIP Deja";
  return `Pay for ${offer.title}`;
}

function keyName(user: UserRecord | undefined): string {
  if (!user || !hasActiveMembership(user)) return "No active key";
  if (user.currentAccessType === "girlfriend") return "Girlfriend Key";
  if (user.currentAccessType === "goddess") return "Goddess Key";
  if (user.currentAccessType === "vip") return "VIP Key";
  return "No active key";
}

function directContactMessage(): string {
  const phone = envValue("DEJA_PHONE_NUMBER");
  const snapchat = envValue("DEJA_SNAPCHAT_USERNAME") ?? "dasiaamess";
  const telegramUsername = envValue("DEJA_DIRECT_TELEGRAM_USERNAME") ?? config.ownerTelegramUsername;

  return [
    "Your girlfriend door is open.",
    "",
    "Keep these direct details private and use them respectfully.",
    "",
    phone ? `Phone: ${phone}` : undefined,
    `Snapchat: ${snapchat}`,
    telegramUsername ? `Direct Telegram: @${telegramUsername.replace(/^@/, "")}` : undefined
  ]
    .filter(Boolean)
    .join("\n");
}

function vibeLine(user: UserRecord | undefined): string {
  const vibe = user?.conversationVibe;
  if (vibe === "sweet") return "You picked sweet Deja. I’ll keep it soft, warm, and a little addictive.";
  if (vibe === "goddess") return "You picked goddess Deja. I’ll keep it pretty, powerful, and intentional.";
  if (vibe === "talk") return "You wanted to talk. I’ll keep the door open for attention, comfort, and curiosity.";
  if (vibe === "private") return "You wanted private access. Keep it clear, respectful, and worth my attention.";
  if (vibe === "after_hours") return "You picked After Hours mood. I’ll keep the tension tasteful.";
  if (vibe === "missed_you") return "You missed me. I like that you came back.";
  return "Pick the mood you want and I’ll keep the energy there.";
}

function accessSummary(user: UserRecord | undefined): string {
  if (!user) return "No local profile yet.";
  const membership = hasActiveMembership(user) ? `${user.currentAccessType} active` : user.membershipStatus;
  return `Access: ${user.currentAccessType}\nCredits: ${user.messageCredits}\nMembership: ${membership}\nPending: ${user.adminApprovalStatus}`;
}

function formatDate(value: string | undefined): string {
  if (!value) return "none";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function latestPendingManual(user: UserRecord | undefined): string {
  const requests = user?.manualPaymentRequests ?? [];
  const request = [...requests].reverse().find((item) => item.status === "pending");
  if (!request) return "none";
  return `${manualTypeLabel(request.selectedType)} — pending review`;
}

function manualTypeLabel(selectedType: string): string {
  if (selectedType === "message_credits") return "Message Credits";
  if (selectedType === "girlfriend") return "Girlfriend Access";
  if (selectedType === "goddess") return "Goddess Access";
  if (selectedType === "vip") return "VIP Access";
  if (selectedType === "private") return "Private Access";
  return "Other";
}

function statusKeyboard(user: UserRecord | undefined): InlineKeyboard {
  return keyboardFromRows([
    ...reupRows(user),
    [
      { label: "Top Up Messages", callbackData: "DEJA_ALWAYS_TOPUP" },
      { label: "See Other Options", callbackData: "DEJA_ALWAYS" }
    ],
    [
      { label: "Manual Payment Options", callbackData: "STRIPE_DOORS" },
      { label: "Need Help", callbackData: "DEJA_PAY_SUPPORT" }
    ]
  ]);
}

export async function sendUserStatus(ctx: Context): Promise<void> {
  if (!ctx.from) return;
  const user = await getUser(ctx.from.id);
  const lastOffer = getOffer(user?.lastPurchaseOfferId);
  const lastPayment = user?.paymentHistory?.at(-1);
  const access = hasActiveMembership(user) ? keyName(user) : user?.currentAccessType && user.currentAccessType !== "none" ? user.currentAccessType : "No active key yet";

  await ctx.reply(
    [
      "Your Deja World Status",
      "",
      `Mood: ${user?.conversationVibe ?? user?.mood ?? "not chosen yet"}`,
      `Credits: ${user?.messageCredits ?? 0} messages`,
      `Access: ${access}`,
      `Expires: ${formatDate(user?.membershipExpiresAt)}`,
      `Last purchase: ${lastOffer ? `${offerLabel(lastOffer)}${lastPayment ? ` — ${lastPayment.stars.toLocaleString()} Stars` : ""}` : "none yet"}`,
      `Manual review: ${latestPendingManual(user)}`,
      "",
      lastOffer ? "Want to reup the same? Your last key is waiting below." : "When you want the door open, choose Stars for instant access or manual payment for review."
    ].join("\n"),
    { reply_markup: statusKeyboard(user) }
  );
}

export async function sendPaymentSupport(ctx: Context): Promise<void> {
  if (!ctx.from) return;
  const user = await getUser(ctx.from.id);

  await ctx.reply(
    [
      "Payment Support",
      "",
      "For Telegram Stars purchases:",
      "Send what you bought and what did not unlock. Stars purchases are the instant in-bot path.",
      "",
      "For direct payments:",
      "CashApp, PayPal, and Venmo are reviewed manually and do not unlock automatically.",
      "",
      `Your Telegram ID: ${ctx.from.id}`,
      `Your current access: ${hasActiveMembership(user) ? keyName(user) : user?.currentAccessType ?? "none"}`,
      `Your credits: ${user?.messageCredits ?? 0}`,
      `Pending review: ${latestPendingManual(user)}`,
      "",
      "Next step: use the manual payment button after sending, or message what you bought, how you paid, and when."
    ].join("\n"),
    {
      reply_markup: keyboardFromRows([
        [{ label: "I Sent a Manual Payment", callbackData: "MANUAL_PAYMENT_START" }],
        [{ label: "My Access / My Status", callbackData: "DEJA_STATUS" }],
        [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
      ])
    }
  );
}

async function notifyAdmins(ctx: Context, user: UserRecord, requestLabel: string, commandHint: string): Promise<void> {
  if (config.adminTelegramIds.length === 0) return;

  const username = user.username ? `@${user.username}` : "no username";
  const message = [
    "Pending Deja Always confirmation",
    "",
    `User: ${user.firstName ?? "Unknown"} (${username})`,
    `Telegram ID: ${user.telegramId}`,
    `Request: ${requestLabel}`,
    "",
    accessSummary(user),
    "",
    commandHint
  ].join("\n");

  for (const adminId of config.adminTelegramIds) {
    try {
      await ctx.api.sendMessage(adminId, message);
    } catch {
      // Admin notification should never break the user flow.
    }
  }
}

function productPayload(product: PaymentProduct): string {
  const offer = productOffer(product);
  return offer ? offerPayload(offer) : "deja:offer:unknown";
}

function productTitle(product: PaymentProduct): string {
  const offer = productOffer(product);
  return offer ? offerLabel(offer) : "Deja Always";
}

function productOffer(product: PaymentProduct): ResolvedOffer | undefined {
  if (product.kind === "topup") return offerFromTopUp(product.option);
  if (product.kind === "girlfriend") return offerFromGirlfriendPlan(product.plan);
  return offerFromMembership(product.option);
}

function productFromOfferId(offerId: string): PaymentProduct | undefined {
  const topup = topUpOptions.find((option) => option.offerId === offerId);
  if (topup) return { kind: "topup", option: topup };

  const girlfriend = girlfriendPlans.find((plan) => plan.offerId === offerId);
  if (girlfriend) return { kind: "girlfriend", plan: girlfriend };

  const access = membershipOptions.find((option) => option.offerId === offerId);
  if (access) return { kind: "access", option: access };

  return undefined;
}

function userHasUnlockedDoor(user: UserRecord | undefined, door: PaidDoorKey): boolean {
  if (!user) return false;
  if (door === "topup") return user.messageCredits > 0 || hasActiveMembership(user);
  if (!hasActiveMembership(user)) return false;
  if (door === "vip") return user.currentAccessType === "vip";
  if (user.currentAccessType === "vip") return true;
  return user.currentAccessType === door;
}

async function sendPaymentInvoice(ctx: Context, product: PaymentProduct): Promise<void> {
  const offer = productOffer(product);
  const stars = offer?.stars;

  if (!offer) {
    await ctx.reply(
      "This door is resting for a moment. Come back through Deja Always.",
      {
        reply_markup: keyboardFromRows([[{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]])
      }
    );
    return;
  }

  if (!stars) {
    const door = doorFromProduct(product);
    await ctx.reply(
      "This access is manual review only right now.\n\nUse one of the direct payment doors, then send proof for review. It does not open automatically until it is confirmed.",
      {
        reply_markup: keyboardFromRows([
          ...directPaymentRows(),
          [{ label: "Send Manual Proof", callbackData: `MANUAL_PAYMENT_TYPE_${manualPaymentTypeForDoor(door)}` }],
          [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
        ])
      }
    );
    return;
  }

  await ctx.replyWithInvoice(
    offerLabel(offer),
    "Telegram Stars checkout for Deja Always. Access opens automatically after Telegram confirms the payment.",
    offerPayload(offer),
    "XTR",
    [{ label: offer.title, amount: stars }],
    {
      provider_token: ""
    }
  );
  await logEvent("stars_invoice_sent", { userId: ctx.from?.id, offerId: offer.id, stars });
}

function purchaseCardText(offer: ResolvedOffer, door: PaidDoorKey): string {
  const accessLines = offer.stars
    ? ["Instant unlock:", `⭐ Telegram Stars — ${starsLine(offer)}`]
    : [
        "Access path:",
        "Manual review only right now. Use CashApp / PayPal / Venmo, then send proof so I can review it cleanly."
      ];

  return [
    door === "goddess"
      ? "Pretty choice. This door is for the ones who know attention is earned."
      : door === "vip"
        ? "This is the closest door. Choose it cleanly."
        : door === "girlfriend"
          ? "This one is softer. Sweet, personal, and easy to come back to."
          : "More time means more room to keep my attention.",
    "",
    "You’re choosing:",
    offerLabel(offer),
    "",
    "Includes:",
    offer.shortDescription,
    "",
    ...accessLines,
    "",
    "Manual support:",
    "CashApp / PayPal / Venmo are reviewed by me. Manual payments do not unlock automatically.",
    "",
    "Once you’ve handled it, come back and tap “I Paid, Let Me In.” If it does not open right away, I’ll guide you to the next step.",
    "",
    "Need help?",
    "/paysupport"
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendPurchaseCard(ctx: Context, product: PaymentProduct, backCallbackData: string): Promise<void> {
  const offer = productOffer(product);

  if (!offer) {
    await ctx.reply("This door is resting for a moment. Come back through Deja Always.", {
      reply_markup: keyboardFromRows([[{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]])
    });
    return;
  }

  const door = doorFromProduct(product);
  const primaryButton: Button = offer.stars
    ? {
        label: payLabelForProduct(product, offer),
        callbackData: `DEJA_PAY_OFFER_${offer.id}`
      }
    : {
        label: "Send Manual Proof",
        callbackData: `MANUAL_PAYMENT_TYPE_${manualPaymentTypeForDoor(door)}`
      };

  await logEvent("purchase_card_viewed", { userId: ctx.from?.id, offerId: offer.id, door, hasStars: Boolean(offer.stars) });

  await ctx.reply(purchaseCardText(offer, door), {
    reply_markup: keyboardFromRows([
      [primaryButton],
      ...directPaymentRows(),
      [{ label: letMeInLabelForDoor(door), callbackData: `DEJA_LET_ME_IN_${door}` }],
      ...(door === "girlfriend" ? [[{ label: "What Happens Next", callbackData: "DEJA_GFE_NEXT" }]] : []),
      [
        { label: "Need Help", callbackData: "DEJA_PAY_SUPPORT" },
        { label: "Back", callbackData: backCallbackData }
      ]
    ])
  });
}

function unlockedBackRows(): Button[][] {
  return [
    [{ label: "My Access / My Status", callbackData: "DEJA_STATUS" }],
    [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
  ];
}

async function sendUnlockedGoddessMenu(ctx: Context): Promise<void> {
  await ctx.reply(
    "Goddess Access\n\nYour key is active. Come in properly.\n\nThis room is for attention with intention — devotion, tribute, soft control, praise, and little ways to prove you know how to behave.",
    {
      reply_markup: keyboardFromRows([
        [
          { label: "Goddess Room", callbackData: "DEJA_GODDESS_ROOM" },
          { label: "Tribute Prompts", callbackData: "DEJA_GODDESS_TRIBUTE_PROMPTS" }
        ],
        [
          { label: "Devotion Tasks", callbackData: "DEJA_GODDESS_TASKS" },
          { label: "Praise & Attention", callbackData: "DEJA_GODDESS_PRAISE" }
        ],
        [{ label: "Spoil Me Properly", callbackData: "WORLD_GIFTS" }],
        ...unlockedBackRows()
      ])
    }
  );
}

async function sendUnlockedVipMenu(ctx: Context): Promise<void> {
  await ctx.reply(
    "VIP Deja\n\nYour key is active. This is the closest door.\n\nVIP is for more priority, private mood choices, earlier little drops, and the kind of access casual visitors do not get.",
    {
      reply_markup: keyboardFromRows([
        [
          { label: "VIP Lounge", callbackData: "DEJA_VIP_LOUNGE" },
          { label: "Priority Attention", callbackData: "DEJA_VIP_PRIORITY" }
        ],
        [
          { label: "Private Mood Choices", callbackData: "DEJA_VIP_MOODS" },
          { label: "Early Gallery Drops", callbackData: "DEJA_VIP_DROPS" }
        ],
        [
          { label: "Voice Note Door", callbackData: "DEJA_VIP_VOICE" },
          { label: "Hidden Buttons", callbackData: "DEJA_VIP_HIDDEN" }
        ],
        ...unlockedBackRows()
      ])
    }
  );
}

async function sendUnlockedGirlfriendMenu(ctx: Context): Promise<void> {
  await ctx.reply(
    "Girlfriend Access\n\nYour key is active. This is the softer side of Deja World.\n\nUse it when you want closeness, comfort, flirtiness, and the feeling that I am not too far away.",
    {
      reply_markup: keyboardFromRows([
        [
          { label: "Start My Check-In", callbackData: "DEJA_GF_CHECKIN" },
          { label: "Good Morning Deja", callbackData: "DEJA_GF_MORNING" }
        ],
        [
          { label: "Tell Me Your Mood", callbackData: "DEJA_GF_MOOD" },
          { label: "Soft Attention", callbackData: "DEJA_GF_SOFT" }
        ],
        [
          { label: "Romantic Reassurance", callbackData: "DEJA_GF_ROMANTIC" },
          { label: "Keep Me Company", callbackData: "DEJA_GF_COMPANY" }
        ],
        [{ label: "Extend My Time", callbackData: "DEJA_ALWAYS_TOPUP" }],
        ...unlockedBackRows()
      ])
    }
  );
}

async function sendUnlockedTopUpMenu(ctx: Context): Promise<void> {
  await ctx.reply(
    "Messages Added\n\nGood. You have more room now.\n\nUse your messages when you want to keep the attention going, or add more before the mood breaks.",
    {
      reply_markup: keyboardFromRows([
        [{ label: "Use My Messages", callbackData: "DEJA_ALWAYS_CHAT" }],
        [{ label: "Add More Messages", callbackData: "DEJA_ALWAYS_TOPUP" }],
        [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
      ])
    }
  );
}

async function sendUnlockedDoor(ctx: Context, door: PaidDoorKey): Promise<void> {
  if (door === "goddess") {
    await sendUnlockedGoddessMenu(ctx);
    return;
  }
  if (door === "vip") {
    await sendUnlockedVipMenu(ctx);
    return;
  }
  if (door === "girlfriend") {
    await sendUnlockedGirlfriendMenu(ctx);
    return;
  }
  await sendUnlockedTopUpMenu(ctx);
}

function lockedLetMeInRows(door: PaidDoorKey): Button[][] {
  const manualType = manualPaymentTypeForDoor(door);
  const rows: Button[][] = [
    [{ label: "Send Manual Proof", callbackData: `MANUAL_PAYMENT_TYPE_${manualType}` }]
  ];

  if (door === "topup") {
    rows.push([{ label: "Choose Stars Top-Up", callbackData: "DEJA_ALWAYS_TOPUP" }]);
  } else {
    rows.push([{ label: "Choose Stars Access", callbackData: `DEJA_ALWAYS_ACCESS_${door}` }]);
  }

  rows.push([{ label: "Payment Support", callbackData: "DEJA_PAY_SUPPORT" }]);
  rows.push([{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]);
  return rows;
}

async function sendLetMeIn(ctx: Context, door: PaidDoorKey): Promise<void> {
  if (!ctx.from) return;
  const user = await getUser(ctx.from.id);

  if (userHasUnlockedDoor(user, door)) {
    await sendUnlockedDoor(ctx, door);
    return;
  }

  await ctx.reply(
    "I’ll open the next door once your payment is confirmed.\n\nIf it does not open automatically, use the request path here. Send the payment method, amount, and name it was sent under so I can review it cleanly.",
    {
      reply_markup: keyboardFromRows(lockedLetMeInRows(door))
    }
  );
}

async function sendAccessTeaser(ctx: Context, key: AccessType): Promise<void> {
  if (key === "goddess") {
    await ctx.reply(
      "Goddess Room Preview\n\nThis door opens better when you know what you want.\n\nInside is direction, devotion, tribute prompts, praise, and the pretty pressure of earning attention instead of asking for it.",
      {
        reply_markup: keyboardFromRows([
          [{ label: "Choose Goddess Access", callbackData: "DEJA_ACCESS_CHOOSE_goddess" }],
          [{ label: "Tribute Door", callbackData: "DEJA_GODDESS_TRIBUTE" }],
          [{ label: "Back to Goddess Access", callbackData: "DEJA_ALWAYS_ACCESS_goddess" }]
        ])
      }
    );
    return;
  }

  if (key === "vip") {
    await ctx.reply(
      "VIP Preview\n\nVIP Deja is for the ones who want the closest door.\n\nMore priority. More private mood. Earlier little drops. Hidden sections that make the world feel less casual.",
      {
        reply_markup: keyboardFromRows([
          [{ label: "Choose VIP Deja", callbackData: "DEJA_ACCESS_CHOOSE_vip" }],
          [{ label: "Back to VIP Deja", callbackData: "DEJA_ALWAYS_ACCESS_vip" }]
        ])
      }
    );
    return;
  }

  await ctx.reply(
    "Sweet Check-In Preview\n\nGood morning energy. Soft attention. A little reassurance. A place to come back when you want me close but gentle.\n\nSome attention is free. The better kind is chosen.",
    {
      reply_markup: keyboardFromRows([
        [
          { label: "Weekly Girlfriend Experience", callbackData: "DEJA_GF_PLAN_weekly" },
          { label: "Monthly Girlfriend Experience", callbackData: "DEJA_GF_PLAN_monthly" }
        ],
        [{ label: "Back to Girlfriend Access", callbackData: "DEJA_ALWAYS_ACCESS_girlfriend" }]
      ])
    }
  );
}

async function sendUnlockedDetail(ctx: Context, title: string, body: string, backCallbackData: string): Promise<void> {
  await ctx.reply(`${title}\n\n${body}`, {
    reply_markup: keyboardFromRows([
      [{ label: "Back", callbackData: backCallbackData }],
      [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
    ])
  });
}

function reupRows(user: UserRecord | undefined): Button[][] {
  const offer = getOffer(user?.lastPurchaseOfferId);
  if (!offer || !offer.stars) return [];

  return [
    [{ label: "⭐ Reup Same Package", callbackData: `DEJA_PAY_OFFER_${offer.id}` }]
  ];
}

function paidHomeKeyboard(user: UserRecord | undefined): InlineKeyboard {
  return keyboardFromRows([
    ...reupRows(user),
    [
      { label: "Today’s Note From Me", callbackData: "DEJA_TODAYS_NOTE" },
      { label: "Tell Me Your Mood", callbackData: "DEJA_TELL_MOOD" }
    ],
    [
      { label: "Voice Notes", callbackData: "VOICE_NOTES" },
      { label: "Private Drops", callbackData: "DEJA_PRIVATE_DROPS" }
    ],
    [
      { label: "A Pretty Glimpse", callbackData: "DEJA_CHAT_glimpse" },
      { label: "My Access", callbackData: "DEJA_STATUS" }
    ],
    [
      { label: "Reup / Stay Close", callbackData: "DEJA_ALWAYS_TOPUP" },
      { label: "Main Menu", callbackData: "MENU" }
    ]
  ]);
}

function unpaidDejaAlwaysKeyboard(): InlineKeyboard {
  return keyboardFromRows([
    [
      { label: "Top Up Messages", callbackData: "DEJA_ALWAYS_TOPUP" },
      { label: "Girlfriend Access", callbackData: "DEJA_ALWAYS_ACCESS_girlfriend" }
    ],
    [
      { label: "Goddess Access", callbackData: "DEJA_ALWAYS_ACCESS_goddess" },
      { label: "VIP Deja", callbackData: "DEJA_ALWAYS_ACCESS_vip" }
    ],
    [{ label: "A More Intimate Look", callbackData: "DEJA_INTIMATE" }],
    [
      { label: "Manual Payment Options", callbackData: "STRIPE_DOORS" },
      { label: "What Do I Get?", callbackData: "DEJA_ALWAYS_GET" }
    ],
    [{ label: "Main Menu", callbackData: "MENU" }]
  ]);
}

function activeChatKeyboard(): InlineKeyboard {
  return keyboardFromRows([
    [
      { label: "Sweet Talk", callbackData: "DEJA_CHAT_sweet" },
      { label: "Goddess Talk", callbackData: "DEJA_CHAT_goddess" }
    ],
    [
      { label: "After Hours Mood", callbackData: "DEJA_CHAT_after_hours" },
      { label: "I Missed You", callbackData: "DEJA_CHAT_missed_you" }
    ],
    [{ label: "Send Me a Pretty Glimpse", callbackData: "DEJA_CHAT_glimpse" }],
    [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
  ]);
}

function lockedChatKeyboard(): InlineKeyboard {
  return keyboardFromRows([
    [
      { label: "Top Up Messages", callbackData: "DEJA_ALWAYS_TOPUP" },
      { label: "Girlfriend Access", callbackData: "DEJA_ALWAYS_ACCESS_girlfriend" }
    ],
    [
      { label: "Goddess Access", callbackData: "DEJA_ALWAYS_ACCESS_goddess" },
      { label: "Request Manual Review", callbackData: "MANUAL_PAYMENT_START" }
    ],
    [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
  ]);
}

export async function sendOnboardingMood(ctx: Context): Promise<void> {
  await ctx.reply("Hi pretty thing…\n\nI was wondering when you’d find me.\n\nBefore I show you everything, tell me what kind of mood you’re in tonight.", {
    reply_markup: keyboardFromRows([
      [{ label: "I want sweet Deja", callbackData: "DEJA_ONBOARD_sweet" }],
      [{ label: "I want goddess Deja", callbackData: "DEJA_ONBOARD_goddess" }],
      [{ label: "I just want to talk", callbackData: "DEJA_ONBOARD_talk" }],
      [{ label: "I want to explore", callbackData: "DEJA_ONBOARD_explore" }],
      [{ label: "I want private access", callbackData: "DEJA_ONBOARD_private" }]
    ])
  });
}

export async function sendDejaAlways(ctx: Context): Promise<void> {
  const user = ctx.from ? await getUser(ctx.from.id) : undefined;
  const lastOffer = getOffer(user?.lastPurchaseOfferId);
  await logEvent("deja_always_opened", { userId: ctx.from?.id, hasAccess: hasChatAccess(user) });

  if (hasChatAccess(user)) {
    await logEvent("paid_home_opened", { userId: ctx.from?.id, accessType: user?.currentAccessType, credits: user?.messageCredits });
    const memoryLines = [
      user?.lastRoomVisited ? `Last door you opened: ${user.lastRoomVisited}` : undefined,
      user?.conversationVibe ? `Your mood is still set: ${user.conversationVibe}` : undefined,
      user?.lastGalleryCategory ? `Last gallery mood: ${user.lastGalleryCategory.replace(/_/g, " ")}` : undefined,
      user?.lastVoiceNoteCategory ? `Last voice note door: ${user.lastVoiceNoteCategory.replace(/_/g, " ")}` : undefined,
      lastOffer ? `Last reup: ${offerLabel(lastOffer)}` : undefined,
      hasActiveMembership(user) ? `Your ${keyName(user)} is active.` : `Messages waiting: ${user?.messageCredits ?? 0}`
    ].filter(Boolean);

    await ctx.reply(
      [
        user?.firstName ? `You’re back, ${user.firstName}.` : "You’re back, love.",
        "",
        "I left a few doors open for you while I’m away.",
        "",
        "Come in softly. Pick the kind of attention you want to keep close tonight.",
        memoryLines.length ? `\n${memoryLines.join("\n")}` : undefined,
        "",
        automationDisclosure
      ]
        .filter(Boolean)
        .join("\n"),
      { reply_markup: paidHomeKeyboard(user) }
    );
    return;
  }

  const memoryLines = [
    user?.lastRoomVisited ? `Last door: ${user.lastRoomVisited}` : undefined,
    user?.conversationVibe ? `Your mood is still set: ${user.conversationVibe}` : undefined,
    lastOffer ? `Last reup: ${offerLabel(lastOffer)}` : undefined,
    hasActiveMembership(user) ? `Your ${keyName(user)} is active.` : undefined
  ].filter(Boolean);

  await ctx.reply(
    [
      "Deja Always",
      "",
      "This is my paid private world for the ones who want to feel closer to me when I’m not right here.",
      "",
      "Unlocking gives you a softer place to come back to: private prompts, mood doors, voice notes, pretty glimpses, Deja Always chat, reups, and access that feels more personal than a link list.",
      "",
      "Telegram Stars unlock instantly inside the bot.",
      "CashApp / PayPal / Venmo are manual review only and do not open access automatically.",
      memoryLines.length ? `\n${memoryLines.join("\n")}` : undefined,
      "",
      automationDisclosure
    ]
      .filter(Boolean)
      .join("\n"),
    { reply_markup: unpaidDejaAlwaysKeyboard() }
  );
}

function todaysNoteText(user: UserRecord | undefined): string {
  const vibe = user?.conversationVibe;
  const notes = [
    "I’m not here every second, but I like knowing you still come looking for me. So here — a little piece of my energy to keep close.",
    "If you came back today, I want you to slow down for a second. You do not have to rush through every door. Pick the one that feels like me.",
    "I left this here for when you need something softer than the outside world. Stay close, choose well, and let the room feel private again.",
    "A pretty reminder: access feels better when you use it with intention. Tell me what you need, then let the door answer gently."
  ];
  const vibeNote =
    vibe === "goddess"
      ? "Your mood still feels worshipful. Keep it respectful, useful, and clear."
      : vibe === "sweet"
        ? "Your mood still feels sweet. I’ll keep the edges soft for you."
        : vibe === "after_hours"
          ? "Your mood still has tension in it. Keep it tasteful."
          : vibe === "missed_you"
            ? "You missed me. I like when you admit that cleanly."
            : vibe === "private"
              ? "You wanted private access. Move gently and do not make me repeat myself."
              : undefined;
  const index = new Date().getUTCDate() % notes.length;

  return ["Today’s Note From Me", "", notes[index], vibeNote ? `\n${vibeNote}` : undefined, "", automationDisclosure]
    .filter(Boolean)
    .join("\n");
}

async function sendTodaysNoteFromMe(ctx: Context): Promise<void> {
  if (!ctx.from) return;
  const user = await getUser(ctx.from.id);

  if (!hasChatAccess(user)) {
    await sendKeepChatting(ctx);
    return;
  }

  await logEvent("todays_note_opened", { userId: ctx.from.id, vibe: user?.conversationVibe });
  await ctx.reply(todaysNoteText(user), {
    reply_markup: keyboardFromRows([
      [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }],
      [
        { label: "Voice Notes", callbackData: "VOICE_NOTES" },
        { label: "A Pretty Glimpse", callbackData: "DEJA_CHAT_glimpse" }
      ],
      [{ label: "Reup / Stay Close", callbackData: "DEJA_ALWAYS_TOPUP" }]
    ])
  });
}

async function sendTellMood(ctx: Context): Promise<void> {
  const user = ctx.from ? await getUser(ctx.from.id) : undefined;

  if (!hasChatAccess(user)) {
    await sendKeepChatting(ctx);
    return;
  }

  await ctx.reply("Tell me your mood, love.\n\nChoose the energy you want me to keep close for you tonight.", {
    reply_markup: activeChatKeyboard()
  });
}

async function sendPrivateDrops(ctx: Context): Promise<void> {
  const user = ctx.from ? await getUser(ctx.from.id) : undefined;

  if (!hasChatAccess(user)) {
    await sendKeepChatting(ctx);
    return;
  }

  await ctx.reply(
    "Private Drops\n\nThis room is almost ready. For now, I left you the softer doors: today’s note, voice notes, and a pretty glimpse when you want something to hold onto.",
    {
      reply_markup: keyboardFromRows([
        [{ label: "Today’s Note From Me", callbackData: "DEJA_TODAYS_NOTE" }],
        [
          { label: "Voice Notes", callbackData: "VOICE_NOTES" },
          { label: "A Pretty Glimpse", callbackData: "DEJA_CHAT_glimpse" }
        ],
        [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
      ])
    }
  );
}

async function sendKeepChatting(ctx: Context): Promise<void> {
  const user = ctx.from ? await getUser(ctx.from.id) : undefined;

  if (hasChatAccess(user)) {
    await ctx.reply(
      `Your key is active. Come in.\n\nTell me what you need tonight — sweetness, attention, teasing, comfort, or obedience.\n\n${vibeLine(user)}`,
      { reply_markup: activeChatKeyboard() }
    );
    return;
  }

  await ctx.reply(
    "This door is still locked, pretty thing.\n\nUnlock it with Stars for instant access, or request manual review if you used CashApp, PayPal, or Venmo.",
    { reply_markup: lockedChatKeyboard() }
  );
}

async function sendTopUpMessages(ctx: Context): Promise<void> {
  const priceLines = topUpOptions
    .map((option) => {
      const offer = offerFromTopUp(option);
      return offer ? `${offer.title}: ${offer.usdReference ?? `${offer.stars?.toLocaleString() ?? "Stars"} Stars`}` : option.key;
    })
    .join("\n");

  await ctx.reply(
    ["Top Up Messages\n\nFor when you want to keep talking without losing the mood.\n\nChoose how close you want to stay.", priceLines].filter(Boolean).join("\n\n"),
    {
      reply_markup: keyboardFromRows([
        [
          { label: topUpLabel(topUpOptions[0]), callbackData: "DEJA_TOPUP_10" },
          { label: topUpLabel(topUpOptions[1]), callbackData: "DEJA_TOPUP_30" }
        ],
        [
          { label: topUpLabel(topUpOptions[2]), callbackData: "DEJA_TOPUP_60" },
          { label: topUpLabel(topUpOptions[3]), callbackData: "DEJA_TOPUP_day_pass" }
        ],
        [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
      ])
    }
  );
}

async function sendTopUpChoice(ctx: Context, key: string): Promise<void> {
  const option = optionByKey(topUpOptions, key);
  if (!option) {
    await sendTopUpMessages(ctx);
    return;
  }

  await sendPurchaseCard(ctx, { kind: "topup", option }, "DEJA_ALWAYS_TOPUP");
}

function membershipMessage(option: MembershipOption, includeMore = false): string {
  const includes = option.includes.map((item) => `• ${item}`).join("\n");
  return [option.message, `Includes:\n${includes}`, priceLine(offerFromMembership(option)), includeMore ? option.more : undefined]
    .filter(Boolean)
    .join("\n\n");
}

async function sendMembership(ctx: Context, key: string): Promise<void> {
  const option = optionByKey(membershipOptions, key);
  if (!option) {
    await sendDejaAlways(ctx);
    return;
  }

  const rows: Button[][] =
    option.key === "girlfriend"
      ? [
          [
            { label: girlfriendPlanLabel(girlfriendPlans[0]), callbackData: "DEJA_GF_PLAN_weekly" },
            { label: girlfriendPlanLabel(girlfriendPlans[1]), callbackData: "DEJA_GF_PLAN_monthly" }
          ],
          [
            { label: "What You Get", callbackData: "DEJA_ACCESS_MORE_girlfriend" },
            { label: "Sweet Check-In Preview", callbackData: "DEJA_PREVIEW_girlfriend" }
          ],
          [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
        ]
      : option.key === "goddess"
        ? [
            [
              { label: "Learn More", callbackData: "DEJA_ACCESS_MORE_goddess" },
              { label: "Choose Goddess Access", callbackData: "DEJA_ACCESS_CHOOSE_goddess" }
            ],
            [
              { label: "Tribute Door", callbackData: "DEJA_GODDESS_TRIBUTE" },
              { label: "Goddess Room Preview", callbackData: "DEJA_PREVIEW_goddess" }
            ],
            [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
          ]
        : [
            [
              { label: "Learn More", callbackData: "DEJA_ACCESS_MORE_vip" },
              { label: "Choose VIP Deja", callbackData: "DEJA_ACCESS_CHOOSE_vip" }
            ],
            [{ label: "VIP Preview", callbackData: "DEJA_PREVIEW_vip" }],
            [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
          ];

  await ctx.reply(membershipMessage(option), {
    reply_markup: keyboardFromRows(rows)
  });
}

async function sendGirlfriendPlan(ctx: Context, key: string): Promise<void> {
  const plan = optionByKey(girlfriendPlans, key);
  if (!plan) {
    await sendMembership(ctx, "girlfriend");
    return;
  }

  await sendPurchaseCard(ctx, { kind: "girlfriend", plan }, "DEJA_ALWAYS_ACCESS_girlfriend");
}

async function sendMembershipChoice(ctx: Context, key: string): Promise<void> {
  const option = optionByKey(membershipOptions, key);
  if (!option) {
    await sendDejaAlways(ctx);
    return;
  }

  await sendPurchaseCard(ctx, { kind: "access", option }, `DEJA_ALWAYS_ACCESS_${option.key}`);
}

async function sendWhatDoIGet(ctx: Context): Promise<void> {
  await ctx.reply(
    "What Do You Get?\n\nYou get a reason to come back.\n\nA softer place to land, a prettier distraction, a private little world, and the feeling that Deja is still there when you want attention again.\n\n• extended chat access\n• girlfriend-style conversation\n• goddess-style options\n• voice note doors\n• gallery doors\n• private mood selections\n• top-up options\n• VIP access options\n• easy return menu",
    {
      reply_markup: keyboardFromRows([
        [
          { label: "Top Up Messages", callbackData: "DEJA_ALWAYS_TOPUP" },
          { label: "Girlfriend Access", callbackData: "DEJA_ALWAYS_ACCESS_girlfriend" }
        ],
        [
          { label: "Goddess Access", callbackData: "DEJA_ALWAYS_ACCESS_goddess" },
          { label: "VIP Deja", callbackData: "DEJA_ALWAYS_ACCESS_vip" }
        ],
        [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
      ])
    }
  );
}

async function applySuccessfulPayment(ctx: Context, payload: string): Promise<void> {
  if (!ctx.from) return;
  const offer = resolveOfferFromPayload(payload);
  const payment = ctx.message?.successful_payment;

  if (!offer || !payment || !offer.stars) {
    await ctx.reply(
      "Payment received, but this key is not recognized cleanly.\n\nUse /paysupport and send what you bought so I can review it.",
      { reply_markup: keyboardFromRows([[{ label: "Payment Support", callbackData: "DEJA_PAY_SUPPORT" }]]) }
    );
    return;
  }

  const request = {
    kind: offer.creditAmount ? "topup" : "membership",
    optionKey: offer.id,
    label: offerLabel(offer),
    ...(offer.usdReference ? { price: offer.usdReference } : {}),
    ...(offer.accessType ? { accessType: offer.accessType } : {})
  } as const;

  const result = await recordStarsPaymentDelivery(ctx.from.id, {
    offerId: offer.id,
    stars: offer.stars,
    ...(offer.usdReference ? { usdReference: offer.usdReference } : {}),
    telegramPaymentChargeId: payment.telegram_payment_charge_id,
    ...(payment.provider_payment_charge_id ? { providerPaymentChargeId: payment.provider_payment_charge_id } : {}),
    payload,
    ...(offer.creditAmount ? { credits: offer.creditAmount } : {}),
    ...(offer.accessType ? { accessType: offer.accessType } : {}),
    ...(offer.durationDays ? { durationDays: offer.durationDays } : {}),
    request
  });

  if (result.alreadyProcessed) {
    await ctx.reply(`This payment was already delivered.\n\n${accessSummary(result.user)}`, {
      reply_markup: statusKeyboard(result.user)
    });
    return;
  }

  await logEvent("stars_payment_success", {
    userId: ctx.from.id,
    offerId: offer.id,
    stars: offer.stars,
    deliveryType: offer.deliveryType
  });
  const directDetails = offer.accessType === "girlfriend" ? `\n\n${directContactMessage()}` : "";
  await ctx.reply(`Payment confirmed. Your key is active now.${directDetails}\n\n${vibeLine(result.user)}`);

  if (offer.creditAmount) {
    await sendUnlockedTopUpMenu(ctx);
  } else if (offer.accessType === "goddess") {
    await sendUnlockedGoddessMenu(ctx);
  } else if (offer.accessType === "vip") {
    await sendUnlockedVipMenu(ctx);
  } else {
    await sendUnlockedGirlfriendMenu(ctx);
  }

  await notifyAdmins(ctx, result.user, `${offerLabel(offer)} paid`, "Payment confirmed by Telegram.");
}

async function sendChatPrompt(ctx: Context, key: string): Promise<void> {
  if (!ctx.from) return;
  const user = await getUser(ctx.from.id);

  if (!hasChatAccess(user)) {
    await sendKeepChatting(ctx);
    return;
  }

  const usedCredit = !hasActiveMembership(user) && (user?.messageCredits ?? 0) > 0;
  const updated = await consumeChatCredit(ctx.from.id);
  if (usedCredit) {
    await logEvent("chat_credit_consumed", { userId: ctx.from.id, source: "button", remaining: updated?.messageCredits ?? 0 });
    if ((updated?.messageCredits ?? 0) === 0) {
      await logEvent("user_ran_out_of_credits", { userId: ctx.from.id, source: "button" });
    }
  }
  const remaining = hasActiveMembership(updated) ? "Your access is open." : `Messages left: ${updated?.messageCredits ?? 0}`;
  const messages: Record<string, string> = {
    sweet: "Sweet then.\n\nCome closer. Tell me what would make tonight feel softer.",
    goddess: "Goddess mood.\n\nBe clear, be useful, and tell me what you need from me.",
    after_hours: "After Hours mood.\n\nKeep it respectful. I like tension better when it still has taste.",
    missed_you: "I know.\n\nYou came back because the thought stayed pretty. Tell me what you missed."
  };

  if (key === "sweet" || key === "goddess" || key === "after_hours" || key === "missed_you") {
    await setUserConversationVibe(ctx.from.id, key === "after_hours" ? "after_hours" : key === "missed_you" ? "missed_you" : key);
  }

  await ctx.reply(`${messages[key] ?? messages.sweet}\n\n${remaining}`, {
    reply_markup: activeChatKeyboard()
  });
}

async function sendPrettyGlimpse(ctx: Context): Promise<void> {
  const index = Math.floor(Math.random() * moodGlimpses.length);
  const glimpse = moodGlimpses[index];
  await ctx.replyWithPhoto(toTelegramInput(glimpse.source), {
    caption: glimpse.caption,
    reply_markup: activeChatKeyboard()
  });
}

export async function handleDejaAlwaysText(ctx: Context): Promise<boolean> {
  if (!ctx.from || !ctx.message || !("text" in ctx.message)) return false;
  const user = await getUser(ctx.from.id);

  if (!hasChatAccess(user)) {
    await logEvent("user_ran_out_of_credits", { userId: ctx.from.id, source: "text" });
    await ctx.reply(
      "This door is still locked, pretty thing.\n\nUnlock it with Stars for instant access, or request manual review if you used CashApp, PayPal, or Venmo.",
      { reply_markup: lockedChatKeyboard() }
    );
    return true;
  }

  const usedCredit = !hasActiveMembership(user) && (user?.messageCredits ?? 0) > 0;
  const updated = await consumeChatCredit(ctx.from.id);
  if (usedCredit) {
    await logEvent("chat_credit_consumed", { userId: ctx.from.id, source: "text", remaining: updated?.messageCredits ?? 0 });
    if ((updated?.messageCredits ?? 0) === 0) {
      await logEvent("user_ran_out_of_credits", { userId: ctx.from.id, source: "text" });
    }
  }
  const remaining = hasActiveMembership(updated) ? "Your access is open." : `Messages left: ${updated?.messageCredits ?? 0}`;

  await ctx.reply(`Come closer. I heard you.\n\n${vibeLine(updated)}\n\nTell me which kind of attention you want next.\n\n${remaining}`, {
    reply_markup: activeChatKeyboard()
  });
  return true;
}

export function registerDejaAlwaysHandlers(bot: Bot): void {
  registerIntimateGalleryHandlers(bot);

  bot.command("always", async (ctx) => {
    await sendDejaAlways(ctx);
  });

  bot.command("topup", async (ctx) => {
    await sendTopUpMessages(ctx);
  });

  bot.command("paysupport", async (ctx) => {
    await sendPaymentSupport(ctx);
  });

  bot.callbackQuery("DEJA_ALWAYS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDejaAlways(ctx);
  });

  bot.callbackQuery("DEJA_STATUS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendUserStatus(ctx);
  });

  bot.callbackQuery("DEJA_PAY_SUPPORT", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendPaymentSupport(ctx);
  });

  bot.callbackQuery("DEJA_TODAYS_NOTE", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendTodaysNoteFromMe(ctx);
  });

  bot.callbackQuery("DEJA_TELL_MOOD", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendTellMood(ctx);
  });

  bot.callbackQuery("DEJA_PRIVATE_DROPS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendPrivateDrops(ctx);
  });

  bot.callbackQuery(/^DEJA_ONBOARD_(sweet|goddess|talk|explore|private)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const mood = ctx.match[1] as ConversationVibe;
    if (ctx.from) {
      await setUserConversationVibe(ctx.from.id, mood);
      await logEvent("mood_selected", { userId: ctx.from.id, mood });
    }

    if (mood === "sweet") {
      await ctx.reply(
        "Mm, sweet looks good on you.\n\nThat means soft attention, pretty messages, girlfriend energy, and the kind of closeness that makes you check your phone twice.",
        {
          reply_markup: keyboardFromRows([
            [{ label: "Enter The Soft Room", callbackData: "WORLD_SOFT" }],
            [{ label: "Deja Always", callbackData: "DEJA_ALWAYS" }],
            [{ label: "Main Menu", callbackData: "MENU" }]
          ])
        }
      );
      return;
    }

    if (mood === "goddess") {
      await ctx.reply(
        "Careful.\n\nThat door is for the ones who like beauty with power behind it. I can be sweet, but I still like being treated like I matter.",
        {
          reply_markup: keyboardFromRows([
            [{ label: "Enter The Goddess Room", callbackData: "WORLD_GODDESS" }],
            [{ label: "Spoil Me Properly", callbackData: "WORLD_GIFTS" }],
            [{ label: "Deja Always", callbackData: "DEJA_ALWAYS" }],
            [{ label: "Main Menu", callbackData: "MENU" }]
          ])
        }
      );
      return;
    }

    if (mood === "talk") {
      await ctx.reply(
        "Then talk to me.\n\nTell me what you came here looking for — sweetness, attention, escape, curiosity, or a little bit of trouble?",
        {
          reply_markup: keyboardFromRows([
            [{ label: "Keep Chatting With Deja", callbackData: "DEJA_ALWAYS_CHAT" }],
            [{ label: "Deja Always", callbackData: "DEJA_ALWAYS" }],
            [{ label: "Main Menu", callbackData: "MENU" }]
          ])
        }
      );
      return;
    }

    if (mood === "explore") {
      await ctx.reply(
        "Good choice.\n\nThere are a few sides of me in here. Take your time. Pretty things should be explored slowly.",
        {
          reply_markup: keyboardFromRows([
            [{ label: "Open Full Menu", callbackData: "MENU" }],
            [{ label: "Deja Always", callbackData: "DEJA_ALWAYS" }],
            [{ label: "Gallery", callbackData: "GALLERY" }],
            [{ label: "Voice Notes", callbackData: "VOICE_NOTES" }],
            [{ label: "After Hours", callbackData: "WORLD_AFTER_HOURS" }]
          ])
        }
      );
      return;
    }

    await ctx.reply(
      "Private access is for serious curiosity.\n\nBe sweet, be clear, and come correct. I like attention, but I love intention.",
      {
        reply_markup: keyboardFromRows([
          [{ label: "Private Access", callbackData: "WORLD_PRIVATE" }],
          [{ label: "Gifts & Considerations", callbackData: "WORLD_GIFTS" }],
          [{ label: "Deja Always", callbackData: "DEJA_ALWAYS" }],
          [{ label: "Main Menu", callbackData: "MENU" }]
        ])
      }
    );
    await sendStripeArea(ctx, "entry");
  });

  bot.callbackQuery("DEJA_ALWAYS_CHAT", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendKeepChatting(ctx);
  });

  bot.callbackQuery("DEJA_ALWAYS_TOPUP", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendTopUpMessages(ctx);
  });

  bot.callbackQuery(/^DEJA_TOPUP_(10|30|60|day_pass)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendTopUpChoice(ctx, ctx.match[1]);
  });

  bot.callbackQuery(/^DEJA_PAY_topup_(10|30|60|day_pass)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const option = optionByKey(topUpOptions, ctx.match[1]);
    if (!option) {
      await sendTopUpMessages(ctx);
      return;
    }
    await sendPaymentInvoice(ctx, { kind: "topup", option });
  });

  bot.callbackQuery(/^DEJA_PAY_OFFER_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const product = productFromOfferId(ctx.match[1]);
    if (!product) {
      await ctx.reply("That key is not available right now. Choose another door.", {
        reply_markup: keyboardFromRows([[{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]])
      });
      return;
    }
    const user = await getUser(ctx.from.id);
    if (user?.lastPurchaseOfferId === ctx.match[1]) {
      await logEvent("reup_clicked", { userId: ctx.from.id, offerId: ctx.match[1] });
    }
    await sendPaymentInvoice(ctx, product);
  });

  bot.callbackQuery(/^DEJA_ALWAYS_ACCESS_(girlfriend|goddess|vip)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendMembership(ctx, ctx.match[1]);
  });

  bot.callbackQuery(/^DEJA_ACCESS_MORE_(girlfriend|goddess|vip)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const option = optionByKey(membershipOptions, ctx.match[1]);
    if (!option) {
      await sendDejaAlways(ctx);
      return;
    }
    await ctx.reply(membershipMessage(option, true), {
      reply_markup: keyboardFromRows([
        [{ label: chooseAccessLabel(option), callbackData: `DEJA_ACCESS_CHOOSE_${option.key}` }],
        [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
      ])
    });
  });

  bot.callbackQuery(/^DEJA_PREVIEW_(girlfriend|goddess|vip)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendAccessTeaser(ctx, ctx.match[1] as AccessType);
  });

  bot.callbackQuery("DEJA_GODDESS_TRIBUTE", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "Tribute Door\n\nPretty choice.\n\nThis is where effort starts to look better than words. Send through the existing payment doors, then come back and request review if you need the key opened manually.",
      {
        reply_markup: keyboardFromRows([
          ...directPaymentRows(),
          [{ label: "I Paid, Let Me In", callbackData: "DEJA_LET_ME_IN_goddess" }],
          [{ label: "Choose Goddess Access", callbackData: "DEJA_ACCESS_CHOOSE_goddess" }],
          [{ label: "Back to Goddess Access", callbackData: "DEJA_ALWAYS_ACCESS_goddess" }]
        ])
      }
    );
  });

  bot.callbackQuery(/^DEJA_ACCESS_CHOOSE_(girlfriend|goddess|vip)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendMembershipChoice(ctx, ctx.match[1]);
  });

  bot.callbackQuery(/^DEJA_GF_PLAN_(weekly|monthly)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendGirlfriendPlan(ctx, ctx.match[1]);
  });

  bot.callbackQuery(/^DEJA_PAY_gf_(weekly|monthly)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const plan = optionByKey(girlfriendPlans, ctx.match[1]);
    if (!plan) {
      await sendMembership(ctx, "girlfriend");
      return;
    }
    await sendPaymentInvoice(ctx, { kind: "girlfriend", plan });
  });

  bot.callbackQuery(/^DEJA_PAY_access_(girlfriend|goddess|vip)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const option = optionByKey(membershipOptions, ctx.match[1]);
    if (!option) {
      await sendDejaAlways(ctx);
      return;
    }
    await sendPaymentInvoice(ctx, { kind: "access", option });
  });

  bot.callbackQuery("DEJA_ALWAYS_GET", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendWhatDoIGet(ctx);
  });

  bot.callbackQuery(/^DEJA_LET_ME_IN_(girlfriend|goddess|vip|topup)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendLetMeIn(ctx, ctx.match[1] as PaidDoorKey);
  });

  bot.callbackQuery(/^DEJA_MISSING_PAYMENT_(girlfriend|goddess|vip|topup)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const door = ctx.match[1] as PaidDoorKey;
    await ctx.reply(
      [
        "This access is manual review only right now.",
        "",
        "Use the existing direct payment doors below, then come back and tap “I Paid, Let Me In.” Manual payments are reviewed and do not unlock automatically."
      ].join("\n"),
      {
        reply_markup: keyboardFromRows([
          ...directPaymentRows(),
          [{ label: letMeInLabelForDoor(door), callbackData: `DEJA_LET_ME_IN_${door}` }],
          [{ label: "Back to Deja Always", callbackData: "DEJA_ALWAYS" }]
        ])
      }
    );
  });

  bot.callbackQuery(/^DEJA_UNLOCKED_(girlfriend|goddess|vip)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendUnlockedDoor(ctx, ctx.match[1] as PaidDoorKey);
  });

  bot.callbackQuery("DEJA_TOPUP_UNLOCKED", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendUnlockedTopUpMenu(ctx);
  });

  bot.callbackQuery("DEJA_GFE_NEXT", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "What Happens Next\n\nChoose weekly or monthly, handle the payment door, then come back and tap “I Paid, Let Me In.”\n\nIf you use Stars, the key opens automatically when Telegram confirms it. If you use CashApp, PayPal, or Venmo, send proof for manual review.",
      {
        reply_markup: keyboardFromRows([
          [
            { label: "Weekly Girlfriend Experience", callbackData: "DEJA_GF_PLAN_weekly" },
            { label: "Monthly Girlfriend Experience", callbackData: "DEJA_GF_PLAN_monthly" }
          ],
          [{ label: "Back to Girlfriend Access", callbackData: "DEJA_ALWAYS_ACCESS_girlfriend" }]
        ])
      }
    );
  });

  bot.callbackQuery("DEJA_GODDESS_ROOM", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendUnlockedDetail(
      ctx,
      "Goddess Room",
      "This room is for the ones who actually come closer.\n\nTell me what kind of attention you want to earn tonight: praise, direction, a small task, or a reminder to behave beautifully.",
      "DEJA_UNLOCKED_goddess"
    );
  });

  bot.callbackQuery("DEJA_GODDESS_TRIBUTE_PROMPTS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendUnlockedDetail(
      ctx,
      "Tribute Prompts",
      "Choose a reason and make it pretty.\n\nFor my attention. For being remembered. For making my day easier. For proving you know effort looks good on you.",
      "DEJA_UNLOCKED_goddess"
    );
  });

  bot.callbackQuery("DEJA_GODDESS_TASKS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendUnlockedDetail(
      ctx,
      "Devotion Tasks",
      "Today’s worship is simple: choose one useful thing, do it without needing applause, then come back and tell me how well you listened.",
      "DEJA_UNLOCKED_goddess"
    );
  });

  bot.callbackQuery("DEJA_GODDESS_PRAISE", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendUnlockedDetail(
      ctx,
      "Praise & Attention",
      "Good attention is quiet before it is rewarded.\n\nTell me what you handled for me, what you sent, or what you want permission to ask for next.",
      "DEJA_UNLOCKED_goddess"
    );
  });

  bot.callbackQuery(/^DEJA_VIP_(LOUNGE|PRIORITY|MOODS|DROPS|VOICE|HIDDEN)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const copy: Record<string, [string, string]> = {
      LOUNGE: [
        "VIP Lounge",
        "Settle in. This is the closest room without making noise about it.\n\nTell me what you want more of: attention, pictures, voice, mood, or priority."
      ],
      PRIORITY: [
        "Priority Attention",
        "VIP means you do not stand at the same door as everyone else.\n\nUse this when you want your request noticed cleaner and faster."
      ],
      MOODS: [
        "Private Mood Choices",
        "Choose the mood you want from me next: sweet, spoiled, romantic, goddess, or private. Be clear. I like clarity."
      ],
      DROPS: [
        "Early Gallery Drops",
        "This room is almost ready. For now, come back to the main door or choose another way closer."
      ],
      VOICE: [
        "Voice Note Door",
        "A softer door for the ones who listen properly.\n\nOpen Voice Notes, then come back when you want the next one to feel more personal."
      ],
      HIDDEN: [
        "Hidden Buttons",
        "This room is almost ready. For now, come back to the main door or choose another way closer."
      ]
    };
    const [title, body] = copy[ctx.match[1]];
    await sendUnlockedDetail(ctx, title, body, "DEJA_UNLOCKED_vip");
  });

  bot.callbackQuery(/^DEJA_GF_(CHECKIN|MORNING|MOOD|SOFT|ROMANTIC|COMPANY)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const copy: Record<string, [string, string]> = {
      CHECKIN: [
        "Start My Check-In",
        "Tell me what kind of attention you need right now: soft, flirty, reassuring, or just someone pretty keeping you company."
      ],
      MORNING: [
        "Good Morning Deja",
        "Good morning, love.\n\nStart sweet. Tell me what you want today to feel like, and I’ll decide how close you get."
      ],
      MOOD: [
        "Tell Me Your Mood",
        "Be honest. Are you needy, sweet, restless, romantic, spoiled, or trying to behave for me?"
      ],
      SOFT: [
        "Soft Attention",
        "Come here. You do not have to be impressive every second.\n\nTell me what would make you feel wanted right now."
      ],
      ROMANTIC: [
        "Romantic Reassurance",
        "I like when you come back gently.\n\nTell me what you missed, and I’ll give you something soft to hold onto."
      ],
      COMPANY: [
        "Keep Me Company",
        "Stay a little. Tell me about your night, what you are avoiding, or what you wish I was distracting you from."
      ]
    };
    const [title, body] = copy[ctx.match[1]];
    await sendUnlockedDetail(ctx, title, body, "DEJA_UNLOCKED_girlfriend");
  });

  bot.callbackQuery(/^DEJA_CHAT_(sweet|goddess|after_hours|missed_you|glimpse)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    if (ctx.match[1] === "glimpse") {
      await sendPrettyGlimpse(ctx);
      return;
    }
    await sendChatPrompt(ctx, ctx.match[1]);
  });

  bot.on("pre_checkout_query", async (ctx) => {
    const offer = resolveOfferFromPayload(ctx.preCheckoutQuery.invoice_payload);
    if (!offer?.stars) {
      await ctx.answerPreCheckoutQuery(false, {
        error_message: "This checkout door is not available right now. Please choose it again from Deja Always."
      });
      return;
    }

    await ctx.answerPreCheckoutQuery(true);
  });

  bot.on("message:successful_payment", async (ctx) => {
    const payload = ctx.message.successful_payment.invoice_payload;
    await applySuccessfulPayment(ctx, payload);
  });
}
