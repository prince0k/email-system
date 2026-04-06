import Campaign from "../../models/Campaign.js";
import { callSender } from "./helpers/senderBridge.js";
import { validateTransition } from "./helpers/validateTransition.js";

export default async function controlCampaign(req, res) {
  try {
    const rawCampaign = req.params.campaign;
    const { action } = req.body;

    if (!rawCampaign || typeof rawCampaign !== "string") {
      return res.status(400).json({ error: "invalid_campaign" });
    }

    const campaignName = decodeURIComponent(rawCampaign).trim();

    if (!["PAUSE", "RESUME", "STOP"].includes(action)) {
      return res.status(400).json({ error: "invalid_action" });
    }

    const campaign = await Campaign.findOne({ campaignName });

    if (!campaign) {
      return res.status(404).json({ error: "campaign_not_found" });
    }

    /* =====================
       MAP ACTION → STATUS
    ===================== */

    const actionToStatus = {
      PAUSE: "PAUSED",
      RESUME: "RUNNING",
      STOP: "STOPPED",
    };

    const targetStatus = actionToStatus[action];

    /* =====================
       TERMINAL STATE BLOCK
    ===================== */

    if (["COMPLETED", "FAILED"].includes(campaign.status)) {
      return res.status(400).json({ error: "campaign_not_controllable" });
    }

    /* =====================
       TRANSITION VALIDATION
    ===================== */

    if (!validateTransition(campaign.status, targetStatus)) {
      return res.status(400).json({ error: "invalid_transition" });
    }

    /* =====================
       CALL SENDER
    ===================== */

    const senderResponse = await callSender(
  campaign.sender,
  "updateControl.php",
  {
    campaignName: campaign.campaignName,
    action,
  }
);

    if (
      !senderResponse ||
      senderResponse.error ||
      senderResponse.status !== "updated"
    ) {
      return res.status(502).json({
        error: "sender_control_failed",
        details: senderResponse,
      });
    }

    /* =====================
       UPDATE DB STATUS
    ===================== */

    campaign.execution = campaign.execution || {};

    campaign.status = targetStatus;

    if (targetStatus === "STOPPED") {
      campaign.execution.completedAt = new Date();
    }

    campaign.execution.lastStatusUpdate = new Date();

    await campaign.save();

    return res.json({
      status: "ok",
      campaign: campaign.campaignName,
      newStatus: targetStatus,
    });

  } catch (err) {
    console.error("CONTROL CAMPAIGN ERROR:", err);
    return res.status(500).json({ error: "control_failed" });
  }
}
