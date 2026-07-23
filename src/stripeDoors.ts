import { InlineKeyboard, type Bot, type Context } from "grammy";
import { adminReviewKeyboard } from "./admin.js";
import { config } from "./config.js";
import {
  createManualPaymentRequest,
  logEvent,
  type AccessRequestKind,
  type AccessType,
  type ManualPaymentType
} from "./storage.js";

export type StripeDoorArea = "menu" | "keep_messaging" | "girlfriend" | "private" | "spoil" | "entry";

type StripeDoorKey = "exclusive" | "closer" | "stay" | "gfe" | "private" | "monthly";

type StripeDoor = {
  key: StripeDoorKey;
  label: string;
  requestKind: AccessRequestKind;
  accessType?: AccessType;
};

type DirectPaymentMethod = {
  label: string;
  url?: string;
};

type ManualPaymentDraft = {
  selectedType: ManualPaymentType;
  createdAt: number;
};

const manualPaymentDrafts = new Map<string, ManualPaymentDraft>();
const manualPaymentDraftTtlMs = 10 * 60 * 1000;

function envLink(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

const cashAppLink = envLink("CASHAPP_LINK", "https://cash.app/Dasiaamess");
const venmoLink = envLink("VENMO_LINK", "https://venmo.com/Dejjavu");
const paypalLink = envLink("PAYPAL_LINK", "https://paypal.me/Darinamess");

// External payment doors stay direct-only. They do not auto-open access.
const stripeDoors: StripeDoor[] = [
  {
    key: "exclusive",
    label: "The Exclusive Entrance",
    requestKind: "membership",
    accessType: "vip"
  },
  {
    key: "closer",
    label: "Closer to the Experience",
    requestKind: "topup"
  },
  {
    key: "stay",
    label: "Stay a Little Longer",
    requestKind: "topup"
  },
  {
    key: "gfe",
    label: "The GFE",
    requestKind: "membership",
    accessType: "girlfriend"
  },
  {
    key: "private",
    label: "Open the Private Door",
    requestKind: "membership",
    accessType: "vip"
  },
  {
    key: "monthly",
    label: "Closer to Her Monthly",
    requestKind: "membership",
    accessType: "girlfriend"
  }
];

const areaDoorKeys: Record<StripeDoorArea, StripeDoorKey[]> = {
  menu: ["exclusive", "closer", "stay", "gfe", "private", "monthly"],
  keep_messaging: ["stay", "closer"],
  girlfriend: ["gfe", "monthly"],
  private: ["private", "exclusive"],
  spoil: ["exclusive"],
  entry: ["closer"]
};

const paymentMenuCopy =
  "Choose the door that feels right. Stars is the clean instant path inside the bot. CashApp, PayPal, and Venmo stay manual, reviewed, and intentional.";

const directPaymentCopy =
  "Direct payment doors use CashApp, PayPal, or Venmo only. These links are for tributes, special requests, girlfriend-style consideration, and spoil options that happen inside Telegram.\n\nFor automatic in-bot access, use Telegram Stars inside Deja Always. Direct payments do not auto-open access inside Telegram. They need a clean manual review.";

const supportCopy =
  "Need help with a payment or access? Use Telegram Stars for instant access. For CashApp, PayPal, or Venmo support, send what you purchased, the payment method, amount, and the time it was sent. Manual payments are reviewed before any key opens.";

const termsCopy =
  "Deja World is an 18+ private digital experience. Payments are for digital access, support, interaction, or curated online experiences. No payment guarantees anything outside the stated digital offer. Be respectful, intentional, and clear.\n\nA little clarity, love: some doors here are automated to keep the world open when I’m away. Anything personally sent by me will be clear, and paid access does not promise live replies.";

function doorsForArea(area: StripeDoorArea): StripeDoor[] {
  const keys = new Set(areaDoorKeys[area]);
  return stripeDoors.filter((door) => keys.has(door.key));
}

function directPaymentMethods(): Array<Required<DirectPaymentMethod>> {
  return [
    { label: "CashApp", url: cashAppLink },
    { label: "PayPal", url: paypalLink },
    { label: "Venmo", url: venmoLink }
  ].filter((method): method is Required<DirectPaymentMethod> => Boolean(method.url));
}

function stripeAreaKeyboard(area: StripeDoorArea): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  keyboard.text("Instant Stars Access", "DEJA_ALWAYS").row();

  for (const door of doorsForArea(area)) {
    keyboard.text(door.label, `STRIPE_CONFIRM_${door.key}`).row();
  }

  keyboard.text("Main Menu", "MENU");
  return keyboard;
}

