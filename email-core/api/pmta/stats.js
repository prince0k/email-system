import express from "express";
import PmtaStats from "../../models/PmtaStats.js";

const router = express.Router();

router.get("/", async (req,res)=>{

 try{

   const stats = await PmtaStats
     .find()
     .populate("server","name code")
     .lean();

   res.json(stats);

 }catch(err){

   res.status(500).json({
     error:"pmta_stats_failed"
   });

 }

});

export default router;