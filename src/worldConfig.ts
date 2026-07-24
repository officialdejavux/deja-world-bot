export type LinkLookup = {
  env?: string;
  key?: string;
};

export type SpoilButton = {
  label: string;
  lookup: LinkLookup;
};

export type SpoilOption = {
  key: string;
  label: string;
  message: string;
  buttons: SpoilButton[];
};

export type ReupOption = {
  key: string;
  label: string;
  message: string;
  buttons: SpoilButton[];
};

export const brandName = "Divine Deja";

export const sectionCopy = {
  start:
    "Welcome back, love.\n\nThis is your companion-style entry into Deja World. No rushing. No guessing. You choose a doorway and I guide the rest.\n\nBefore you come closer, confirm that you are 18+ and entering respectfully.",
  notForMe: "No hard feelings. Pretty things are better when they are chosen.",
  menu:
    "You’re inside.\n\nPick a doorway. Each one opens a different side of my world — soft, private, spoiled, official, or closer.",
  softRoom:
    "The Soft Room is where I let you feel close to me.\n\nSweet energy, pretty attention, soft messages, real chemistry, and that girlfriend feeling you keep thinking about when you should be focused.",
  sweetDeja:
    "Sweet Deja is soft, playful, feminine, and hard to forget. The kind of girl who makes simple attention feel personal.",
  romanticMood:
    "I like moments that feel natural. Slow conversation, pretty compliments, thoughtful energy, and a little tension in the air.",
  comeCloser:
    "If you want more than curiosity, choose one of my private doors when you’re ready.",
  goddessRoom:
    "The Goddess Room is for the ones who already know.\n\nThe ones who like beauty with power behind it. The ones who understand that attention is cute, but effort is sexier.",
  worshipEnergy:
    "Admiration is sweet. Devotion is prettier. Show me that you know the difference.",
  spoilMeProperly:
    "Pretty gestures always get noticed. Gifts, considerations, and thoughtful surprises make this world feel even more personal.",
  rulesOfAttention:
    "Be respectful. Be intentional. Do not demand access you have not earned. Curiosity is welcome. Entitlement is not.",
  afterHours:
    "After Hours is where curiosity gets louder.\n\nThis is the door for late-night energy, teasing previews, private content, and the side of me that is not always on display.",
  gifts:
    "Gifts & Considerations\n\nFor the ones who like to make me smile without needing to be asked.\n\nNails, lashes, dinner, pretty surprises, throne gifts, tribute, or just because — thoughtful attention always stands out.",
  spoilMenu:
    "Spoil Me\n\nChoose the kind of pretty gesture you want attached to your name.\n\nSmall, sweet, expensive, unnecessary — I notice the ones who make it easy for me to feel adored.",
  worshipDoorway:
    "Worship\n\nThis door is for bigger gestures, serious appreciation, and the kind of offering that does not need to explain itself.\n\nIf you want to be remembered properly, choose the level that feels honest.",
  reups:
    "Reups\n\nAdd to the experience when you want to keep the door open.\n\nEvery reup should be chosen by you. Nothing here charges quietly, automatically, or without your approval.",
  privateAccess:
    "Private Access\n\nThis door is for serious curiosity, private attention, and people who know how to move with respect.\n\nIf you want more of me, come correct, be clear, and do not waste either of our time.",
  officialLinks:
    "My official doors, all in one place.\n\nChoose carefully. Each one leads to a different side of me.",
  rules:
    "Rules Before You Get Too Comfortable\n\nBe respectful.\nBe grown.\nBe intentional.\nDo not spam me.\nDo not demand free attention.\nDo not send disrespectful messages.\nDo not assume access.\nCuriosity is cute. Effort is sexier.\n\nThis world is sweeter when you know how to behave.",
  help:
    "Use the buttons, love. Start with /menu when you want back into my world.\n\nOpen /gallery when you want to look.\nOpen /voice when you want to hear me.\nOpen /videos when you want a little motion.\nOpen /spoil when you want to be remembered.\nOpen /worship for bigger gifts.\nOpen /reup when you want to keep the door open.\nOpen /private when you know how to come correct.\nOpen /links when you want the official doors."
};

