import LinkToken from "../../models/LinkToken.js";
import Deploy from "../../models/Deploy.js";
import OptoutLog from "../../models/OptoutLog.js";
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

/* =========================
   TRACK OPTOUT
========================= */

export default async function trackOptout(req, res) {
  try {
    const token = String(req.query.k || "").trim();

    // 🔒 Strict token validation
    if (!isValidTrackingToken(token)) {
      return res.status(400).send("Invalid optout token");
    }

    /* =========================
       TOKEN RESOLUTION
    ========================= */
    const link = await LinkToken.findOne({
      token,
      type: "optout",
    })
      .select({
        offer_id: 1,
        email: 1,
        list_id: 1,
        send_domain: 1,
        vmta: 1,
      })
      .lean();

    if (!link || !link.email || !link.offer_id) {
      return res.status(400).send("Invalid optout request");
    }

    const email = normalizeEmail(link.email);

    const day = getPacificDayString();

    /* =========================
       FETCH DEPLOY (REDIRECT URL)
    ========================= */
    const deploy = await Deploy.findOne({
      offer_id: link.offer_id,
      status: "DEPLOYED",
    })
      .select({ optoutLink: 1 })
      .lean();

    if (!deploy || !isValidAbsoluteUrl(deploy.optoutLink)) {
      return res.status(400).send("Optout URL not configured");
    }

    const optoutUrl = deploy.optoutLink;

    /* =========================
       CLIENT META
    ========================= */

    const { ip, userAgent, country } = getClientMeta(req);

    /* =========================
       🔒 PERMANENT OPTOUT LOG
       (offer_id + email UNIQUE)
    ========================= */
    await OptoutLog.updateOne(
      { offer_id: link.offer_id, email },
      {
        $setOnInsert: {
          offer_id: link.offer_id,
          email,
          list_id: link.list_id || null,
          send_domain: link.send_domain || null,
          vmta: link.vmta || null,
          url: optoutUrl,
          ip,
          userAgent,
          country,
          day,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    /* =========================
       UPDATE TOKEN SUMMARY
    ========================= */
    await LinkToken.updateOne(
      { token },
      {
        $set: {
          opted_out: true,
          optout_at: new Date(),
          optout_ip: ip,
        },
      }
    );

    /* =========================
       REDIRECT (UNCHANGED)
    ========================= */

    const urlObj = new URL(optoutUrl);
    urlObj.searchParams.set("email", email);

    return res.redirect(302, urlObj.toString());
  } catch (err) {
    console.error("TRACK OPTOUT ERROR:", err);
    return res.status(500).send("Optout failed");
  }
}