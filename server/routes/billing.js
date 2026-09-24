const express = require("express");
const Stripe = require("stripe");
const pool = require("../db/pool");
const { attachSession, requireAuth } = require("../middleware/session");
const { requireGuildAccess } = require("../middleware/guildAccess");

const router = express.Router();
const WEB_BASE_URL = process.env.WEB_BASE_URL;

// Built lazily (not at module load) so the rest of the API still boots and
// works when Stripe isn't configured yet — only requests that actually hit
// a billing route fail, with a clear error, instead of the whole process
// crashing on startup.
let stripe = null;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const err = new Error("Billing isn't configured yet (STRIPE_SECRET_KEY is unset)");
    err.status = 503;
    throw err;
  }
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

const PRICE_TO_PLAN = {
  [process.env.STRIPE_PRICE_ID_PRO]: "pro",
  [process.env.STRIPE_PRICE_ID_ENTERPRISE]: "enterprise",
};

// POST /billing/:guildId/checkout — only the owner can change billing.
router.post("/:guildId/checkout", attachSession, requireAuth, requireGuildAccess, async (req, res) => {
  if (!req.isGuildOwner) return res.status(403).json({ error: "Only the server owner can manage billing" });
  const { priceId } = req.body;
  if (!priceId) return res.status(400).json({ error: "priceId is required" });

  const stripe = getStripe();
  let customerId = req.guild.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { guild_id: req.guild.id, discord_owner_id: req.user.id },
    });
    customerId = customer.id;
    await pool.query("UPDATE guilds SET stripe_customer_id = $1 WHERE id = $2", [customerId, req.guild.id]);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${WEB_BASE_URL}/dashboard/${req.guild.id}?upgraded=1`,
    cancel_url: `${WEB_BASE_URL}/dashboard/${req.guild.id}?upgrade_cancelled=1`,
    metadata: { guild_id: req.guild.id },
  });
  res.json({ url: session.url });
});

router.post("/:guildId/portal", attachSession, requireAuth, requireGuildAccess, async (req, res) => {
  if (!req.isGuildOwner) return res.status(403).json({ error: "Only the server owner can manage billing" });
  if (!req.guild.stripe_customer_id) return res.status(400).json({ error: "No billing account yet" });

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: req.guild.stripe_customer_id,
    return_url: `${WEB_BASE_URL}/dashboard/${req.guild.id}`,
  });
  res.json({ url: session.url });
});

// Stripe webhook — mounted with express.raw() in app.js (signature
// verification needs the exact raw body, not the JSON-parsed one).
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      // metadata.guild_id comes from our own /checkout endpoint; a Stripe
      // Payment Link checkout instead carries the guild ID as
      // client_reference_id (set via ?client_reference_id=<guildId> on the
      // Payment Link URL — see web/pages/dashboard/[guildId]/index.js).
      const guildId = session.metadata?.guild_id || session.client_reference_id;
      if (guildId) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = PRICE_TO_PLAN[priceId];
        if (plan) {
          await pool.query(
            "UPDATE guilds SET plan = $1, stripe_subscription_id = $2 WHERE id = $3",
            [plan, subscription.id, guildId]
          );
        }
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const priceId = subscription.items.data[0]?.price?.id;
      const isActive = subscription.status === "active" || subscription.status === "trialing";
      const plan = isActive ? PRICE_TO_PLAN[priceId] : "free";
      if (plan) {
        await pool.query(
          "UPDATE guilds SET plan = $1 WHERE stripe_subscription_id = $2",
          [plan, subscription.id]
        );
      }
    }
  } catch (err) {
    console.error("Error handling Stripe webhook:", err);
    return res.status(500).send("Webhook handler failed");
  }

  res.json({ received: true });
});

module.exports = router;
