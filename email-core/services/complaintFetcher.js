import Imap from "imap";
import dotenv from "dotenv";
dotenv.config({ path: "/var/www/email-core/.env" });

import { simpleParser } from "mailparser";
import fs from "fs";
import "../config/mongo.js";
import LinkToken from "../models/LinkToken.js";

/* ======================
   CONFIG CHECK
====================== */
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error("❌ EMAIL_USER or EMAIL_PASS missing in .env");
  process.exit(1);
}

/* ======================
   IMAP CONFIG (FIXED)
====================== */
const imapConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  tlsOptions: {
    rejectUnauthorized: false, // 🔥 FIX self-signed error
  },
};

/* ======================
   FILE PATH
====================== */
const FILE_PATH = "/var/www/email-core-data/complaint/complaint.txt";

/* ======================
   LOAD EXISTING (FAST)
====================== */
let existingEmails = new Set();

if (fs.existsSync(FILE_PATH)) {
  existingEmails = new Set(
    fs.readFileSync(FILE_PATH, "utf-8").split("\n").filter(Boolean)
  );
}

/* ======================
   TOKEN EXTRACT (STRONG)
====================== */
const extractTokenFromUrl = (text) => {
  if (!text) return null;

  const match = text.match(/(?:2|4)\.php\?k=([a-f0-9]{32,})/i);
  return match ? match[1] : null;
};

/* ======================
   SAVE EMAIL (NO DUPES)
====================== */
const appendUniqueEmail = (email) => {
  if (!existingEmails.has(email)) {
    fs.appendFileSync(FILE_PATH, email + "\n");
    existingEmails.add(email);
    console.log("✅ Saved:", email);
  }
};

/* ======================
   MAIN FUNCTION
====================== */
export const fetchComplaintEmails = () => {
  return new Promise((resolve, reject) => {
    const imap = new Imap(imapConfig);

    imap.once("ready", () => {
      console.log("✅ IMAP Connected");

      imap.openBox("INBOX", false, (err) => {
        if (err) return reject(err);

        imap.search(["UNSEEN"], (err, results) => {
          if (err) return reject(err);

          if (!results || results.length === 0) {
            console.log("📭 No unread emails");
            imap.end();
            return resolve();
          }

          console.log(`📨 Found ${results.length} unread emails`);
          const tasks = [];
          const fetch = imap.fetch(results, {
            bodies: "",
            markSeen: true,
          });

          fetch.on("message", (msg) => {
  msg.on("body", (stream) => {

    const task = new Promise((resolveTask) => {

      simpleParser(stream, async (err, parsed) => {
        if (err || !parsed) return resolveTask();

        try {
          let content = "";

          // main body
          if (parsed.text) content += parsed.text;
          if (parsed.html) content += parsed.html;

          // 🔥 attachments (important for FBL)
          if (parsed.attachments && parsed.attachments.length) {
            for (const att of parsed.attachments) {
              if (att.contentType === "message/rfc822") {
                content += att.content.toString();
              }
            }
          }

          // headers fallback
          const raw =
            parsed?.headerLines?.map((h) => h.line).join("\n") || "";

          const fullContent = content + "\n" + raw;

          const token = extractTokenFromUrl(fullContent);

          if (!token) {
            console.log("⚠️ Token not found");
            return resolveTask();
          }

          console.log("🔑 Token:", token);

          const doc = await LinkToken.findOne({ token }).lean();

          if (!doc?.email) {
            console.log("❌ No email for token:", token);
            return resolveTask();
          }

          const email = doc.email;

          console.log("📧 Complaint:", email);

          appendUniqueEmail(email);

          // ✅ only update if not already complaint
          if (!doc.complaint) {
            await LinkToken.updateOne(
              { token },
              {
                $set: {
                  complaint: true,
                  complaintAt: new Date(),
                },
              }
            );

            console.log("🔥 Complaint marked:", token);
          }

        } catch (e) {
          console.error("Processing error:", e);
        }

        resolveTask();
      });
    });

    tasks.push(task);
  });
});
          fetch.once("end", async () => {
  await Promise.all(tasks); // 🔥 WAIT for all parsing

  console.log("✅ Done processing emails");
  imap.end();
  resolve();
});
        });
      });
    });

    imap.once("error", (err) => {
      console.error("❌ IMAP error:", err);
      reject(err);
    });

    imap.once("end", () => {
      console.log("📴 IMAP connection closed");
    });

    imap.connect();
  });
};