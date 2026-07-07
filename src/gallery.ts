import { InlineKeyboard, type Context } from "grammy";
import { futureGalleryItems } from "./editLater.js";
import { linkDoorwayCallbackData } from "./links.js";
import { toTelegramInput } from "./media.js";
import { logEvent, setUserMemory } from "./storage.js";

export type GalleryItem = {
  source: string;
  title?: string;
  caption?: string;
  link?: string;
  doorwayDestination?: string;
};

export type GalleryCategory = {
  key: string;
  label: string;
  items: GalleryItem[];
};

export const galleryCategories: GalleryCategory[] = [
  {
    key: "preview",
    label: "Preview Gallery",
    items: [
      ...futureGalleryItems,
      {
        source: "assets/gallery/facetune-2026-06-28.jpg",
        caption: "A soft little reminder.",
        doorwayDestination: "gallery"
      },
      {
        source: "assets/gallery/img-8289.jpg",
        caption: "Pretty enough to stay on your mind.",
        doorwayDestination: "gallery"
      },
      {
        source: "assets/gallery/facetune-2026-06-26.jpg",
        caption: "This is the kind of mood you come back for.",
        doorwayDestination: "gallery"
      }
    ]
  },
  {
    key: "soft_selfies",
    label: "Soft Selfies",
    items: [
      {
        source: "assets/gallery/facetune-2026-06-28.jpg",
        caption: "A soft little reminder.",
        doorwayDestination: "gallery"
      }
    ]
  },
  {
    key: "boudoir",
    label: "Boudoir Moments",
    items: [
      {
        source: "assets/gallery/img-8289.jpg",
        caption: "Pretty enough to stay on your mind.",
        doorwayDestination: "gallery"
      }
    ]
  },
  {
    key: "after_dark",
    label: "After Dark Teasers",
    items: [
      {
        source: "assets/gallery/facetune-2026-06-26.jpg",
        caption: "Just enough to make you curious.",
        doorwayDestination: "gallery"
      }
    ]
  },
  {
    key: "favorite_looks",
    label: "Favorite Looks",
    items: [
      {
        source: "assets/gallery/facetune-2026-06-28.jpg",
        caption: "Save your favorite. I’ll know.",
        doorwayDestination: "gallery"
      },
      {
        source: "assets/gallery/img-8289.jpg",
        caption: "Save your favorite. I’ll know.",
        doorwayDestination: "gallery"
      },
      {
        source: "assets/gallery/facetune-2026-06-26.jpg",
        caption: "Save your favorite. I’ll know.",
        doorwayDestination: "gallery"
      }
    ]
  }
];

function galleryKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  galleryCategories.forEach((category) => {
    keyboard.text(category.label, `GALLERY_CATEGORY_${category.key}`).row();
  });

  keyboard.text("Back to Menu", "MENU");
  return keyboard;
}

function galleryItemKeyboard(category: GalleryCategory, index: number, item: GalleryItem): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const nextIndex = category.items.length > 0 ? (index + 1) % category.items.length : 0;

  keyboard.text("See More", `GALLERY_ITEM_${category.key}_${nextIndex}`).row();
  keyboard.text("Send a Gift", "WORLD_GIFTS").text("Private Access", "WORLD_PRIVATE").row();

  if (item.link) {
    keyboard.url(item.title ?? "Look Again", item.link).row();
  }

  if (item.doorwayDestination) {
    keyboard.text(item.title ?? "Look Again", linkDoorwayCallbackData(item.doorwayDestination)).row();
  }

  keyboard.text("Back to Gallery", "GALLERY");
  return keyboard;
}

function galleryCaption(item: GalleryItem): string | undefined {
  return [item.title, item.caption].filter(Boolean).join("\n\n") || undefined;
}

function getCategory(categoryKey: string): GalleryCategory | undefined {
  return galleryCategories.find((category) => category.key === categoryKey);
}

export async function sendGallery(ctx: Context): Promise<void> {
  await logEvent("gallery_opened", { userId: ctx.from?.id });
  await ctx.reply("Look Again\n\nA glimpse is enough when it is placed correctly.", {
    reply_markup: galleryKeyboard()
  });
}

export async function sendGalleryCategory(ctx: Context, categoryKey: string): Promise<void> {
  const category = getCategory(categoryKey);
  if (ctx.from) {
    await setUserMemory(ctx.from.id, { lastGalleryCategory: categoryKey, lastRoomVisited: "Gallery" });
  }

  if (!category || category.items.length === 0) {
    await ctx.reply("Look Again\n\nA glimpse is enough when it is placed correctly.", {
      reply_markup: new InlineKeyboard().text("Back to Gallery", "GALLERY").text("Back to Menu", "MENU")
    });
    return;
  }

  await sendGalleryItem(ctx, category.key, 0);
}

export async function sendGalleryItem(ctx: Context, categoryKey: string, index: number): Promise<void> {
  const category = getCategory(categoryKey);
  const item = category?.items[index];
  if (ctx.from) {
    await setUserMemory(ctx.from.id, { lastGalleryCategory: categoryKey, lastRoomVisited: "Gallery" });
  }

  if (!category || !item) {
    await sendGallery(ctx);
    return;
  }

  await ctx.replyWithPhoto(toTelegramInput(item.source), {
    caption: galleryCaption(item),
    reply_markup: galleryItemKeyboard(category, index, item)
  });
}
