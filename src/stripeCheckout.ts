import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { InlineKeyboard, type Bot, type Context } from "grammy";
import Stripe from "stripe";
import { config } from "./config.js";
import {
  canUseStripeCheckout,
  getOffer,
  offerLabel,
  stripeAmountCents,
  stripeOfferDescription,
  stripeOfferName,
  type ResolvedOffer
} from "./offers.js";
import { logEvent, recordStripePaymentDelivery, type AccessRequest } from "./storage.js";

const stripePayloadPrefix = "deja:stripe:";
const maxWebhookBodyBytes = 1024 * 1024;

let stripeClient: Stripe | undefined;

function stripe(): Stripe | undefined {
  if (!config.stripeCheckoutEnabled || !config.stripeSecretKey) return undefined;
  stripeClient ??= new Stripe(config.stripeSecretKey);
  return stripeClient;
}

export function stripeCheckoutAvailable(offer: ResolvedOffer | undefined): boolean {
  return Boolean(stripe() && offer && canUseStripeCheckout(offer));
}

function botReturnUrl(): string {
  return `https://t.me/${config.botUsername}`;
}

function checkoutSuccessUrl(): string {
  return config.stripeSuccessUrl || `${botReturnUrl()}?start=stripe_success`;
}

function checkoutCancelUrl(): string {
  return config.stripeCancelUrl || `${botReturnUrl()}?start=stripe_cancel`;
}

function checkoutPayload(offer: ResolvedOffer): string {
  return `${stripePayloadPrefix}${offer.id}`;
}

function requestForOffer(offer: ResolvedOffer): Omit<AccessRequest, "requestedAt" | "status"> {
  return {
    kind: offer.creditAmount ? "topup" : "membership",
    optionKey: offer.id,
    label: offerLabel(offer),
    ...(offer.usdReference ? { price: offer.usdReference } : {}),
    ...(offer.accessType ? { accessType: offer.accessType } : {})
  };
}

function paymentIntentId(session: Stripe.Checkout.Session): string | undefined {
  const intent = session.payment_intent;
  if (!intent) return undefined;
  return typeof intent === "string" ? intent : intent.id;
}

function normalizePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized;
}

function writeText(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(body);
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxWebhookBodyBytes) {
      throw new Error("Webhook body is too large.");
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

async function createStripeCheckoutSession(
  ctx: Context,
  offer: ResolvedOffer
): Promise<Stripe.Checkout.Session | undefined> {
  const client = stripe();
  const amount = stripeAmountCents(offer);

  if (!ctx.from || !client || !amount || !canUseStripeCheckout(offer)) return undefined;

  const session = await client.checkout.sessions.create({
    mode: "payment",
    success_url: checkoutSuccessUrl(),
    cancel_url: checkoutCancelUrl(),
    client_reference_id: String(ctx.from.id),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: {
            name: stripeOfferName(offer),
            description: stripeOfferDescription(offer)
          }
        }
      }
    ],
    metadata: {
      integration: "deja_world_bot",
      telegramUserId: String(ctx.from.id),
      offerId: offer.id,
      payload: checkoutPayload(offer),
      deliveryType: offer.deliveryType
    },
    payment_intent_data: {
      metadata: {
        integration: "deja_world_bot",
        telegramUserId: String(ctx.from.id),
        offerId: offer.id,
        payload: checkoutPayload(offer)
      }
    }
  });

  await logEvent("stripe_checkout_created", {
    userId: ctx.from.id,
    offerId: offer.id,
    amountCents: amount
  });

  return session;
}

async function sendStripeCheckout(ctx: Context, offerId: string): Promise<void> {
  const offer = getOffer(offerId);

  if (!ctx.from || !offer || !stripeCheckoutAvailable(offer)) {
    await ctx.reply(
      [
        "Card checkout is not open for this door yet.",
        "",
        "Use Telegram Stars for instant access, or use the direct payment doors for manual review."
      ].join("\n"),
      {
        reply_markup: new InlineKeyboard()
          .text("Back to Deja Always", "DEJA_ALWAYS")
          .row()
          .text("Payment Support", "DEJA_PAY_SUPPORT")
      }
    );
    return;
  }

  const session = await createStripeCheckoutSession(ctx, offer);
  if (!session?.url) {
    await ctx.reply("Card checkout is resting for a moment. Try again from Deja Always.", {
      reply_markup: new InlineKeyboard().text("Back to Deja Always", "DEJA_ALWAYS")
    });
    return;
  }

  await logEvent("stripe_checkout_opened", {
    userId: ctx.from.id,
    offerId: offer.id,
    amountCents: stripeAmountCents(offer)
  });

  await ctx.reply(
    [
      "Your card checkout is ready.",
      "",
      "Use the secure card door below. Your key opens only after the payment processor confirms it.",
      "",
      `You’re choosing: ${offerLabel(offer)}`
    ].join("\n"),
    {
      reply_markup: new InlineKeyboard()
        .url("Open Card Checkout", session.url)
        .row()
        .text("I Paid, Let Me In", "DEJA_STATUS")
        .row()
        .text("Back to Deja Always", "DEJA_ALWAYS")
    }
  );
}