function directPaymentKeyboard(door: StripeDoor): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  for (const method of directPaymentMethods()) {
    keyboard.url(method.label, method.url).row();
  }

  if (door.requestKind === "topup") {
    keyboard.text("Instant Stars Top-Up", "DEJA_ALWAYS_TOPUP").row();
  } else if (door.accessType === "girlfriend") {
    keyboard.text("Instant Stars Access", "DEJA_ALWAYS_ACCESS_girlfriend").row();
  } else if (door.accessType === "vip") {
    keyboard.text("Private Access", "WORLD_PRIVATE").row();
  }

  keyboard.text("I sent a manual payment", "MANUAL_PAYMENT_START").row();
  keyboard.text("Choose Your Door", "STRIPE_DOORS").text("Main Menu", "MENU");
  return keyboard;
}

function manualTypeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Message Credits", "MANUAL_PAYMENT_TYPE_message_credits")
    .row()
    .text("Girlfriend Access", "MANUAL_PAYMENT_TYPE_girlfriend")
    .row()
    .text("Goddess Access", "MANUAL_PAYMENT_TYPE_goddess")
    .row()
    .text("VIP Access", "MANUAL_PAYMENT_TYPE_vip")
    .row()
    .text("Private Access", "MANUAL_PAYMENT_TYPE_private")
    .row()
    .text("Other", "MANUAL_PAYMENT_TYPE_other")
    .row()
    .text("Cancel", "MANUAL_PAYMENT_CANCEL");
}

function manualAccessType(selectedType: ManualPaymentType): AccessType | undefined {
  if (selectedType === "girlfriend" || selectedType === "goddess" || selectedType === "vip") return selectedType;
  if (selectedType === "private") return "vip";
  return undefined;
}

function manualRequestKind(selectedType: ManualPaymentType): AccessRequestKind {
  return selectedType === "message_credits" ? "topup" : "membership";
}

function manualTypeLabel(selectedType: ManualPaymentType): string {
  if (selectedType === "message_credits") return "Message Credits";
  if (selectedType === "girlfriend") return "Girlfriend Access";
  if (selectedType === "goddess") return "Goddess Access";
  if (selectedType === "vip") return "VIP Access";
  if (selectedType === "private") return "Private Access";
  return "Other";
}

function getManualDraft(userId: string): ManualPaymentDraft | undefined {
  const draft = manualPaymentDrafts.get(userId);
  if (!draft) return undefined;
  if (Date.now() - draft.createdAt > manualPaymentDraftTtlMs) {
    manualPaymentDrafts.delete(userId);
    return undefined;
  }
  return draft;
}

async function notifyManualPaymentAdmins(ctx: Context, requestId: string, userId: string, selectedType: ManualPaymentType, note?: string): Promise<void> {
  if (config.adminTelegramIds.length === 0) return;
  const accessType = manualAccessType(selectedType);
  const message = [
    "Manual payment request needs review",
    "",
    `Request ID: ${requestId}`,
    `User: ${ctx.from?.first_name ?? "Unknown"}${ctx.from?.username ? ` (@${ctx.from.username})` : ""}`,
    `Telegram ID: ${userId}`,
    `Selected type: ${selectedType}`,
    note ? `Note: ${note}` : "Note: attachment only or no note",
    "",
    "Manual payments do not unlock automatically."
  ].join("\n");

  for (const adminId of config.adminTelegramIds) {
    try {
      await ctx.api.sendMessage(adminId, message, {
        reply_markup: adminReviewKeyboard(userId, manualRequestKind(selectedType), accessType)
      });
    } catch {
      // Admin notification should never interrupt the user flow.
    }
  }
}

export async function sendStripeArea(ctx: Context, area: StripeDoorArea, intro = "Or choose a payment door below."): Promise<void> {
  await logEvent("manual_payment_door_opened", { userId: ctx.from?.id, area });
  await ctx.reply(`${intro}\n\n${directPaymentCopy}`, {
    reply_markup: stripeAreaKeyboard(area)
  });
}

export async function sendStripePaymentMenu(ctx: Context): Promise<void> {
  await sendStripeArea(ctx, "menu", `Choose Your Door\n\n${paymentMenuCopy}`);
}

async function sendDirectPaymentDoor(ctx: Context, key: string): Promise<void> {
  const door = stripeDoors.find((item) => item.key === key);
  if (!door) {
    await sendStripePaymentMenu(ctx);
    return;
  }

  await logEvent("manual_payment_door_opened", { userId: ctx.from?.id, door: door.key, accessType: door.accessType });
  await ctx.reply(
    `${door.label}\n\nChoose a verified direct payment method below only if you want manual review.\n\nThis does not auto-unlock access. Telegram Stars is the instant path inside Deja Always. After you send manually, use the proof button so I know what to review.`,
    {
      reply_markup: directPaymentKeyboard(door)
    }
  );
}

