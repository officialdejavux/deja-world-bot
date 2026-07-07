import type { AccessType } from "./storage.js";

export type OfferId =
  | "messages_10"
  | "messages_30"
  | "messages_60"
  | "day_pass"
  | "girlfriend_access"
  | "girlfriend_weekly"
  | "girlfriend_monthly"
  | "goddess_access"
  | "vip_deja"
  | "intimate_gallery";

export type OfferDeliveryType = "credits" | "access" | "paid_media";

export type PaidOffer = {
  id: OfferId;
  title: string;
  shortDescription: string;
  usdReferenceEnv?: string;
  defaultUsdReference?: string;
  starsEnv?: string;
  defaultStars?: number;
  creditAmount?: number;
  accessType?: AccessType;
  durationDays?: number;
  deliveryType: OfferDeliveryType;
  isInstantStarsUnlock: boolean;
};

export type ResolvedOffer = PaidOffer & {
  usdReference?: string;
  stars?: number;
};

export const paidOffers: PaidOffer[] = [
  {
    id: "messages_10",
    title: "10 Messages",
    shortDescription: "A small key to keep the conversation open.",
    usdReferenceEnv: "TOPUP_10_PRICE",
    defaultUsdReference: "$15",
    starsEnv: "TOPUP_10_STARS",
    defaultStars: 750,
    creditAmount: 10,
    deliveryType: "credits",
    isInstantStarsUnlock: true
  },
  {
    id: "messages_30",
    title: "30 Messages",
    shortDescription: "More room to stay close without breaking the mood.",
    usdReferenceEnv: "TOPUP_30_PRICE",
    defaultUsdReference: "$35",
    starsEnv: "TOPUP_30_STARS",
    defaultStars: 1750,
    creditAmount: 30,
    deliveryType: "credits",
    isInstantStarsUnlock: true
  },
  {
    id: "messages_60",
    title: "60 Messages",
    shortDescription: "A longer key for the ones who know they will come back.",
    usdReferenceEnv: "TOPUP_60_PRICE",
    defaultUsdReference: "$65",
    starsEnv: "TOPUP_60_STARS",
    defaultStars: 3250,
    creditAmount: 60,
    deliveryType: "credits",
    isInstantStarsUnlock: true
  },
  {
    id: "day_pass",
    title: "Day Pass",
    shortDescription: "One day inside the closer door.",
    usdReferenceEnv: "DAY_PASS_PRICE",
    defaultUsdReference: "$100",
    starsEnv: "DAY_PASS_STARS",
    defaultStars: 5000,
    accessType: "girlfriend",
    durationDays: 1,
    deliveryType: "access",
    isInstantStarsUnlock: true
  },
  {
    id: "girlfriend_access",
    title: "Girlfriend Access",
    shortDescription: "Soft attention, sweet check-ins, and a closer feeling.",
    usdReferenceEnv: "GIRLFRIEND_ACCESS_PRICE",
    starsEnv: "GIRLFRIEND_ACCESS_STARS",
    accessType: "girlfriend",
    durationDays: 30,
    deliveryType: "access",
    isInstantStarsUnlock: true
  },
  {
    id: "girlfriend_weekly",
    title: "Weekly Girlfriend Experience",
    shortDescription: "A week of softer access, closer attention, and direct contact after unlock.",
    usdReferenceEnv: "GIRLFRIEND_WEEKLY_PRICE",
    defaultUsdReference: "$100",
    starsEnv: "GIRLFRIEND_WEEKLY_STARS",
    defaultStars: 5000,
    accessType: "girlfriend",
    durationDays: 7,
    deliveryType: "access",
    isInstantStarsUnlock: true
  },
  {
    id: "girlfriend_monthly",
    title: "Monthly Girlfriend Experience",
    shortDescription: "The softer door kept open for a full month.",
    usdReferenceEnv: "GIRLFRIEND_MONTHLY_PRICE",
    defaultUsdReference: "$250",
    starsEnv: "GIRLFRIEND_MONTHLY_STARS",
    defaultStars: 12500,
    accessType: "girlfriend",
    durationDays: 30,
    deliveryType: "access",
    isInstantStarsUnlock: true
  },
  {
    id: "goddess_access",
    title: "Goddess Access",
    shortDescription: "Direction, devotion, and a more intentional key.",
    usdReferenceEnv: "GODDESS_ACCESS_PRICE",
    starsEnv: "GODDESS_ACCESS_STARS",
    accessType: "goddess",
    durationDays: 30,
    deliveryType: "access",
    isInstantStarsUnlock: true
  },
  {
    id: "vip_deja",
    title: "VIP Deja",
    shortDescription: "The closest key with more priority and a private feeling.",
    usdReferenceEnv: "VIP_DEJA_PRICE",
    starsEnv: "VIP_DEJA_STARS",
    accessType: "vip",
    durationDays: 30,
    deliveryType: "access",
    isInstantStarsUnlock: true
  },
  {
    id: "intimate_gallery",
    title: "A More Intimate Look",
    shortDescription: "Seven private photographs unlocked once through Telegram Stars.",
    usdReferenceEnv: "INTIMATE_GALLERY_PRICE",
    defaultUsdReference: "$15",
    starsEnv: "INTIMATE_GALLERY_STARS",
    defaultStars: 750,
    deliveryType: "paid_media",
    isInstantStarsUnlock: true
  }
];

const legacyPayloadMap: Record<string, OfferId> = {
  "deja:topup:10": "messages_10",
  "deja:topup:30": "messages_30",
  "deja:topup:60": "messages_60",
  "deja:topup:day_pass": "day_pass",
  "deja:gf:weekly": "girlfriend_weekly",
  "deja:gf:monthly": "girlfriend_monthly",
  "deja:access:girlfriend": "girlfriend_access",
  "deja:access:goddess": "goddess_access",
  "deja:access:vip": "vip_deja"
};

function envValue(name: string | undefined): string | undefined {
  if (!name) return undefined;
  return process.env[name]?.trim() || undefined;
}

function starsValue(name: string | undefined, fallback?: number): number | undefined {
  const raw = envValue(name);
  if (!raw) return fallback;
  const amount = Number(raw.replace(/[^0-9]/g, ""));
  return Number.isInteger(amount) && amount > 0 ? amount : fallback;
}

export function resolveOffer(offer: PaidOffer): ResolvedOffer {
  return {
    ...offer,
    usdReference: envValue(offer.usdReferenceEnv) ?? offer.defaultUsdReference,
    stars: starsValue(offer.starsEnv, offer.defaultStars)
  };
}

export function getOffer(id: string | undefined): ResolvedOffer | undefined {
  const offer = paidOffers.find((item) => item.id === id);
  return offer ? resolveOffer(offer) : undefined;
}

export function offerLabel(offer: ResolvedOffer): string {
  return offer.usdReference ? `${offer.title} - ${offer.usdReference}` : offer.title;
}

export function offerPayload(offer: ResolvedOffer): string {
  return `deja:offer:${offer.id}`;
}

export function resolveOfferFromPayload(payload: string): ResolvedOffer | undefined {
  if (payload.startsWith("deja:offer:")) {
    return getOffer(payload.replace("deja:offer:", ""));
  }

  return getOffer(legacyPayloadMap[payload]);
}