async function handleCheckoutSessionCompleted(bot: Bot, session: Stripe.Checkout.Session): Promise<void> {
  await logEvent("stripe_webhook_received", {
    eventType: "checkout.session.completed",
    sessionId: session.id,
    paid: session.payment_status === "paid"
  });

  if (session.payment_status !== "paid") return;

  const offerId = session.metadata?.offerId;
  const telegramUserId = session.metadata?.telegramUserId ?? session.client_reference_id ?? undefined;
  const payload = session.metadata?.payload ?? (offerId ? `${stripePayloadPrefix}${offerId}` : undefined);
  const offer = getOffer(offerId);
  const expectedAmount = offer ? stripeAmountCents(offer) : undefined;

  if (!telegramUserId || !/^\d+$/.test(telegramUserId) || !offer || !expectedAmount || !payload) {
    console.warn("Stripe webhook skipped: missing user, offer, or amount metadata.");
    return;
  }

  if (offer.deliveryType === "paid_media" || !canUseStripeCheckout(offer)) {
    console.warn(`Stripe webhook skipped: offer ${offer.id} is not eligible for Stripe checkout.`);
    return;
  }

  if ((session.amount_total ?? 0) !== expectedAmount || (session.currency ?? "").toLowerCase() !== "usd") {
    console.warn(`Stripe webhook skipped: amount mismatch for session ${session.id}.`);
    return;
  }

  const result = await recordStripePaymentDelivery(telegramUserId, {
    offerId: offer.id,
    amountCents: expectedAmount,
    currency: session.currency ?? "usd",
    ...(offer.usdReference ? { usdReference: offer.usdReference } : {}),
    stripeCheckoutSessionId: session.id,
    ...(paymentIntentId(session) ? { stripePaymentIntentId: paymentIntentId(session) } : {}),
    payload,
    ...(offer.creditAmount ? { credits: offer.creditAmount } : {}),
    ...(offer.accessType ? { accessType: offer.accessType } : {}),
    ...(offer.durationDays ? { durationDays: offer.durationDays } : {}),
    request: requestForOffer(offer)
  });

  if (!result.alreadyProcessed) {
    await logEvent("stripe_payment_success", {
      userId: telegramUserId,
      offerId: offer.id,
      amountCents: expectedAmount,
      deliveryType: offer.deliveryType
    });
  }

  try {
    await bot.api.sendMessage(
      telegramUserId,
      result.alreadyProcessed
        ? "This card payment was already delivered.\n\nOpen My Access to see your current key."
        : "Payment confirmed. Your key is active now.\n\nOpen Deja Always and come back through the door.",
      {
        reply_markup: new InlineKeyboard()
          .text("Open Deja Always", "DEJA_ALWAYS")
          .row()
          .text("My Access", "DEJA_STATUS")
      }
    );
  } catch {
    // The payment is still delivered locally even if Telegram cannot message the user.
  }
}

async function handleStripeWebhook(bot: Bot, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const client = stripe();

  if (!client || !config.stripeWebhookSecret) {
    writeText(res, 503, "Stripe webhook is not configured.");
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (!signature || Array.isArray(signature)) {
    writeText(res, 400, "Missing Stripe signature.");
    return;
  }

  let event: Stripe.Event;
  try {
    const body = await readBody(req);
    event = client.webhooks.constructEvent(body, signature, config.stripeWebhookSecret);
  } catch (error) {
    console.warn("Stripe webhook verification failed:", error instanceof Error ? error.message : "Unknown error");
    writeText(res, 400, "Webhook signature verification failed.");
    return;
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutSessionCompleted(bot, event.data.object as Stripe.Checkout.Session);
  }

  writeText(res, 200, "ok");
}

export function registerStripeCheckoutHandlers(bot: Bot): void {
  bot.callbackQuery(/^DEJA_STRIPE_OFFER_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendStripeCheckout(ctx, ctx.match[1]);
  });
}

export function startStripeWebhookServer(bot: Bot): void {
  if (!config.port) return;

  const webhookPath = normalizePath(config.stripeWebhookPath);
  const server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? "/", "http://localhost");
      const path = normalizePath(url.pathname);

      if (req.method === "GET" && path === "/health") {
        writeText(res, 200, "ok");
        return;
      }

      if (req.method === "POST" && path === webhookPath) {
        await handleStripeWebhook(bot, req, res);
        return;
      }

      writeText(res, 404, "not found");
    })().catch((error) => {
      console.error("HTTP server error:", error instanceof Error ? error.message : "Unknown error");
      if (!res.headersSent) writeText(res, 500, "server error");
    });
  });

  server.listen(config.port, () => {
    console.log(`HTTP server listening on port ${config.port}.`);
    if (config.stripeCheckoutEnabled) {
      console.log(`Stripe webhook path ready at ${webhookPath}.`);
    }
  });
}