export const linkPlaceholders = {
  clips: { env: "CLIPS_LINK", key: "site_clips" },
  premium: { env: "PREMIUM_LINK", key: "onlyfans" },
  onlyFans: { env: "ONLYFANS_LINK", key: "onlyfans" },
  fansly: { env: "FANSLY_LINK" },
  customs: { env: "CUSTOMS_LINK", key: "site_vip" },
  throne: { env: "THRONE_LINK", key: "throne" },
  cashApp: { env: "CASHAPP_LINK", key: "cashapp" },
  paypal: { env: "PAYPAL_LINK", key: "paypal" },
  venmo: { env: "VENMO_LINK", key: "venmo" },
  wishlist: { env: "WISHLIST_LINK", key: "throne" },
  giftForm: { env: "GIFT_FORM_LINK" },
  siteSpoil: { env: "SITE_SPOIL_LINK", key: "site_spoil" },
  coffeeGift: { env: "COFFEE_GIFT_LINK", key: "cashapp" },
  drinksGift: { env: "DRINKS_GIFT_LINK", key: "cashapp" },
  snackGift: { env: "SNACK_GIFT_LINK", key: "cashapp" },
  flowersGift: { env: "FLOWERS_GIFT_LINK", key: "throne" },
  manicureGift: { env: "MANICURE_GIFT_LINK", key: "cashapp" },
  pedicureGift: { env: "PEDICURE_GIFT_LINK", key: "cashapp" },
  glamGift: { env: "GLAM_GIFT_LINK", key: "throne" },
  shoppingGift: { env: "SHOPPING_GIFT_LINK", key: "throne" },
  vacationGift: { env: "VACATION_GIFT_LINK", key: "site_spoil" },
  worship100: { env: "WORSHIP_100_LINK", key: "site_spoil" },
  worship250: { env: "WORSHIP_250_LINK", key: "site_spoil" },
  worship500: { env: "WORSHIP_500_LINK", key: "site_spoil" },
  worship1000: { env: "WORSHIP_1000_LINK", key: "site_spoil" },
  worshipCustom: { env: "WORSHIP_CUSTOM_LINK", key: "site_spoil" },
  reup10: { env: "REUP_10_LINK", key: "cashapp" },
  reup25: { env: "REUP_25_LINK", key: "cashapp" },
  reup50: { env: "REUP_50_LINK", key: "cashapp" },
  reup100: { env: "REUP_100_LINK", key: "site_spoil" },
  reup250: { env: "REUP_250_LINK", key: "site_spoil" },
  reupMonthly: { env: "REUP_MONTHLY_LINK", key: "site_spoil" },
  booking: { env: "BOOKING_LINK", key: "site_vip" },
  privateRequest: { env: "PRIVATE_REQUEST_LINK", key: "site_vip" },
  customRequest: { env: "CUSTOM_REQUEST_LINK", key: "site_vip" },
  contact: { env: "CONTACT_LINK", key: "telegram" },
  mainWebsite: { env: "MAIN_WEBSITE_LINK", key: "website" },
  experienceDeja: { env: "EXPERIENCE_DEJA_LINK", key: "website" },
  linkme: { env: "LINKME_LINK", key: "verified_links" },
  x: { env: "X_LINK", key: "x" },
  instagram: { env: "INSTAGRAM_LINK" },
  reddit: { env: "REDDIT_LINK" },
  telegramChannel: { env: "TELEGRAM_CHANNEL_LINK", key: "telegram" },
  manyVids: { key: "manyvids" },
  iWantClips: { key: "iwantclips" }
} satisfies Record<string, LinkLookup>;

export const defaultSpoilOptions: SpoilOption[] = [
  {
    key: "coffee",
    label: "Coffee ☕",
    message:
      "Coffee ☕\n\nA small yes from you, a softer morning for me.\n\nPretty attention does not have to be loud to be noticed.",
    buttons: [{ label: "Send Coffee ☕", lookup: linkPlaceholders.coffeeGift }]
  },
  {
    key: "drinks",
    label: "Drinks 🍸",
    message:
      "Drinks 🍸\n\nSend the kind of little treat that makes a night feel chosen.",
    buttons: [{ label: "Send Drinks 🍸", lookup: linkPlaceholders.drinksGift }]
  },
  {
    key: "snack",
    label: "Snack 🍡",
    message:
      "Snack 🍡\n\nA tiny spoil still counts when it is sent with intention.",
    buttons: [{ label: "Send a Snack 🍡", lookup: linkPlaceholders.snackGift }]
  },
  {
    key: "flowers",
    label: "Flowers 💐",
    message:
      "Flowers 💐\n\nSoft, feminine, obvious. I like pretty things from people who pay attention.",
    buttons: [{ label: "Send Flowers 💐", lookup: linkPlaceholders.flowersGift }]
  },
  {
    key: "manicure",
    label: "Manicure 💅",
    message:
      "Manicure 💅\n\nKeep my hands pretty. I notice who contributes to the details.",
    buttons: [{ label: "Send Manicure Money 💅", lookup: linkPlaceholders.manicureGift }]
  },
  {
    key: "pedicure",
    label: "Pedicure ✨",
    message:
      "Pedicure ✨\n\nDetails matter. The ones who understand that usually get remembered.",
    buttons: [{ label: "Send Pedicure Money ✨", lookup: linkPlaceholders.pedicureGift }]
  },
  {
    key: "glam",
    label: "Lashes / Glam ✨",
    message:
      "Lashes / Glam ✨\n\nPretty maintenance is part of the world. Contribute to the look you like admiring.",
    buttons: [{ label: "Send Glam Money ✨", lookup: linkPlaceholders.glamGift }]
  },
  {
    key: "cash",
    label: "Cash Gift 💎",
    message:
      "Cash Gift 💎\n\nSimple. Direct. Appreciated.\n\nA clean gesture from someone who knows how to move.",
    buttons: [{ label: "Send Cash Gift 💎", lookup: linkPlaceholders.cashApp }]
  },
  {
    key: "shopping",
    label: "Shopping 🛍️",
    message:
      "Shopping 🛍️\n\nFor pretty things, soft fabric, little luxuries, and the kind of yes that makes me smile.",
    buttons: [
      { label: "Open Wishlist 🛍️", lookup: linkPlaceholders.shoppingGift },
      { label: "Open Throne 🎁", lookup: linkPlaceholders.throne }
    ]
  },
  {
    key: "vacation",
    label: "Vacation 🌴",
    message:
      "Vacation 🌴\n\nA bigger gesture for someone who likes being remembered properly.",
    buttons: [
      { label: "Send Vacation Money 🌴", lookup: linkPlaceholders.vacationGift },
      { label: "Open Spoil Me", lookup: linkPlaceholders.siteSpoil }
    ]
  },
  {
    key: "throne",
    label: "Throne Gift 🎁",
    message:
      "Throne Gift 🎁\n\nPick something from the list. I like when desire comes with taste.",
    buttons: [{ label: "Open Throne 🎁", lookup: linkPlaceholders.throne }]
  },
  {
    key: "just_because",
    label: "Just Because 💌",
    message:
      "Just Because 💌\n\nNo occasion. No overexplaining. Just a pretty reminder that you were thinking of me.",
    buttons: [
      { label: "Send Something Pretty 💌", lookup: linkPlaceholders.siteSpoil },
      { label: "Open Gift Form", lookup: linkPlaceholders.giftForm }
    ]
  }
];

