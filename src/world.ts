import { InlineKeyboard, type Bot, type Context } from "grammy";
import { registerDejaAlwaysHandlers, sendOnboardingMood } from "./dejaAlways.js";
import { futureReupOptions, futureSpoilOptions, futureWorshipOptions } from "./editLater.js";
import { sendGallery } from "./gallery.js";
import { sendLinks } from "./links.js";
import { registerStripeDoorHandlers, sendStripeArea } from "./stripeDoors.js";
import { getLinks, getUser, logEvent, setUserMemory, type LinkRecord } from "./storage.js";
import { sendVoiceNotes } from "./voiceNotes.js";
import { sendTodaysWorship } from "./worship.js";
import {
  brandName,
  defaultReupOptions,
  defaultSpoilOptions,
  defaultWorshipOptions,
  linkPlaceholders,
  sectionCopy,
  type LinkLookup,
  type ReupOption,
  type SpoilOption
} from "./worldConfig.js";

type DoorwayButton = {
  label: string;
  url?: string;
  callbackData?: string;
};

type LookupDoorwayButton = DoorwayButton & {
  lookup?: LinkLookup;
};

function envValue(name?: string): string | undefined {
  if (!name) return undefined;
  const value = process.env[name]?.trim();
  return value || undefined;
}

async function linkMap(): Promise<Map<string, LinkRecord>> {
  return new Map((await getLinks()).map((link) => [link.key, link]));
}

async function resolveLink(lookup: LinkLookup): Promise<string | undefined> {
  const fromEnv = envValue(lookup.env);
  if (fromEnv) return fromEnv;
  if (!lookup.key) return undefined;

  const links = await linkMap();
  return links.get(lookup.key)?.url || undefined;
}

async function resolveDoorwayButtons(buttons: LookupDoorwayButton[]): Promise<DoorwayButton[]> {
  return Promise.all(
    buttons.map(async (button) => {
      if ("lookup" in button && button.lookup) {
        return {
          label: button.label,
          url: await resolveLink(button.lookup),
          callbackData: button.callbackData
        };
      }
      return button;
    })
  );
}

