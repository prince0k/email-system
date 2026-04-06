import express from "express";
import PmtaQueues from "../../models/PmtaQueues.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const records = await PmtaQueues
      .find()
      .populate("server", "name")
      .lean();

    const queues = records.flatMap(r => r.queues || []);

    res.json(queues);

  } catch (err) {
    res.status(500).json({
      error: "pmta_queue_failed"
    });
  }
});

export default router;