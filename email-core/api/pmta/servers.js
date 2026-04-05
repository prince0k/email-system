import express from "express";
import SenderServer from "../../models/SenderServer.js";

const router = express.Router();

router.get("/", async (req, res) => {

  try {

    const servers = await SenderServer
      .find()
      .select("name code active pmta.host stats.totalSent stats.totalBounce stats.totalComplaints stats.lastUsedAt")
      .lean();

    res.json({ servers });

  } catch (err) {

    console.error("PMTA servers API error:", err);

    res.status(500).json({
      error: "pmta_servers_failed"
    });

  }

});

export default router;