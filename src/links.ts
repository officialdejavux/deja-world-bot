import type { Context } from "grammy";
import { futureDoorwayConfigs } from "./editLater.js";
import { linkDoorwayKeyboard, linksKeyboard } from "./keyboards.js";
import { toTelegramInput } from "./media.js";
import { getLinks } from "./storage.js";

export const mainWebsiteLinkKey = "website";

export type LinkDoorwayConfig = {
  key: string;
  imageSource?: string;
  title?: string;
  caption?: string;
};

export const linkDoorwayConfigs: LinkDoorwayConfig[] = [
  ...futureDoorwayConfigs
];

export function linkDoorwayCallbackData(key: string): string {
  return `LINK_DOORWAY_${key}`;
}

function doorwayLinks<T extends { key: string }>(links: T[]): T[] {
  return links.filter((link) => link.key !== mainWebsiteLinkKey);
}

export async function sendLinks(ctx: Context): Promise<void> {
  const links = await getLinks();
  const lines = doorwayLinks(links).map((link) => {
    return `${link.label}\n${link.description}`;
  });

  await ctx.reply(
    `Verified Links\n\nIf it is not here or on DivineDeja.com, it does not get your trust.\n\n${lines.join("\n\n")}\n\n18+ only for adult-oriented creator platforms.\n\n@dejaxx_a is the creator account. This bot does not automate or control that account.`,
    {
      reply_markup: linksKeyboard(links, mainWebsiteLinkKey)
    }
  );
}

export async function sendLinkDoorway(ctx: Context, key: string): Promise<void> {
  const links = await getLinks();
  const link = links.find((item) => item.key === key && item.url);
  const config = linkDoorwayConfigs.find((item) => item.key === key);

  if (!link) {
    await sendLinks(ctx);
    return;
  }

  const lines = [config?.title ?? link.label, link.description, config?.caption].filter(Boolean);

  if (config?.imageSource) {
    await ctx.replyWithPhoto(toTelegramInput(config.imageSource), {
      caption: lines.join("\n\n"),
      reply_markup: linkDoorwayKeyboard(link)
    });
    return;
  }

  await ctx.reply(lines.join("\n\n"), {
    reply_markup: linkDoorwayKeyboard(link)
  });
}
