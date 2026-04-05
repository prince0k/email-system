import fs from "fs";
import path from "path";

import ClickLog from "../../models/ClickLog.js";
import OpenLog from "../../models/OpenLog.js";
import Campaign from "../../models/Campaign.js";
import Offer from "../../models/Offer.js";
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
function clean(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")   // sab non-alphanumeric → _
    .replace(/_+/g, "_")          // multiple _ → single _
    .replace(/^_|_$/g, "");       // start/end _ remove
}

const SEGMENT_DIR = "/var/www/email-core-data/segments";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function generateSegmentName({
  type,
  vid,
  isp,
  sendingDomain,
  vmta,
  from,
  to,
  minOpen,
  maxOpen,
  minClick,
  maxClick,
  sourceSegment
}) {

  const parts = [];

  /* TYPE */
  if (type === "click") parts.push("clicker");
  else if (type === "open") parts.push("opener");
  else parts.push("engager");

  /* OFFER */
  if (vid) parts.push(`vid${vid}`);

  /* ISP */
  if (isp) parts.push(clean(isp));

  /* DOMAIN */
  if (sendingDomain) parts.push(`dom${clean(sendingDomain)}`);

  /* VMTA */
  if (vmta) parts.push(`vmta${clean(vmta)}`);

  /* DATE */
  const today = new Date().toISOString().slice(0, 10);

  if (!from && !to) {
    parts.push("all");
  } else if (to === today) {
    const diff =
      Math.floor(
        (new Date(today) - new Date(from)) / (1000 * 60 * 60 * 24)
      ) + 1;

    parts.push(`d${diff}`);
  } else {
    const format = (d) => {
      const date = new Date(d);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear()).slice(-2);
      return `${day}${month}${year}`;
    };

    parts.push(`${format(from)}-${format(to)}`);
  }

  /* OPEN RANGE */
  if (minOpen || maxOpen) {
    parts.push(`o${minOpen || 0}_${maxOpen || "x"}`);
  }

  /* CLICK RANGE */
  if (minClick || maxClick) {
    parts.push(`c${minClick || 0}_${maxClick || "x"}`);
  }

  /* SOURCE SEGMENT */
  if (sourceSegment) {
    parts.push("src");
  }

  /* UNIQUE (IMPORTANT) */
  parts.push(Date.now().toString().slice(-5)); // short unique id

  return parts.join("_");
}

