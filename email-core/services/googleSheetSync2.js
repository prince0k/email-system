import { google } from "googleapis";
import OpenLog from "../models/OpenLog.js";
import ClickLog from "../models/ClickLog.js";
import Campaign from "../models/Campaign.js";

const auth = new google.auth.GoogleAuth({
  keyFile: "config/google-service.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = "1v_QtGn8DKnYGoQVrGFDCFZ5JHZOpOppi40E9uZhJ1EI";

// 🔥 SHEET NAME
const SHEETS = ["IP Wise_Count"];

export async function syncGoogleSheet() {
  for (const SHEET_NAME of SHEETS) {
    await syncIPSheet(SHEET_NAME);
  }
}

async function syncIPSheet(SHEET_NAME) {
  const START_ROW = 2;
  const END_ROW = 500;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A${START_ROW}:Z${END_ROW}`,
  });

  const rows = res.data.values || [];
  if (!rows.length) return;

  const IP_COL = 2;     // column C
  const OFFER_COL = 3;  // column D (IMPORTANT)

  // 🔥 collect all IP + Offer pairs
  const pairs = rows
    .map(r => ({
      ip: r[IP_COL],
      offerId: r[OFFER_COL]
    }))
    .filter(r => r.ip && r.offerId);

  if (!pairs.length) return;

  const ips = [...new Set(pairs.map(p => p.ip))];
  const offerIds = [...new Set(pairs.map(p => p.offerId))];

  /* =========================
     🔥 FETCH CAMPAIGNS
  ========================= */

  const campaigns = await Campaign.find({
    runtimeOfferId: { $in: offerIds }
  }).select("runtimeOfferId execution.vmtaStats").lean();

  // 🔥 MAP: offerId + ip → delivered
  const vmtaMap = {};

  campaigns.forEach(c => {
    const offerId = c.runtimeOfferId;
    const vmtaStats = c.execution?.vmtaStats || {};

    Object.entries(vmtaStats).forEach(([ip, count]) => {
      const key = `${offerId}_${ip}`;
      vmtaMap[key] = count;
    });
  });

  /* =========================
     🔥 OPEN / CLICK AGG
  ========================= */

  const [openAgg, clickAgg] = await Promise.all([

    OpenLog.aggregate([
      { $match: { ip: { $in: ips }, offer_id: { $in: offerIds } } },
      {
        $group: {
          _id: { ip: "$ip", offer_id: "$offer_id" },
          total: { $sum: 1 },
          emails: { $addToSet: "$email" }
        }
      },
      {
        $project: {
          total: 1,
          unique: { $size: "$emails" }
        }
      }
    ]),

    ClickLog.aggregate([
      { $match: { ip: { $in: ips }, offer_id: { $in: offerIds }, is_bot_click: false } },
      {
        $group: {
          _id: { ip: "$ip", offer_id: "$offer_id" },
          total: { $sum: 1 },
          emails: { $addToSet: "$email" }
        }
      },
      {
        $project: {
          total: 1,
          unique: { $size: "$emails" }
        }
      }
    ])
  ]);

  // 🔥 MAPS
  const openMap = {};
  openAgg.forEach(i => {
    const key = `${i._id.offer_id}_${i._id.ip}`;
    openMap[key] = i;
  });

  const clickMap = {};
  clickAgg.forEach(i => {
    const key = `${i._id.offer_id}_${i._id.ip}`;
    clickMap[key] = i;
  });

  /* =========================
     🔥 UPDATE SHEET
  ========================= */

  const updates = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const actualRow = START_ROW + i;

    const ip = row[IP_COL];
    const offerId = row[OFFER_COL];

    if (!ip || !offerId) continue;

    const key = `${offerId}_${ip}`;

    const delivered = vmtaMap[key] || 0;

    const open = openMap[key]?.total || 0;
    const uniqueOpen = openMap[key]?.unique || 0;

    const click = clickMap[key]?.total || 0;
    const uniqueClick = clickMap[key]?.unique || 0;

    const ctr = uniqueOpen ? (uniqueClick / uniqueOpen) * 100 : 0;

    updates.push({
      range: `${SHEET_NAME}!E${actualRow}:K${actualRow}`,
      values: [[
        delivered,
        open,
        uniqueOpen,
        click,
        uniqueClick,
        ctr.toFixed(2)
      ]]
    });
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: "RAW",
        data: updates,
      },
    });

    console.log(`🔥 ${SHEET_NAME} Updated (${updates.length} rows)`);
  } else {
    console.log(`⚠️ No updates`);
  }
}