export const defaultWorshipOptions: ReupOption[] = [
  {
    key: "100",
    label: "$100 💎",
    message:
      "Worship $100 💎\n\nA clean, serious gesture. Enough to be noticed, and simple enough to send without making noise.",
    buttons: [{ label: "Send $100 💎", lookup: linkPlaceholders.worship100 }]
  },
  {
    key: "250",
    label: "$250 🏛️",
    message:
      "Worship $250 🏛️\n\nBigger energy. The kind of offering that feels intentional before you even say another word.",
    buttons: [{ label: "Send $250 🏛️", lookup: linkPlaceholders.worship250 }]
  },
  {
    key: "500",
    label: "$500 👑",
    message:
      "Worship $500 👑\n\nA proper offering. Not casual. Not forgettable. Exactly the kind of gesture that changes the tone.",
    buttons: [{ label: "Send $500 👑", lookup: linkPlaceholders.worship500 }]
  },
  {
    key: "1000",
    label: "$1000 ✨",
    message:
      "Worship $1000 ✨\n\nFor the ones who understand that devotion feels different when it arrives with weight.",
    buttons: [{ label: "Send $1000 ✨", lookup: linkPlaceholders.worship1000 }]
  },
  {
    key: "custom",
    label: "Custom Offering 💌",
    message:
      "Custom Offering 💌\n\nIf you already know the number, send it properly. I like clarity.",
    buttons: [{ label: "Send Custom Offering 💌", lookup: linkPlaceholders.worshipCustom }]
  }
];

export const defaultReupOptions: ReupOption[] = [
  {
    key: "10",
    label: "$10 ⭐",
    message:
      "Reup $10 ⭐\n\nA small top-up to keep the door open.",
    buttons: [{ label: "Reup $10 ⭐", lookup: linkPlaceholders.reup10 }]
  },
  {
    key: "25",
    label: "$25 💵",
    message:
      "Reup $25 💵\n\nA cleaner little yes. Useful, simple, noticed.",
    buttons: [{ label: "Reup $25 💵", lookup: linkPlaceholders.reup25 }]
  },
  {
    key: "50",
    label: "$50 💸",
    message:
      "Reup $50 💸\n\nMore room to stay close without making it complicated.",
    buttons: [{ label: "Reup $50 💸", lookup: linkPlaceholders.reup50 }]
  },
  {
    key: "100",
    label: "$100 💰",
    message:
      "Reup $100 💰\n\nA proper top-up from someone who likes having access feel easy.",
    buttons: [{ label: "Reup $100 💰", lookup: linkPlaceholders.reup100 }]
  },
  {
    key: "250",
    label: "$250 🏦",
    message:
      "Reup $250 🏦\n\nA larger reup for someone who already knows they want to stay.",
    buttons: [{ label: "Reup $250 🏦", lookup: linkPlaceholders.reup250 }]
  },
  {
    key: "monthly",
    label: "Monthly Access ✨",
    message:
      "Monthly Access ✨\n\nFor the ones who prefer consistency over asking twice.",
    buttons: [{ label: "Open Monthly Access ✨", lookup: linkPlaceholders.reupMonthly }]
  }
];
