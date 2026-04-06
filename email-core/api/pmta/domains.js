import express from "express";
import PmtaDomains from "../../models/PmtaDomains.js";

const router = express.Router();

router.get("/", async (req,res)=>{

 try{

   const domains = await PmtaDomains
     .find()
     .populate("server","name")
     .lean();

   res.json(domains);

 }catch(err){

   res.status(500).json({
     error:"pmta_domain_failed"
   });

 }

});

export default router;