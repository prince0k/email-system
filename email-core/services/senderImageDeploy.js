import axios from "axios"
import FormData from "form-data"
import fs from "fs"
import path from "path"
import SenderServer from "../models/SenderServer.js"

const INTERNAL_KEY = process.env.SENDER_INTERNAL_KEY

export async function deployImageToSenders(filePath){

 const fileName = path.basename(filePath)

 const senders = await SenderServer
  .find({ active: true })
  .select("baseUrl name")

 if(!senders.length){
  console.warn("No active sender servers found")
  return
 }

 const tasks = senders.map(async (sender)=>{

  const uploadUrl = `${sender.baseUrl}/uploadImage.php`

  const form = new FormData()

  form.append("image", fs.createReadStream(filePath), fileName)

  try{

   await axios.post(uploadUrl, form, {
    headers:{
     ...form.getHeaders(),
     "X-Internal-Key": INTERNAL_KEY
    },
    timeout:15000
   })

   console.log(`✅ image deployed to ${sender.name}`)

  }catch(err){

   console.error(
    `❌ image deploy failed on ${sender.name}`,
    err.response?.data || err.message
   )

  }

 })

 await Promise.all(tasks)

 return fileName
}