export default async function build(req, res) {
  try {

    let { 
      name,
      type,
      from,
      to,
      isp,
      shuffle,
      sort,
      sourceSegment,
      sendingDomain,
      vmta,
      minOpen,
      maxOpen,
      minClick,
      maxClick,
      offerId
    } = req.body;
    const minOpenValue = toNumberOrNull(minOpen);
    const maxOpenValue = toNumberOrNull(maxOpen);
    const minClickValue = toNumberOrNull(minClick);
    const maxClickValue = toNumberOrNull(maxClick);

    if (!["click", "open", "both"].includes(type)) {
      return res.status(400).json({
        error: "invalid_segment_type"
      });
    }

    let offerVid = null;

    if (offerId) {

      const offer = await Offer
      .findById(offerId)
      .select("vid")
      .lean();

      console.log("offer:", offer);

      if (offer) {
        offerVid = offer.vid || null;
      }

    }

    if(!name){
      name = generateSegmentName({
        type,
        vid: offerVid,
        isp,
        sendingDomain,
        vmta,
        from,
        to,
        minOpen,
        maxOpen,
        minClick,
        maxClick,
        sourceSegment
      });
    }


    let segmentEmails = null;
    let segmentMap = new Map();

    if (sourceSegment) {

      const segmentPath = path.join(SEGMENT_DIR, sourceSegment);

      if (!fs.existsSync(segmentPath)) {
        return res.status(400).json({
          error: "segment_not_found"
        });
      }

      const lines = fs.readFileSync(segmentPath,"utf8")
        .split("\n")
        .filter(Boolean);

      const segmentRows = lines
        .map(line => line.split("|"))
        .filter(parts => parts[1] && parts[1].includes("@"))
        .map(parts => ({
          email: parts[1].trim().toLowerCase(),
          list_id: parts[2] || ""
        }));

      segmentRows.forEach(row => {
        segmentMap.set(row.email,row.list_id);
      });

      segmentEmails = segmentRows.map(r => r.email);

    }

    


    let runtimeIds = [];

    if (offerId) {

      const campaigns = await Campaign
        .find({ offerId })
        .select("runtimeOfferId")
        .lean();

      runtimeIds = campaigns
        .map(c => c.runtimeOfferId)
        .filter(Boolean);

    }

    if (offerId && (!runtimeIds || runtimeIds.length === 0)) {
      return res.json({
        segment: null,
        count: 0,
        path: null
      });
    }
    /* =============================
       QUERY
    ============================== */

    const query = {
      email: { $exists: true, $ne: null }
    };

    if (runtimeIds.length > 0) {
      query.offer_id = { $in: runtimeIds };
    }

    if (from && to) {

      if (type === "click") {
        query.day = {
          $gte: from,
          $lte: to
        };
      } else {
        query.day = {
          $gte: new Date(`${from}T00:00:00.000Z`),
          $lte: new Date(`${to}T23:59:59.999Z`)
        };
      }

    }

    if (segmentEmails && isp) {
      query.$and = [
        { email: { $in: segmentEmails } },
        { email: { $regex: `@${isp}\\.`, $options: "i" } }
      ];
    }
    else if (segmentEmails) {
      query.email = { $in: segmentEmails };
    }
    else if (isp) {
      query.email = { $regex: `@${isp}\\.`, $options: "i" };
    }

    if (sendingDomain) {
      query.send_domain = sendingDomain;
    }

    if (vmta) {
      query.vmta = vmta;
    }
    let emails = [];

    /* =============================
       FETCH EMAILS
    ============================== */

    if (type === "click") {

      const rows = await ClickLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $toLower: "$email" },
            list_id: { $first: "$list_id" },
            click_count: { $sum: 1 }
          }
        }
      ]).allowDiskUse(true);

      emails = rows.map(r => ({
        email: r._id,
        list_id: r.list_id || "",
        click_count: r.click_count
      }));
    }

    if (type === "open") {

      const rows = await OpenLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $toLower: "$email" },
            list_id: { $first: "$list_id" },
            open_count: { $sum: "$total_open_count" }
          }
        }
      ]).allowDiskUse(true);

      emails = rows.map(r => ({
        email: r._id,
        list_id: r.list_id || "",
        open_count: r.open_count
      }));
    }

    if (type === "both") {

    const clickRows = await ClickLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $toLower: "$email" },
          list_id: { $first: "$list_id" },
          click_count: { $sum: 1 }
        }
      }
    ]).allowDiskUse(true);

    const openRows = await OpenLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $toLower: "$email" },
          open_count: { $sum: "$total_open_count" }
        }
      }
    ]).allowDiskUse(true);

    const map = new Map();

    clickRows.forEach(r => {
      map.set(r._id,{
        email:r._id,
        list_id:r.list_id || "",
        click_count:r.click_count || 0,
        open_count:0
      });
    });

    openRows.forEach(r => {

      if(map.has(r._id)){
        map.get(r._id).open_count = r.open_count || 0;
      }else{
        map.set(r._id,{
          email:r._id,
          list_id:"",
          click_count:0,
          open_count:r.open_count || 0
        });
      }

    });

    emails = [...map.values()];
  }

    /* =============================
       CLEAN EMAILS
    ============================== */

    const emailMap = new Map();

    for (let row of emails) {

      if (!row.email) continue;

      const email = row.email.trim().toLowerCase();

      if (!EMAIL_REGEX.test(email)) continue;

      if (!emailMap.has(email)) {
        emailMap.set(email, row);
      }

    }

    const finalEmails = [...emailMap.values()];

    /* =============================
    COUNT FILTER
    ============================= */

    let filteredEmails = finalEmails.filter(row => {

      if (minOpenValue !== null && (row.open_count || 0) < minOpenValue) return false;
      if (maxOpenValue !== null && (row.open_count || 0) > maxOpenValue) return false;
      if (minClickValue !== null && (row.click_count || 0) < minClickValue) return false;
      if (maxClickValue !== null && (row.click_count || 0) > maxClickValue) return false;

      return true;

    });

    /* =============================
      SORT / SHUFFLE
    ============================= */

    if (sort === "asc") {
      filteredEmails.sort((a, b) => a.email.localeCompare(b.email));
    }

    if (sort === "desc") {
      filteredEmails.sort((a, b) => b.email.localeCompare(a.email));
    }
    if (shuffle) {
      shuffleArray(filteredEmails);
    }
    /* =============================
       SAVE FILE
    ============================== */

    if (!fs.existsSync(SEGMENT_DIR)) {
      fs.mkdirSync(SEGMENT_DIR, { recursive: true });
    }

    const filePath = path.join(SEGMENT_DIR, `${name}.txt`);

    const stream = fs.createWriteStream(filePath);

    for (const row of filteredEmails) {
      const email = row.email;
      const listid = row.list_id || segmentMap.get(email) || "";

      stream.write(`warm|${email}|${listid}|||||||||\n`);
    }

    stream.end();

    return res.json({
    segment: `${name}.txt`,
    count: filteredEmails.length,
    path: filePath
  });

  } catch (err) {

    console.error("SEGMENT BUILD ERROR:", err);

    return res.status(500).json({
      error: "segment_build_failed"
    });

  }
}