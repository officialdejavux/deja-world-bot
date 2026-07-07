# Deja World Deployment Notes

## Required Env Vars

- `BOT_TOKEN`: Telegram bot token from BotFather.

## Recommended Env Vars

- `BOT_USERNAME`: Bot username, usually `DejaWorldBot`.
- `OWNER_TELEGRAM_USERNAME`: Creator Telegram username.
- `OWNER_TELEGRAM_ID`: Creator numeric Telegram ID.
- `ADMIN_TELEGRAM_ID`: One numeric admin Telegram ID.
- `ADMIN_TELEGRAM_IDS`: Comma-separated numeric admin Telegram IDs.
- `DATA_DIR`: Directory where `users.json`, `links.json`, and `events.jsonl` live.

## Optional Link Env Vars

Use these when you want Railway/private env settings to override `data/links.json`.

- `CLIPS_LINK`
- `PREMIUM_LINK`
- `ONLYFANS_LINK`
- `FANSLY_LINK`
- `CUSTOMS_LINK`
- `THRONE_LINK`
- `CASHAPP_LINK`
- `PAYPAL_LINK`
- `VENMO_LINK`
- `WISHLIST_LINK`
- `GIFT_FORM_LINK`
- `SITE_SPOIL_LINK`
- `COFFEE_GIFT_LINK`
- `DRINKS_GIFT_LINK`
- `SNACK_GIFT_LINK`
- `FLOWERS_GIFT_LINK`
- `MANICURE_GIFT_LINK`
- `PEDICURE_GIFT_LINK`
- `GLAM_GIFT_LINK`
- `SHOPPING_GIFT_LINK`
- `VACATION_GIFT_LINK`
- `WORSHIP_100_LINK`
- `WORSHIP_250_LINK`
- `WORSHIP_500_LINK`
- `WORSHIP_1000_LINK`
- `WORSHIP_CUSTOM_LINK`
- `REUP_10_LINK`
- `REUP_25_LINK`
- `REUP_50_LINK`
- `REUP_100_LINK`
- `REUP_250_LINK`
- `REUP_MONTHLY_LINK`
- `BOOKING_LINK`
- `PRIVATE_REQUEST_LINK`
- `CUSTOM_REQUEST_LINK`
- `CONTACT_LINK`
- `MAIN_WEBSITE_LINK`
- `EXPERIENCE_DEJA_LINK`
- `LINKME_LINK`
- `X_LINK`
- `INSTAGRAM_LINK`
- `REDDIT_LINK`
- `TELEGRAM_CHANNEL_LINK`

## Optional Offer Env Vars

These control displayed reference pricing and Telegram Stars pricing.

- `TOPUP_10_PRICE`
- `TOPUP_10_STARS`
- `TOPUP_30_PRICE`
- `TOPUP_30_STARS`
- `TOPUP_60_PRICE`
- `TOPUP_60_STARS`
- `DAY_PASS_PRICE`
- `DAY_PASS_STARS`
- `INTIMATE_GALLERY_PRICE`
- `INTIMATE_GALLERY_STARS`
- `GIRLFRIEND_ACCESS_PRICE`
- `GIRLFRIEND_ACCESS_STARS`
- `GIRLFRIEND_WEEKLY_PRICE`
- `GIRLFRIEND_WEEKLY_STARS`
- `GIRLFRIEND_MONTHLY_PRICE`
- `GIRLFRIEND_MONTHLY_STARS`
- `GODDESS_ACCESS_PRICE`
- `GODDESS_ACCESS_STARS`
- `VIP_DEJA_PRICE`
- `VIP_DEJA_STARS`

If a Stars value is missing for an offer, that offer should feel manual-review-only instead of broken.

## DATA_DIR

`DATA_DIR` controls where the bot stores:

- `users.json`
- `links.json`
- `events.jsonl`
- local backup/temp files created during writes

Local default:

- If `DATA_DIR` is not set, the bot uses the project’s local `data/` folder.

Railway recommendation:

- Create a Railway volume.
- Mount it to a stable path, for example `/data`.
- Set `DATA_DIR=/data` in the Railway service environment variables.

This keeps paid access, credits, manual review requests, and event logs from disappearing after redeploys.

## Railway Setup Notes

1. Open the Railway project for the bot service.
2. Add a persistent volume to the bot service.
3. Mount the volume at `/data`.
4. Add `DATA_DIR=/data`.
5. Confirm `BOT_TOKEN` and `ADMIN_TELEGRAM_IDS` are set.
6. Redeploy the `deja-world-bot` service.

The bot runs in polling mode. During deploy handoff, a brief Telegram polling conflict can happen while the old container exits. The bot has retry handling for that.

## Local Development

Install:

```bash
pnpm install
```

Run locally:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Start built bot:

```bash
pnpm start
```

## Production Start Command

```bash
pnpm start
```

The Dockerfile builds TypeScript first, then starts `dist/bot.js`.

## Admin Commands

- `/admin`: Shows admin command list and pending review counts.
- `/stats`: Shows known, active, and stopped user counts.
- `/analytics`: Shows payment, access, user, and review analytics.
- `/recent_payments [LIMIT]`: Shows recent Stars payments.
- `/user_payments USER_ID`: Shows one user’s Stars payment history.
- `/private_drop girlfriend|goddess|vip|all_paid|credits Message text`: Previews and confirms a private drop by paid tier.
- `/expire_access`: Marks stale memberships as expired without deleting history.
- `/broadcast Message text`: Previews and confirms a broadcast.
- `/pending`: Shows pending manual/access reviews.
- `/user_status USER_ID`: Shows a user’s access, credits, payment history, and manual requests.
- `/approve_user USER_ID girlfriend|goddess|vip`: Manually approves access.
- `/add_credits USER_ID NUMBER`: Adds message credits.
- `/remove_access USER_ID`: Removes access and credits.

Admin access is based only on numeric Telegram IDs.

## Payment Flow

Telegram Stars:

- Stars are the instant in-bot unlock path.
- Stars invoices are sent inside Deja Always.
- Successful Stars payments automatically add credits or membership access.
- Successful Stars payments are stored in `users.json`.

Manual payments:

- CashApp, PayPal, and Venmo are manual review only.
- Direct payment links never auto-unlock access.
- Users must submit a note or screenshot for review.
- Admin approves access or credits after confirming payment outside the bot.
- Admin can deny a pending review if the payment is not confirmed or proof is unclear.

## Manual Payment Review Flow

User side:

1. User opens a manual payment door.
2. User sends payment through CashApp, PayPal, or Venmo.
3. User taps manual review.
4. User chooses what the payment was for.
5. User sends a short note or screenshot.
6. Bot stores the request as pending.

Admin side:

1. Admin opens `/pending`.
2. Admin checks the user/request.
3. Admin confirms payment outside the bot.
4. Admin approves access/credits or denies review.

## Telegram Stars vs Manual Payments

- Stars: instant, automatic, in-bot.
- CashApp/PayPal/Venmo: manual, reviewed, not automatic.

This distinction should stay clear everywhere. Do not make direct payment buttons behave like confirmed payment.

## Safety Notes

- Do not commit `.env`.
- Do not commit `data/users.json`.
- Do not copy real `data/users.json` into Docker images.
- Do not copy real event logs into Docker images.
- `.dockerignore` excludes `data/users.json` and `data/events.jsonl`.
- Payment proof notes can contain sensitive information, so do not log full proof text into events.
- Keep Deja World clear that some bot doors are automated prompts and paid access does not promise live human replies.
