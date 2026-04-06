import crypto from "crypto";

import LinkToken from "../../models/LinkToken.js";
import Deploy from "../../models/Deploy.js";
import ClickLog from "../../models/ClickLog.js";
import normalizeEmail from "../../utils/normalizeEmail.js";
import { getClientMeta, getPacificDayString, isValidTrackingToken } from "./helpers.js";

/* =========================
   HELPERS
========================= */

function isValidAbsoluteUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function md5Email(email) {
  return crypto
    .createHash("md5")
    .update(email.toLowerCase().trim())
    .digest("hex");
}

function isBot(userAgent = "") {
  const bots = [
 "googlebot",
 "bingbot",
 "yahoo",
 "barracuda",
 "proofpoint",
 "mimecast",
 "curl",
 "wget",
 "python",
 "java",
 "httpclient",
 "bot",
 "crawler",
 "scanner"
];

  return bots.some((bot) =>
    userAgent.toLowerCase().includes(bot.toLowerCase())
  );
}

/* =========================
   TRACK CLICK
========================= */

export default async function trackClick(req, res) {
  try {
    const token = String(req.query.k || "").trim();

    if (!isValidTrackingToken(token)) {
      return res.sendStatus(400);
    }

    // 🔥 STEP 1: minimal DB fetch (ONLY required)
    const link = await LinkToken.findOne({
      token,
      type: "click",
    })
      .select({
        offer_id: 1,
        rl: 1,
        email: 1,
        list_id: 1,
        send_domain: 1,
        vmta: 1,
      })
      .lean();

    if (!link || !link.offer_id || !link.rl) {
      return res.sendStatus(404);
    }

    const deploy = await Deploy.findOne({
      offer_id: link.offer_id,
      status: "DEPLOYED",
    })
      .select({ redirectLinks: 1, campaignId: 1, offerId: 1 })
      .lean();

    if (
      !deploy ||
      !Array.isArray(deploy.redirectLinks) ||
      !deploy.redirectLinks[link.rl - 1]
    ) {
      return res.sendStatus(404);
    }

    const baseRedirect = deploy.redirectLinks[link.rl - 1];

    if (!isValidAbsoluteUrl(baseRedirect)) {
      return res.sendStatus(400);
    }

    // 🔥 build URL fast
    const email = link.email ? normalizeEmail(link.email) : null;

    const parts = [baseRedirect.replace(/\/$/, ""), link.offer_id];

    if (link.list_id) parts.push(link.list_id);
    if (email) parts.push(md5Email(email));

    const redirectUrl = parts.join("/");

    // 🔥 STEP 2: INSTANT RESPONSE (CRITICAL)
    res.setHeader("Connection", "close");
    res.redirect(302, redirectUrl);

    // 🔥 STEP 3: BACKGROUND PROCESSING
    setImmediate(async () => {
      try {
        const { ip, userAgent, country } = getClientMeta(req);
        const bot = isBot(userAgent);
        const now = new Date();
        const day = getPacificDayString(now);

        await Promise.allSettled([
          ClickLog.updateOne(
            {
              offer_id: link.offer_id,
              rl: link.rl,
              day,
              ...(email ? { email } : {}),
            },
            {
              $setOnInsert: {
                offer_id: link.offer_id,
                campaignId: deploy?.campaignId || null,
                offerId: deploy?.offerId || null,
                email,
                send_domain: link.send_domain || null,
                vmta: link.vmta || null,
                list_id: link.list_id || null,
                rl: link.rl,
                url: redirectUrl,
                ip,
                userAgent,
                country,
                day,
                is_bot_click: bot,
              },
            },
            { upsert: true }
          ),
          LinkToken.updateOne(
            { token },
            [
              {
                $set: {
                  click_count: { $add: [{ $ifNull: ["$click_count", 0] }, 1] },
                  first_click_at: { $ifNull: ["$first_click_at", now] },
                  last_click_at: now,
                  click_ip: ip,
                  click_ua: userAgent,
                  is_bot_click: bot,
                },
              },
            ]
          ),
        ]);
      } catch (err) {
        console.error("BG ERROR:", err);
      }
    });

  } catch (err) {
    console.error("TRACK CLICK ERROR:", err);

    if (!res.headersSent) {
      return res.sendStatus(500);
    }
  }
}