import { InlineKeyboard, type Context } from "grammy";
import { toTelegramInput } from "./media.js";
import { getUser, hasActiveMembership, hasChatAccess, logEvent, type AccessType, type UserRecord } from "./storage.js";

type PrivateDropTier = "all_paid" | AccessType;
type PrivateDropMediaType = "photo" | "video" | "voice";

type PrivateDropItem = {
  key: string;
  tier: PrivateDropTier;
  mediaType: PrivateDropMediaType;
  label: string;
  title: string;
  caption: string;
  source: string;
};

const privateDropItems: PrivateDropItem[] = [
  // PRIVATE_DROPS_INSERT_AREA_START
  // Add future member drops here.
  // Each item supports:
  // - key
  // - tier: "all_paid", "girlfriend", "goddess", or "vip"
  // - mediaType: "photo", "video", or "voice"
  // - label
  // - title
  // - caption
  // - source
  // PRIVATE_DROPS_INSERT_AREA_END
  {
    key: "soft_checkin_photo",
    tier: "all_paid",
    mediaType: "photo",
    label: "Soft Check-In Photo",
    title: "Soft Check-In Photo",
    caption: "A soft little reminder for the ones who came back properly.",
    source: "assets/gallery/curated-pretty-white.jpg"
  },
  {
    key: "goodnight_voice",
    tier: "girlfriend",
    mediaType: "voice",
    label: "Good Night Note",
    title: "Good Night Note",
    caption: "For the softer key. Something quiet before you disappear for the night.",
    source: "assets/voice/good-night-note.m4a"
  },
  {
    key: "goddess_daily_voice",
    tier: "goddess",
    mediaType: "voice",
    label: "Goddess Daily Check-In",
    title: "Goddess Daily Check-In",
    caption: "Direction feels better when it sounds like me.",
    source: "assets/voice/goddess-deja-daily-check-in.m4a"
  },
  {
    key: "red_robe_photo",
    tier: "goddess",
    mediaType: "photo",
    label: "Red Robe Reminder",
    title: "Red Robe Reminder",
    caption: "A warmer little reminder to keep your attention where it belongs.",
    source: "assets/gallery/curated-red-robe.jpg"
  },
  {
    key: "vip_motion",
    tier: "vip",
    mediaType: "video",
    label: "VIP Motion Drop",
    title: "VIP Motion Drop",
    caption: "A closer little moving glimpse. VIP gets the better door first.",
    source: "assets/video/red-robe-preview.mp4"
  },
  {
    key: "vip_xoxo",
    tier: "vip",
    mediaType: "photo",
    label: "VIP XOXO",
    title: "VIP XOXO",
    caption: "A pretty little keepsake for the ones closest to the door.",
    source: "assets/gallery/curated-xoxo.jpg"
  }
];

function tierLabel(tier: PrivateDropTier): string {
  if (tier === "all_paid") return "All Paid";
  if (tier === "girlfriend") return "Girlfriend";
  if (tier === "goddess") return "Goddess";
  if (tier === "vip") return "VIP";
  return "Private";
}

function canOpenDrop(user: UserRecord | undefined, item: PrivateDropItem): boolean {
  if (item.tier === "all_paid") return hasChatAccess(user);
  if (!hasActiveMembership(user)) return false;
  if (user?.currentAccessType === "vip") return true;
  return user?.currentAccessType === item.tier;
}

function relevantDrops(user: UserRecord | undefined, focusTier?: PrivateDropTier): PrivateDropItem[] {
  return privateDropItems.filter((item) => {
    if (focusTier && item.tier !== focusTier) return false;
    return canOpenDrop(user, item);
  });
}

function privateDropMenuKeyboard(user: UserRecord | undefined, focusTier?: PrivateDropTier): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const visibleItems = relevantDrops(user, focusTier);

  visibleItems.forEach((item) => {
    keyboard.text(item.label, `DEJA_PRIVATE_DROP_${item.key}`).row();
  });

  if (!focusTier || focusTier !== "vip") {
    keyboard.text("VIP Drops", "DEJA_VIP_DROPS").row();
  }

  keyboard
    .text("Video Drops", "VIDEO_DROPS")
    .text("Voice Notes", "VOICE_NOTES")
    .row()
    .text("A Pretty Glimpse", "DEJA_CHAT_glimpse")
    .row()
    .text("Back to Deja Always", "DEJA_ALWAYS");

  return keyboard;
}

function privateDropItemKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Back to Private Drops", "DEJA_PRIVATE_DROPS")
    .row()
    .text("Video Drops", "VIDEO_DROPS")
    .text("Voice Notes", "VOICE_NOTES")
    .row()
    .text("Back to Deja Always", "DEJA_ALWAYS");
}

function lockedDropKeyboard(item: PrivateDropItem): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  if (item.tier === "vip") {
    keyboard.text("Choose VIP Deja", "DEJA_ALWAYS_ACCESS_vip").row();
  } else if (item.tier === "goddess") {
    keyboard.text("Choose Goddess Access", "DEJA_ALWAYS_ACCESS_goddess").row();
  } else if (item.tier === "girlfriend") {
    keyboard.text("Choose Girlfriend Access", "DEJA_ALWAYS_ACCESS_girlfriend").row();
  } else {
    keyboard.text("Start Here: 10 Messages - $15", "DEJA_FIRST_KEY").row();
  }

  keyboard.text("Back to Private Drops", "DEJA_PRIVATE_DROPS").row().text("Back to Deja Always", "DEJA_ALWAYS");
  return keyboard;
}

function getPrivateDrop(key: string): PrivateDropItem | undefined {
  return privateDropItems.find((item) => item.key === key);
}

export async function sendPrivateDropMenu(ctx: Context, focusTier?: PrivateDropTier): Promise<void> {
  const user = ctx.from ? await getUser(ctx.from.id) : undefined;
  await logEvent("private_drops_opened", {
    userId: ctx.from?.id,
    focusTier,
    hasAccess: hasChatAccess(user),
    accessType: user?.currentAccessType
  });

  if (!hasChatAccess(user)) {
    await ctx.reply(
      "Private Drops\n\nThis door is still locked. Start with a small key, then come back when you want something waiting behind the curtain.",
      {
        reply_markup: new InlineKeyboard()
          .text("Start Here: 10 Messages - $15", "DEJA_FIRST_KEY")
          .row()
          .text("Back to Deja Always", "DEJA_ALWAYS")
      }
    );
    return;
  }

  const drops = relevantDrops(user, focusTier);
  const tierText = focusTier ? `${tierLabel(focusTier)} drops` : "private drops";

  await ctx.reply(
    [
      "Private Drops",
      "",
      drops.length
        ? `I left ${tierText} here for the ones with the right key. Choose carefully.`
        : "This room is quiet for your current key. Come back through Deja Always or choose a closer door."
    ].join("\n"),
    {
      reply_markup: privateDropMenuKeyboard(user, focusTier)
    }
  );
}

export async function sendPrivateDropItem(ctx: Context, key: string): Promise<void> {
  const user = ctx.from ? await getUser(ctx.from.id) : undefined;
  const item = getPrivateDrop(key);

  if (!item) {
    await sendPrivateDropMenu(ctx);
    return;
  }

  if (!canOpenDrop(user, item)) {
    await logEvent("locked_door_viewed", { userId: ctx.from?.id, door: `private_drop_${item.key}`, reason: "missing_access" });
    await ctx.reply(
      [
        item.title,
        "",
        `This one is for ${tierLabel(item.tier)} access. The right key opens it cleanly.`
      ].join("\n"),
      {
        reply_markup: lockedDropKeyboard(item)
      }
    );
    return;
  }

  await logEvent("private_drop_opened", { userId: ctx.from?.id, drop: item.key, tier: item.tier, mediaType: item.mediaType });

  const caption = [item.title, item.caption].join("\n\n");
  const reply_markup = privateDropItemKeyboard();

  if (item.mediaType === "photo") {
    await ctx.replyWithPhoto(toTelegramInput(item.source), { caption, protect_content: true, reply_markup });
    return;
  }

  if (item.mediaType === "video") {
    await ctx.replyWithVideo(toTelegramInput(item.source), { caption, protect_content: true, reply_markup });
    return;
  }

  try {
    await ctx.replyWithVoice(toTelegramInput(item.source), { caption, protect_content: true, reply_markup });
  } catch {
    await ctx.replyWithAudio(toTelegramInput(item.source), { caption, protect_content: true, reply_markup });
  }
}
