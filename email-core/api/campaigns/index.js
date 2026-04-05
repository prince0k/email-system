import express from "express";
import Campaign from "../../models/Campaign.js";
import { callSender } from "./helpers/senderBridge.js";

import suppressCampaign from "./suppressCampaign.js";
import createCampaign from "./createCampaign.js";
import reviewCampaign from "./reviewCampaign.js";
import runCampaign from "./runCampaign.js";
import campaignStatus from "./campaignStatus.js";
import copyCampaign from "./copyCampaign.js";
import controlCampaign from "./controlCampaign.js";
import listCampaigns from "./listCampaigns.js";
import analytics from "./analytics.js";
import liveStatus from "./liveStatus.js";
import campaignAnalytics from "./campaignAnalytics.js";
import saveExecutionSettings from "./saveExecutionSettings.js";
import deleteCampaign from "./deleteCampaign.js";
import { validateTransition } from "./helpers/validateTransition.js";

const router = express.Router();

/* ==============================
   🔥 LOAD CAMPAIGN MIDDLEWARE
============================== */

async function loadCampaign(req, res, next) {
  try {
    const campaignName = decodeURIComponent(req.params.campaign).trim();

    const campaignDoc = await Campaign.findOne({
      campaignName,
    });

    if (!campaignDoc) {
      return res.status(404).json({ error: "campaign_not_found" });
    }

    req.campaignDoc = campaignDoc;
    req.campaignName = campaignName;

    next();
  } catch (err) {
    console.error("LOAD CAMPAIGN ERROR:", err);
    return res.status(500).json({ error: "campaign_load_failed" });
  }
}

/* ==============================
   🔥 BASE ROUTES (IMPORTANT ORDER)
============================== */

router.get("/", listCampaigns);
router.get("/analytics", analytics);

router.post("/create", createCampaign);
router.post("/copy", copyCampaign);
router.post("/delete", deleteCampaign);
/* ==============================
   🔥 CAMPAIGN ACTION ROUTES
============================== */

router.get("/:campaign/review", loadCampaign, reviewCampaign);
router.post("/:campaign/run", loadCampaign, runCampaign);
router.post("/:campaign/suppress", loadCampaign, suppressCampaign);
router.get("/:campaign/status", loadCampaign, campaignStatus);
router.post("/:campaign/control", loadCampaign, controlCampaign);
router.get("/:campaign/analytics", loadCampaign, campaignAnalytics);
router.get("/:campaign/live", loadCampaign, liveStatus);
router.post("/:campaign/save-config", loadCampaign, saveExecutionSettings);

/* ==============================
   🔥 CREATIVE (FROM SENDER)
============================== */

router.get("/:campaign/creative", loadCampaign, async (req, res) => {
  try {
    const senderResponse = await callSender(
      req.campaignDoc.sender,
      "getCreative.php",
      { campaignName: req.campaignName }
    );

    res.json(senderResponse);
  } catch (err) {
    console.error("LOAD CREATIVE ERROR:", err);
    res.status(500).json({ error: "creative_load_failed" });
  }
});

router.post("/:campaign/creative", loadCampaign, async (req, res) => {
  try {
    const { html } = req.body;

    const senderResponse = await callSender(
      req.campaignDoc.sender,
      "updateCreative.php",
      {
        campaignName: req.campaignName,
        html,
      }
    );

    res.json(senderResponse);
  } catch (err) {
    console.error("UPDATE CREATIVE ERROR:", err);
    res.status(500).json({ error: "creative_update_failed" });
  }
});

router.post("/:campaign/creative/reset", loadCampaign, async (req, res) => {
  try {
    const senderResponse = await callSender(
      req.campaignDoc.sender,
      "resetCreative.php",
      { campaignName: req.campaignName }
    );

    res.json(senderResponse);
  } catch (err) {
    console.error("RESET CREATIVE ERROR:", err);
    res.status(500).json({ error: "creative_reset_failed" });
  }
});

/* ==============================
   🔥 CONTROL ACTIONS
============================== */

router.post("/:campaign/pause", loadCampaign, async (req, res) => {
  try {
    const campaignDoc = req.campaignDoc;

    if (!validateTransition(campaignDoc.status, "PAUSED")) {
      return res.status(400).json({ error: "invalid_transition" });
    }

    const senderResponse = await callSender(
      campaignDoc.sender,
      "updateControl.php",
      {
        campaignName: req.campaignName,
        status: "PAUSED",
      }
    );

    if (!senderResponse || senderResponse.error) {
      return res.status(500).json({ error: "sender_failed" });
    }

    campaignDoc.status = "PAUSED";
    await campaignDoc.save();

    res.json({ status: "paused" });
  } catch (err) {
    res.status(500).json({ error: "pause_failed" });
  }
});

router.post("/:campaign/resume", loadCampaign, async (req, res) => {
  try {
    const campaignDoc = req.campaignDoc;

    if (!validateTransition(campaignDoc.status, "RUNNING")) {
      return res.status(400).json({ error: "invalid_transition" });
    }

    const senderResponse = await callSender(
      campaignDoc.sender,
      "updateControl.php",
      {
        campaignName: req.campaignName,
        status: "RUNNING",
      }
    );

    if (!senderResponse || senderResponse.error) {
      return res.status(500).json({ error: "sender_failed" });
    }

    campaignDoc.status = "RUNNING";
    await campaignDoc.save();

    res.json({ status: "resumed" });
  } catch (err) {
    res.status(500).json({ error: "resume_failed" });
  }
});

router.post("/:campaign/stop", loadCampaign, async (req, res) => {
  try {
    const campaignDoc = req.campaignDoc;

    if (!validateTransition(campaignDoc.status, "STOPPED")) {
      return res.status(400).json({ error: "invalid_transition" });
    }

    const senderResponse = await callSender(
      campaignDoc.sender,
      "updateControl.php",
      {
        campaignName: req.campaignName,
        status: "STOPPED",
      }
    );

    if (!senderResponse || senderResponse.error) {
      return res.status(500).json({ error: "sender_failed" });
    }

    campaignDoc.status = "STOPPED";
    await campaignDoc.save();

    res.json({ status: "stopped" });
  } catch (err) {
    res.status(500).json({ error: "stop_failed" });
  }
});

export default router;