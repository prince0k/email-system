import LinkToken from "../../models/LinkToken.js";
import OpenLog from "../../models/OpenLog.js";
import normalizeEmail from "../../utils/normalizeEmail.js";
import { getClientMeta, isValidTrackingToken } from "./helpers.js";

export default async function trackOpen(req, res) {
  pixel(res);

  try {
    const token = String(req.query.k || "").trim();
    if (!isValidTrackingToken(token)) return;

    const link = await LinkToken.findOne({
      token,
      type: "open",
    })
      .select({
        offer_id: 1,
        campaignId: 1,
        offerId: 1,
        email: 1,
        send_domain: 1,
        vmta: 1,
        list_id: 1,
      })
      .lean();

    if (!link || !link.offer_id) return;

    const email = link.email ? normalizeEmail(link.email) : null;
    const day = new Date();
    day.setUTCHours(0,0,0,0);
    const now = new Date();

    const { ip, userAgent, country } = getClientMeta(req);

    const bot = isBot(userAgent);

    const match = {
      offer_id: link.offer_id,
      day,
      token,
      ...(email ? { email } : {})
    };

    /* ===============================
       OPEN LOG UPSERT
    =============================== */

    const openLogPromise = OpenLog.updateOne(
  match,
  {
    $setOnInsert: {
      offer_id: link.offer_id,
      campaignId: link.campaignId || null,
      offerId: link.offerId || null,
      email,
      token,

      send_domain: link.send_domain || null,
      vmta: link.vmta || null,
      list_id: link.list_id || null,

      day,

      ip,
      userAgent,
      country,

      unique_open_count: bot ? 0 : 1
    },

    $inc: {
      total_open_count: 1,
      bot_open_count: bot ? 1 : 0
    }
  },
  { upsert: true }
);

    /* ===============================
       TOKEN SUMMARY UPDATE
    =============================== */

    const tokenSummaryPromise = LinkToken.updateOne(
      { token },
      [
        {
          $set: {
            open_count: { $add: [{ $ifNull: ["$open_count", 0] }, 1] },
            first_open_at: { $ifNull: ["$first_open_at", now] },
            last_open_at: now,
            open_ip: ip,
            open_ua: userAgent,
            is_bot_open: bot,
          },
        },
      ]
    );

    await Promise.all([openLogPromise, tokenSummaryPromise]);

  } catch (err) {
    console.error("Open tracking error:", err);
  }
}

function isBot(userAgent = "") {
  const bots = [
  "GoogleImageProxy",
  "Googlebot",
  "Barracuda",
  "Proofpoint",
  "Microsoft Office",
  "Microsoft Office 365",
  "Symantec",
  "Mimecast",
  "Trend Micro",
  "SpamTitan",
  "Cisco",
  "FireEye",
  "Avanan",
  "Bitdefender",
  "ESET",
  "Thunderbird",
  "AppleMail",
  "Outlook",
  "curl",
  "wget"
];

  return bots.some((bot) =>
    userAgent.toLowerCase().includes(bot.toLowerCase())
  );
}

function pixel(res) {
  const gif = Buffer.from(
    "R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
    "base64"
  );

  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.end(gif);
}