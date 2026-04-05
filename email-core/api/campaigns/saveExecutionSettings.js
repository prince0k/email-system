import Campaign from "../../models/Campaign.js";

export default async function saveExecutionSettings(req, res) {
  try {
    const campaign = decodeURIComponent(req.params.campaign).trim();
    const config = req.body;

    if (!req.user?.mongoId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const campaignDoc = await Campaign.findOne({ campaignName: campaign });

    if (!campaignDoc) {
      return res.status(404).json({ error: "campaign_not_found" });
    }

    campaignDoc.sendConfig = {
      ...(campaignDoc.sendConfig || {}),
      ...config,
      createdBy: req.user.mongoId, // 🔥 FIX
    };

    await campaignDoc.save();

    res.json({ success: true });

  } catch (err) {
    console.error("SAVE CONFIG ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}