export function registerStripeDoorHandlers(bot: Bot): void {
  bot.command("terms", async (ctx) => {
    await ctx.reply(termsCopy, {
      reply_markup: new InlineKeyboard().text("Main Menu", "MENU")
    });
  });

  bot.command("support", async (ctx) => {
    await ctx.reply(supportCopy, {
      reply_markup: new InlineKeyboard().text("Text / Contact", "WORLD_PRIVATE_CONTACT").text("Main Menu", "MENU")
    });
  });

  bot.callbackQuery("STRIPE_DOORS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendStripePaymentMenu(ctx);
  });

  bot.callbackQuery("MANUAL_PAYMENT_START", async (ctx) => {
    await ctx.answerCallbackQuery();
    await logEvent("manual_review_started", { userId: ctx.from.id });
    await ctx.reply(
      "Manual payments are reviewed. They do not unlock automatically.\n\nPick what you sent it for so the request lands in the right place.",
      { reply_markup: manualTypeKeyboard() }
    );
  });

  bot.callbackQuery(/^MANUAL_PAYMENT_TYPE_(message_credits|girlfriend|goddess|vip|private|other)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await logEvent("manual_review_started", { userId: ctx.from.id, type: ctx.match[1] });
    await logEvent("manual_payment_type_selected", { userId: ctx.from.id, type: ctx.match[1] });
    manualPaymentDrafts.set(String(ctx.from.id), {
      selectedType: ctx.match[1] as ManualPaymentType,
      createdAt: Date.now()
    });

    await ctx.reply(
      "Good. Now send a short note or screenshot.\n\nInclude the payment method, amount, and what name it was sent under. I’ll review it manually before any key opens."
    );
  });

  bot.callbackQuery("MANUAL_PAYMENT_CANCEL", async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Manual review canceled." });
    manualPaymentDrafts.delete(String(ctx.from.id));
    await ctx.reply("Manual review canceled.", {
      reply_markup: new InlineKeyboard().text("Choose Your Door", "STRIPE_DOORS").text("Main Menu", "MENU")
    });
  });

  bot.callbackQuery(/^STRIPE_RETURN_(menu|keep_messaging|girlfriend|private|spoil|entry)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const area = ctx.match[1] as StripeDoorArea;
    await sendStripeArea(ctx, area, "That return button has been replaced with verified payment doors.");
  });

  bot.callbackQuery(/^STRIPE_CONFIRM_(exclusive|closer|stay|gfe|private|monthly)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDirectPaymentDoor(ctx, ctx.match[1]);
  });

  bot.on(["message:text", "message:photo", "message:document"], async (ctx, next) => {
    if (!ctx.from || !ctx.message) {
      await next();
      return;
    }

    const userId = String(ctx.from.id);
    const draft = getManualDraft(userId);
    if (!draft) {
      await next();
      return;
    }

    const note = "text" in ctx.message && ctx.message.text ? ctx.message.text.trim() : undefined;
    const photoFileId =
      "photo" in ctx.message && Array.isArray(ctx.message.photo) ? ctx.message.photo.at(-1)?.file_id : undefined;
    const documentFileId =
      "document" in ctx.message && ctx.message.document ? ctx.message.document.file_id : undefined;
    const attachmentFileId = photoFileId ?? documentFileId;

    if (!note && !attachmentFileId) {
      await ctx.reply("Send a short note or a screenshot so I know what to review.");
      return;
    }

    const { request } = await createManualPaymentRequest(ctx.from, draft.selectedType, {
      ...(note ? { note } : {}),
      ...(attachmentFileId ? { attachmentFileId } : {})
    });

    manualPaymentDrafts.delete(userId);
    await notifyManualPaymentAdmins(ctx, request.requestId, userId, draft.selectedType, note);
    await logEvent("manual_proof_submitted", {
      userId,
      type: draft.selectedType,
      hasAttachment: Boolean(attachmentFileId),
      hasNote: Boolean(note)
    });
    await ctx.reply(
      `I have your ${manualTypeLabel(draft.selectedType)} manual payment request.\n\nIt is waiting for review. Manual payments do not unlock automatically, but your request is now in the right place.`,
      {
        reply_markup: new InlineKeyboard()
          .text("Payment Support", "DEJA_PAY_SUPPORT")
          .row()
          .text("Deja Always", "DEJA_ALWAYS")
          .text("Main Menu", "MENU")
      }
    );
  });
}
