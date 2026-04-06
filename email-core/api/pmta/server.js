import express from "express";
const router = express.Router();

import SenderServer from "../../models/SenderServer.js";
import PmtaStats from "../../models/PmtaStats.js";
import { fetchQueues } from "../../services/pmta/pmtaQueueService.js";
import { fetchDomains } from "../../services/pmta/pmtaDomainService.js";

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const server = await SenderServer.findById(id);

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const [queues, domains] = await Promise.all([
      fetchQueues(server).catch(() => []),
      fetchDomains(server).catch(() => [])
    ]);

    const stats = await PmtaStats.findOne({
      server: server._id
    });

    res.json({
      server: {
        _id: server._id,
        name: server.name,
        code: server.code
      },

      sent: stats?.sent || 0,
      delivered: stats?.delivered || 0,
      bounced: stats?.bounced || 0,
      deferred: stats?.deferred || 0,

      queues,
      domains
    });

  } catch (err) {
    console.error("Server Detail Error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: err.message
    });
  }
});

export default router;