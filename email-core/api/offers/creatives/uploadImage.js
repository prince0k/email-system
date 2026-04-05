import fs from "fs/promises"
import path from "path"
import multer from "multer"

import auth from "../../../middleware/auth.js"
import checkPermission from "../../../middleware/checkPermission.js"
import { PATHS } from "../../../config/paths.js"

import { deployImageToSenders } from "../../../services/senderImageDeploy.js"

const storage = multer.memoryStorage()

const upload = multer({
 storage,
 limits: {
  fileSize: 5 * 1024 * 1024
 }
})

const handler = async (req, res) => {

 try {

  if (!req.file) {
   return res.status(400).json({ error: "no_file_uploaded" })
  }

  const offerId = req.body.offerId

  if (!offerId) {
   return res.status(400).json({ error: "offerId_required" })
  }

  /* ================================
     EXTENSION VALIDATION
  ================================= */

  const ext = path.extname(req.file.originalname).toLowerCase()

  const allowed = [".jpg",".jpeg",".png",".gif",".webp"]

  if (!allowed.includes(ext)) {
   return res.status(400).json({
    error: "invalid_file_type"
   })
  }

  /* ================================
     CREATE DIRECTORY
  ================================= */

  const dir = path.join(PATHS.creativeAssets, `offer_${offerId}`)

  await fs.mkdir(dir, { recursive: true })

  /* ================================
     SAFE FILE NAME
  ================================= */

  /* ================================
   USE ORIGINAL FILE NAME
================================= */

let safeName = path.basename(req.file.originalname)

/* sanitize */
safeName = safeName.replace(/[^a-zA-Z0-9._-]/g, "_")

/* avoid overwrite */
const fullPath = path.join(dir, safeName)

try{
 await fs.access(fullPath)
 safeName = Date.now() + "_" + safeName
}catch{}

  const filePath = path.join(dir, safeName)

  /* ================================
     SAVE FILE
  ================================= */

  await fs.writeFile(filePath, req.file.buffer)

  /* ================================
     DEPLOY TO SENDERS
  ================================= */

  try {

   deployImageToSenders(filePath)
  .catch(err => console.error("SENDER IMAGE DEPLOY FAILED:", err))

  } catch (deployErr) {

   console.error("SENDER IMAGE DEPLOY FAILED:", deployErr)

  }

  /* ================================
     RESPONSE
  ================================= */

  const baseUrl = process.env.PUBLIC_ASSET_URL || "https://blastbees.com"

  const url = `${baseUrl}/creative_assets/offer_${offerId}/${safeName}`

  return res.json({
   success: true,
   url,
   file: safeName
  })

 } catch (err) {

  console.error("IMAGE UPLOAD ERROR:", err)

  return res.status(500).json({
   error: "upload_failed",
   message: err.message
  })

 }

}

export default [
 auth,
 checkPermission("creative.create"),
 upload.single("image"),
 handler
]