function keyboardFromRows(rows: DoorwayButton[][]): InlineKeyboard {
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

function buttonRows(buttons: DoorwayButton[], perRow = 2): DoorwayButton[][] {
  const rows: DoorwayButton[][] = [];

  for (let index = 0; index < buttons.length; index += perRow) {
    rows.push(buttons.slice(index, index + perRow));
  }

  return rows;
}

function directPaymentButtons(primaryLabel = "CashApp"): LookupDoorwayButton[] {
  return [
    { label: primaryLabel, url: envValue("CASHAPP_LINK") ?? "https://cash.app/Dasiaamess" },
    { label: "PayPal", url: envValue("PAYPAL_LINK") ?? "https://paypal.me/Darinamess" },
    { label: "Venmo", url: envValue("VENMO_LINK") ?? "https://venmo.com/Dejjavu" }
  ];
}

function primaryDirectPaymentLabel(option: { buttons: Array<{ label: string }> }, fallback = "CashApp"): string {
  const label = option.buttons[0]?.label;
  if (!label) return fallback;
  return /\b(open|wishlist|throne|form|booking|contact)\b/i.test(label) ? fallback : label;
}

function spoilCallbackData(key: string): string {
  return `WORLD_SPOIL_${key}`;
}

function spoilOptions(): SpoilOption[] {
  return [...futureSpoilOptions, ...defaultSpoilOptions];
}

function worshipOptions(): ReupOption[] {
  return [...futureWorshipOptions, ...defaultWorshipOptions];
}

function reupOptions(): ReupOption[] {
  return [...futureReupOptions, ...defaultReupOptions];
}

function mainMenuKeyboard(): InlineKeyboard {
  return keyboardFromRows([
    [
      { label: "Gallery", callbackData: "GALLERY" },
      { label: "Voice Notes", callbackData: "VOICE_NOTES" }
    ],
    [
      { label: "The Soft Room", callbackData: "WORLD_SOFT" },
      { label: "The Goddess Room", callbackData: "WORLD_GODDESS" }
    ],
    [{ label: "Deja Always", callbackData: "DEJA_ALWAYS" }],
    [
      { label: "After Hours", callbackData: "WORLD_AFTER_HOURS" },
      { label: "Spoil Me 💎", callbackData: "WORLD_GIFTS" }
    ],
    [
      { label: "Worship 👑", callbackData: "WORLD_WORSHIP" },
      { label: "Reups ⚡", callbackData: "WORLD_REUPS" }
    ],
    [
      { label: "Private Access", callbackData: "WORLD_PRIVATE" },
      { label: "Official Links", callbackData: "WORLD_OFFICIAL_LINKS" }
    ],
    [{ label: "Rules", callbackData: "WORLD_RULES" }]
  ]);
}

async function rememberRoom(ctx: Context, room: string): Promise<void> {
  if (!ctx.from) return;
  await setUserMemory(ctx.from.id, { lastRoomVisited: room });
  await logEvent("room_opened", { userId: ctx.from.id, room });
}

function returnKeyboard(): InlineKeyboard {
  return keyboardFromRows([
    [
      { label: "Main Menu", callbackData: "MENU" },
      { label: "Gallery", callbackData: "GALLERY" }
    ],
    [
      { label: "Voice Notes", callbackData: "VOICE_NOTES" },
      { label: "Spoil Me 💎", callbackData: "WORLD_GIFTS" }
    ],
    [
      { label: "Worship 👑", callbackData: "WORLD_WORSHIP" },
      { label: "Reups ⚡", callbackData: "WORLD_REUPS" }
    ],
    [{ label: "Deja Always", callbackData: "DEJA_ALWAYS" }],
    [{ label: "Private Access", callbackData: "WORLD_PRIVATE" }]
  ]);
}

async function sendDoorway(ctx: Context, message: string, buttons: LookupDoorwayButton[]): Promise<void> {
  const resolved = await resolveDoorwayButtons(buttons);
  const rows: DoorwayButton[][] = [];

  for (const button of resolved) {
    if (button.url || button.callbackData) {
      rows.push([button]);
    }
  }

  rows.push([
    { label: "Main Menu", callbackData: "MENU" },
    { label: "Private Access", callbackData: "WORLD_PRIVATE" }
  ]);

  await ctx.reply(message, {
    reply_markup: keyboardFromRows(rows)
  });
}

export async function sendMainMenu(ctx: Context): Promise<void> {
  await ctx.reply(sectionCopy.menu, {
    reply_markup: mainMenuKeyboard()
  });
}

async function sendSoftRoom(ctx: Context): Promise<void> {
  await ctx.reply(sectionCopy.softRoom, {
    reply_markup: keyboardFromRows([
      [
        { label: "Sweet Deja", callbackData: "WORLD_SOFT_SWEET" },
        { label: "Romantic Mood", callbackData: "WORLD_SOFT_ROMANTIC" }
      ],
      [
        { label: "Come Closer", callbackData: "WORLD_SOFT_CLOSER" },
        { label: "Back to Menu", callbackData: "MENU" }
      ]
    ])
  });
}

async function sendGoddessRoom(ctx: Context): Promise<void> {
  await ctx.reply(sectionCopy.goddessRoom, {
    reply_markup: keyboardFromRows([
      [
        { label: "Worship Energy", callbackData: "WORLD_GODDESS_WORSHIP" },
        { label: "Spoil Me Properly", callbackData: "WORLD_GODDESS_SPOIL" }
      ],
      [
        { label: "Rules of Attention", callbackData: "WORLD_GODDESS_RULES" },
        { label: "Back to Menu", callbackData: "MENU" }
      ]
    ])
  });
}

async function sendAfterHours(ctx: Context): Promise<void> {
  await ctx.reply(sectionCopy.afterHours, {
    reply_markup: keyboardFromRows([
      [
        { label: "Teaser Door", callbackData: "WORLD_AFTER_TEASER" },
        { label: "Clips / Premium", callbackData: "WORLD_AFTER_CLIPS" }
      ],
      [
        { label: "Private Content", callbackData: "WORLD_AFTER_PRIVATE" },
        { label: "Back to Menu", callbackData: "MENU" }
      ]
    ])
  });
}

async function sendGifts(ctx: Context): Promise<void> {
  const giftButtons = spoilOptions().map((option) => ({
    label: option.label,
    callbackData: spoilCallbackData(option.key)
  }));

  await ctx.reply(sectionCopy.spoilMenu, {
    reply_markup: keyboardFromRows([
      ...buttonRows(giftButtons),
      [
        { label: "Private Access", callbackData: "WORLD_PRIVATE" },
        { label: "Official Links", callbackData: "WORLD_OFFICIAL_LINKS" }
      ],
      [{ label: "Back to Menu", callbackData: "MENU" }]
    ])
  });

  await sendStripeArea(
    ctx,
    "spoil",
    "Support my world in whatever way feels natural. Every door is different, but the intention is always felt."
  );
}

async function sendWorshipDoorway(ctx: Context): Promise<void> {
  const worshipButtons = worshipOptions().map((option) => ({
    label: option.label,
    callbackData: `WORLD_WORSHIP_GIFT_${option.key}`
  }));

  await ctx.reply(sectionCopy.worshipDoorway, {
    reply_markup: keyboardFromRows([
      ...buttonRows(worshipButtons),
      [
        { label: "Today’s Worship", callbackData: "WORLD_TODAYS_WORSHIP" },
        { label: "Reups ⚡", callbackData: "WORLD_REUPS" }
      ],
      [
        { label: "Spoil Me 💎", callbackData: "WORLD_GIFTS" },
        { label: "Back to Menu", callbackData: "MENU" }
      ]
    ])
  });
}

async function sendReups(ctx: Context): Promise<void> {
  const reupButtons = reupOptions().map((option) => ({
    label: option.label,
    callbackData: `WORLD_REUP_${option.key}`
  }));

  await ctx.reply(sectionCopy.reups, {
    reply_markup: keyboardFromRows([
      ...buttonRows(reupButtons),
      [
        { label: "Worship 👑", callbackData: "WORLD_WORSHIP" },
        { label: "Spoil Me 💎", callbackData: "WORLD_GIFTS" }
      ],
      [{ label: "Back to Menu", callbackData: "MENU" }]
    ])
  });

  await sendStripeArea(ctx, "keep_messaging");
}

async function sendPrivateAccess(ctx: Context): Promise<void> {
  await ctx.reply(sectionCopy.privateAccess, {
    reply_markup: keyboardFromRows([
      [
        { label: "Request Private Time", callbackData: "WORLD_PRIVATE_TIME" },
        { label: "Custom Requests", callbackData: "WORLD_PRIVATE_CUSTOMS" }
      ],
      [
        { label: "Text / Contact", callbackData: "WORLD_PRIVATE_CONTACT" },
        { label: "Booking Door", callbackData: "WORLD_PRIVATE_BOOKING" }
      ],
      [{ label: "My Access / My Status", callbackData: "DEJA_STATUS" }],
      [{ label: "Back to Menu", callbackData: "MENU" }]
    ])
  });

  await sendStripeArea(ctx, "private");
}

async function sendOfficialLinks(ctx: Context): Promise<void> {
  const mainWebsiteUrl = await resolveLink(linkPlaceholders.mainWebsite);

  await ctx.reply(sectionCopy.officialLinks, {
    reply_markup: keyboardFromRows([
      [{ label: "Main Website", url: mainWebsiteUrl }],
      [
        { label: "Experience Deja", callbackData: "WORLD_LINK_EXPERIENCE" },
        { label: "Premium Content", callbackData: "WORLD_LINK_PREMIUM" }
      ],
      [
        { label: "Gifts", callbackData: "WORLD_GIFTS" },
        { label: "Socials", callbackData: "WORLD_LINK_SOCIALS" }
      ],
      [{ label: "Back to Menu", callbackData: "MENU" }]
    ])
  });
}

async function sendRules(ctx: Context): Promise<void> {
  await ctx.reply(sectionCopy.rules, {
    reply_markup: keyboardFromRows([
      [{ label: "I Understand", callbackData: "MENU" }],
      [{ label: "Back to Menu", callbackData: "MENU" }]
    ])
  });
}

export function registerWorldCommands(bot: Bot): void {
  registerDejaAlwaysHandlers(bot);
  registerStripeDoorHandlers(bot);

  // This file owns the main entry flow:
  // /start -> 18+ age gate -> mood choice -> Deja Always/private world -> main menu.
  bot.command("start", async (ctx) => {
    await logEvent("start", { userId: ctx.from?.id });
    await ctx.reply(sectionCopy.start, {
      reply_markup: keyboardFromRows([
        [{ label: "I am 18+ — Let me in", callbackData: "WORLD_AGE_YES" }],
        [{ label: "Not for me", callbackData: "WORLD_AGE_NO" }]
      ])
    });
  });

  bot.command("menu", async (ctx) => {
    await sendMainMenu(ctx);
  });

  bot.command("gallery", async (ctx) => {
    await sendGallery(ctx);
  });

  bot.command("voice", async (ctx) => {
    await sendVoiceNotes(ctx);
  });

  bot.command("gifts", async (ctx) => {
    await sendGifts(ctx);
  });

  bot.command("spoil", async (ctx) => {
    await sendGifts(ctx);
  });

  bot.command("worship", async (ctx) => {
    await sendWorshipDoorway(ctx);
  });

  bot.command("reup", async (ctx) => {
    await sendReups(ctx);
  });

  bot.command("links", async (ctx) => {
    await sendOfficialLinks(ctx);
  });

  bot.command("private", async (ctx) => {
    await sendPrivateAccess(ctx);
  });

  bot.command("rules", async (ctx) => {
    await sendRules(ctx);
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(sectionCopy.help, {
      reply_markup: returnKeyboard()
    });
  });

  bot.callbackQuery("WORLD_AGE_YES", async (ctx) => {
    await ctx.answerCallbackQuery();
    await logEvent("age_confirmed", { userId: ctx.from.id });
    await sendOnboardingMood(ctx);
  });

  bot.callbackQuery("WORLD_AGE_NO", async (ctx) => {
    await ctx.answerCallbackQuery();
    await logEvent("age_declined", { userId: ctx.from.id });
    await ctx.reply(sectionCopy.notForMe);
  });

  bot.callbackQuery("MENU", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendMainMenu(ctx);
  });

  bot.callbackQuery("LINKS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendOfficialLinks(ctx);
  });

  bot.callbackQuery("PATHS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendOfficialLinks(ctx);
  });

  bot.callbackQuery("WORLD_SOFT", async (ctx) => {
    await ctx.answerCallbackQuery();
    await rememberRoom(ctx, "The Soft Room");
    await sendSoftRoom(ctx);
  });

  bot.callbackQuery("WORLD_SOFT_SWEET", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(sectionCopy.sweetDeja, { reply_markup: returnKeyboard() });
  });

  bot.callbackQuery("WORLD_SOFT_ROMANTIC", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(sectionCopy.romanticMood, { reply_markup: returnKeyboard() });
  });

  bot.callbackQuery("WORLD_SOFT_CLOSER", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(sectionCopy.comeCloser, {
      reply_markup: keyboardFromRows([
        [{ label: "Private Access", callbackData: "WORLD_PRIVATE" }],
        [{ label: "Back to Menu", callbackData: "MENU" }]
      ])
    });
  });

  bot.callbackQuery("WORLD_GODDESS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await rememberRoom(ctx, "The Goddess Room");
    await sendGoddessRoom(ctx);
  });

  bot.callbackQuery("WORLD_GODDESS_WORSHIP", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(sectionCopy.worshipEnergy, { reply_markup: returnKeyboard() });
  });

  bot.callbackQuery("WORLD_GODDESS_SPOIL", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(sectionCopy.spoilMeProperly, {
      reply_markup: keyboardFromRows([
        [{ label: "Open Gifts & Considerations", callbackData: "WORLD_GIFTS" }],
        [{ label: "Back to Goddess Room", callbackData: "WORLD_GODDESS" }]
      ])
    });
  });

  bot.callbackQuery("WORLD_GODDESS_RULES", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(sectionCopy.rulesOfAttention, { reply_markup: returnKeyboard() });
  });

  bot.callbackQuery("WORLD_AFTER_HOURS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await rememberRoom(ctx, "After Hours");
    await sendAfterHours(ctx);
  });

  bot.callbackQuery("WORLD_AFTER_TEASER", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDoorway(ctx, "After Hours is where curiosity gets louder.", [
      { label: "Open Clips", lookup: linkPlaceholders.clips },
      { label: "Open OnlyFans", lookup: linkPlaceholders.onlyFans }
    ]);
  });

  bot.callbackQuery("WORLD_AFTER_CLIPS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDoorway(ctx, "This is the door for late-night energy, teasing previews, private content, and the side of me that is not always on display.", [
      { label: "Open Clips", lookup: linkPlaceholders.clips },
      { label: "Open Premium", lookup: linkPlaceholders.premium },
      { label: "Open Customs", lookup: linkPlaceholders.customs }
    ]);
  });

  bot.callbackQuery("WORLD_AFTER_PRIVATE", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDoorway(ctx, "If you want more than curiosity, choose one of my private doors when you’re ready.", [
      { label: "Open OnlyFans", lookup: linkPlaceholders.onlyFans },
      { label: "Open Fansly", lookup: linkPlaceholders.fansly },
      { label: "Private Access", callbackData: "WORLD_PRIVATE" }
    ]);
  });

  bot.callbackQuery("WORLD_GIFTS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await rememberRoom(ctx, "Spoil Me");
    await sendGifts(ctx);
  });

  bot.callbackQuery(/^WORLD_SPOIL_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();

    const option = spoilOptions().find((item) => item.key === ctx.match[1]);
    if (!option) {
      await sendGifts(ctx);
      return;
    }

    await sendDoorway(
      ctx,
      option.message,
      directPaymentButtons(primaryDirectPaymentLabel(option))
    );
  });

  bot.callbackQuery("WORLD_WORSHIP", async (ctx) => {
    await ctx.answerCallbackQuery();
    await rememberRoom(ctx, "Worship");
    await sendWorshipDoorway(ctx);
  });

  bot.callbackQuery("WORLD_TODAYS_WORSHIP", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = ctx.from ? await getUser(ctx.from.id) : undefined;
    await sendTodaysWorship(ctx, user?.mood);
  });

  bot.callbackQuery(/^WORLD_WORSHIP_GIFT_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();

    const option = worshipOptions().find((item) => item.key === ctx.match[1]);
    if (!option) {
      await sendWorshipDoorway(ctx);
      return;
    }

    await sendDoorway(
      ctx,
      option.message,
      directPaymentButtons(primaryDirectPaymentLabel(option))
    );
  });

  bot.callbackQuery("WORLD_REUPS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await rememberRoom(ctx, "Reups");
    await sendReups(ctx);
  });

  bot.callbackQuery(/^WORLD_REUP_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await logEvent("reup_clicked", { userId: ctx.from.id, key: ctx.match[1] });

    const option = reupOptions().find((item) => item.key === ctx.match[1]);
    if (!option) {
      await sendReups(ctx);
      return;
    }

    await sendDoorway(
      ctx,
      option.message,
      directPaymentButtons(primaryDirectPaymentLabel(option))
    );
  });

  bot.callbackQuery("WORLD_GIFT_THRONE", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDoorway(ctx, "Throne is where you can send something pretty without guessing what I like.", [
      { label: "Open Throne", lookup: linkPlaceholders.throne }
    ]);
  });

  bot.callbackQuery("WORLD_GIFT_CASHAPP", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDoorway(ctx, "Pretty gestures always get noticed. Gifts, considerations, and thoughtful surprises make this world feel even more personal.", [
      { label: "Open Cash App", lookup: linkPlaceholders.cashApp }
    ]);
  });

  bot.callbackQuery("WORLD_GIFT_LOOK", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDoorway(ctx, "Nails, lashes, dinner, pretty surprises, throne gifts, tribute, or just because — thoughtful attention always stands out.", [
      { label: "Open Wishlist", lookup: linkPlaceholders.wishlist },
      { label: "Open Gift Form", lookup: linkPlaceholders.giftForm }
    ]);
  });

  bot.callbackQuery("WORLD_GIFT_PRETTY", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDoorway(ctx, "For the ones who like to make me smile without needing to be asked.", [
      { label: "Open Throne", lookup: linkPlaceholders.throne },
      { label: "Open Wishlist", lookup: linkPlaceholders.wishlist },
      { label: "Open Gift Form", lookup: linkPlaceholders.giftForm }
    ]);
  });

  bot.callbackQuery("WORLD_PRIVATE", async (ctx) => {
    await ctx.answerCallbackQuery();
    await rememberRoom(ctx, "Private Access");
    await sendPrivateAccess(ctx);
  });

  bot.callbackQuery("WORLD_PRIVATE_TIME", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDoorway(ctx, sectionCopy.privateAccess, [
      ...directPaymentButtons("CashApp")
    ]);
  });

  bot.callbackQuery("WORLD_PRIVATE_CUSTOMS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDoorway(ctx, "Come correct, be clear, and do not waste either of our time.", [
      ...directPaymentButtons("CashApp")
    ]);
  });

  bot.callbackQuery("WORLD_PRIVATE_CONTACT", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDoorway(ctx, "This door is for serious curiosity, private attention, and people who know how to move with respect.", [
      { label: "Text / Contact", lookup: linkPlaceholders.contact }
    ]);
  });

  bot.callbackQuery("WORLD_PRIVATE_BOOKING", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDoorway(ctx, "If you want more of me, come correct, be clear, and do not waste either of our time.", [
      ...directPaymentButtons("CashApp")
    ]);
  });

  bot.callbackQuery("WORLD_OFFICIAL_LINKS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await rememberRoom(ctx, "Official Links");
    await sendOfficialLinks(ctx);
  });

  bot.callbackQuery("WORLD_LINK_EXPERIENCE", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDoorway(ctx, "My official doors, all in one place.", [
      { label: "Experience Deja", lookup: linkPlaceholders.experienceDeja },
      { label: "LinkMe", lookup: linkPlaceholders.linkme }
    ]);
  });

  bot.callbackQuery("WORLD_LINK_PREMIUM", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDoorway(ctx, "Choose carefully. Each one leads to a different side of me.", [
      { label: "OnlyFans", lookup: linkPlaceholders.onlyFans },
      { label: "IWantClips", lookup: linkPlaceholders.iWantClips },
      { label: "ManyVids", lookup: linkPlaceholders.manyVids },
      { label: "Fansly", lookup: linkPlaceholders.fansly }
    ]);
  });

  bot.callbackQuery("WORLD_LINK_SOCIALS", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendDoorway(ctx, "My official doors, all in one place.", [
      { label: "X / Twitter", lookup: linkPlaceholders.x },
      { label: "Instagram", lookup: linkPlaceholders.instagram },
      { label: "Reddit", lookup: linkPlaceholders.reddit },
      { label: "Telegram", lookup: linkPlaceholders.telegramChannel }
    ]);
  });

  bot.callbackQuery("WORLD_RULES", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendRules(ctx);
  });
}
