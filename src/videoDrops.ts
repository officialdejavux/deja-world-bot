import { InlineKeyboard, type Context } from "grammy";
import { toTelegramInput } from "./media.js";
import { getUser, hasActiveMembership, hasChatAccess, logEvent, type AccessType, type UserRecord } from "./storage.js";

type VideoAccess = "any_paid" | AccessType;

type VideoDrop = {
  key: string;
  label: string;
  title: string;
  caption: string;
  source: string;
  access: VideoAccess;
};

const videoDrops: VideoDrop[] = [
  // VIDEO_DROPS_INSERT_AREA_START
  // Add future video items here.
  // Use safe preview clips for "any_paid" and reserve closer clips for "vip".
  // Each item supports:
  // - key
  // - label
  // - title
  // - caption
  // - source
  // - access: "any_paid", "girlfriend", "goddess", or "vip"
  // VIDEO_DROPS_INSERT_AREA_END
  {
    key: "makeup_preview",
    label: "Soft Motion Preview",
    title: "Soft Motion Preview",
    caption: "A small moving glimpse. Pretty, simple, and close enough to keep your attention.",
    source: "assets/video/makeup-preview.mp4",
    access: "any_paid"
  },
  {
    key: "red_robe_mirror",
    label: "VIP Mirror Moment",
    title: "VIP Mirror Moment",
    caption: "A closer little mirror moment for the ones with the right key.",
    source: "assets/video/red-robe-preview.mp4",
    access: "vip"
  }
];

function canOpenVideo(user: UserRecord | undefined, access: VideoAccess): boolean {
  if (access === "any_paid") return hasChatAccess(user);
  if (!hasActiveMembership(user)) return false;
  if (user?.currentAccessType === "vip") return true;
  return user?.currentAccessType === access;
}

function videoMenuKeyboard(user: UserRecord | undefined): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  videoDrops.forEach((drop) => {
    const prefix = canOpenVideo(user, drop.access) ? "" : "Locked: ";
    keyboard.text(`${prefix}${drop.label}`, `VIDEO_DROP_${drop.key}`).row();
  });

  keyboard
    .text("Private Drops", "DEJA_PRIVATE_DROPS")
    .text("Voice Notes", "VOICE_NOTES")
    .row()
    .text("Back to Deja Always", "DEJA_ALWAYS")
    .text("Main Menu", "MENU");

  return keyboard;
}

function videoItemKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Back to Video Drops", "VIDEO_DROPS")
    .row()
    .text("Private Drops", "DEJA_PRIVATE_DROPS")
    .text("Voice Notes", "VOICE_NOTES")
    .row()
    .text("Back to Deja Always", "DEJA_ALWAYS");
}

function lockedVideoKeyboard(access: VideoAccess): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  if (access === "vip") {
    keyboard.text("Choose VIP Deja", "DEJA_ALWAYS_ACCESS_vip").row();
  } else {
    keyboard.text("Start Here: 10 Messages - $15", "DEJA_FIRST_KEY").row();
  }

  keyboard.text("Back to Video Drops", "VIDEO_DROPS").row().text("Back to Deja Always", "DEJA_ALWAYS");
  return keyboard;
}

function getVideoDrop(key: string): VideoDrop | undefined {
  return videoDrops.find((drop) => drop.key === key);
}

export async function sendVideoDrops(ctx: Context): Promise<void> {
  const user = ctx.from ? await getUser(ctx.from.id) : undefined;
  await logEvent("video_drops_opened", { userId: ctx.from?.id, hasAccess: hasChatAccess(user) });

  await ctx.reply(
    [
      "Video Drops",
      "",
      hasChatAccess(user)
        ? "A little motion changes the mood. Choose what you want to see."
        : "This door opens better with a key. Start small, or choose the access that fits how close you want to get."
    ].join("\n"),
    {
      reply_markup: videoMenuKeyboard(user)
    }
  );
}

export async function sendVideoDropItem(ctx: Context, key: string): Promise<void> {
  const user = ctx.from ? await getUser(ctx.from.id) : undefined;
  const drop = getVideoDrop(key);

  if (!drop) {
    await sendVideoDrops(ctx);
    return;
  }

  if (!canOpenVideo(user, drop.access)) {
    await logEvent("locked_door_viewed", { userId: ctx.from?.id, door: `video_${drop.key}`, reason: "missing_access" });
    await ctx.reply(
      [
        drop.title,
        "",
        drop.access === "vip"
          ? "This one is behind the VIP key. Pretty things get closer when the access matches."
          : "This video is behind the private door. Start with a small key if you want to come closer."
      ].join("\n"),
      {
        reply_markup: lockedVideoKeyboard(drop.access)
      }
    );
    return;
  }

  await logEvent("video_drop_opened", { userId: ctx.from?.id, drop: drop.key, access: drop.access });
  await ctx.replyWithVideo(toTelegramInput(drop.source), {
    caption: [drop.title, drop.caption].join("\n\n"),
    protect_content: true,
    reply_markup: videoItemKeyboard()
  });
}
