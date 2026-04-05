import SenderServer from "../models/SenderServer.js";
import PmtaStats from "../models/PmtaStats.js";
import PmtaQueues from "../models/PmtaQueues.js";
import PmtaDomains from "../models/PmtaDomains.js";

import { Client } from "ssh2";

// 🔐 CHANGE THIS to your current server IP
const SELF_IP = "204.12.237.107";

// 🔥 SINGLE SSH FETCH (NO LEAK)
function fetchAllPmta(server) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    let output = "";
    let isDone = false;

    const cleanup = () => {
      if (!isDone) {
        isDone = true;
        conn.end();
      }
    };

    // ⏱ timeout protection
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("SSH timeout"));
    }, 30000);

    conn.on("ready", () => {
      conn.exec(
        "pmta show stats; pmta show queues; pmta show domains",
        (err, stream) => {
          if (err) {
            clearTimeout(timeout);
            cleanup();
            return reject(err);
          }

          stream.on("data", (chunk) => {
            output += chunk.toString();
          });

          stream.on("close", () => {
            clearTimeout(timeout);
            cleanup();
            resolve(output);
          });
        }
      );
    });

    conn.on("error", (err) => {
      clearTimeout(timeout);
      cleanup();
      reject(err);
    });

    conn.connect({
      host: server.host,
      port: 22,
      username: server.username,
      password: server.password,
      readyTimeout: 30000
    });
  });
}

// 🔁 SAFE RETRY
async function safeFetch(server, retries = 2) {
  try {
    return await fetchAllPmta(server);
  } catch (err) {
    if (
      (err.level === "client-timeout" || err.code === "ECONNRESET") &&
      retries > 0
    ) {
      console.log("🔁 Retry:", server.name);
      await new Promise((r) => setTimeout(r, 5000));
      return safeFetch(server, retries - 1);
    }

    throw err;
  }
}

// 🧠 PARSE OUTPUT
function parsePmtaOutput(raw) {
  const sections = raw.split(/\r?\n/);

  let stats = {};
  let queues = [];
  let domains = [];

  for (const line of sections) {
    const parts = line.trim().split(/\s+/);

    // crude parsing (adjust if needed)
    if (parts.length === 4 && !isNaN(parts[1])) {
      domains.push({
        domain: parts[0],
        sent: parseInt(parts[1]) || 0,
        delivered: parseInt(parts[2]) || 0,
        bounced: parseInt(parts[3]) || 0
      });
    }

    if (parts.length === 2 && !isNaN(parts[1])) {
      queues.push({
        domain: parts[0],
        queued: parseInt(parts[1]) || 0
      });
    }

    if (line.includes("sent=")) {
      stats = {
        sent: parseInt(line.match(/sent=(\d+)/)?.[1]) || 0,
        delivered: parseInt(line.match(/delivered=(\d+)/)?.[1]) || 0,
        bounced: parseInt(line.match(/bounced=(\d+)/)?.[1]) || 0,
        deferred: parseInt(line.match(/deferred=(\d+)/)?.[1]) || 0
      };
    }
  }

  return { stats, queues, domains };
}

// 🔁 MAIN LOOP
async function monitorLoop() {
  try {
    const servers = await SenderServer.find({ active: true });

    for (const server of servers) {
      try {
        // 🚫 skip self server
        if (server.host === SELF_IP) {
          console.log("⏭ Skipping self:", server.name);
          continue;
        }

        const raw = await safeFetch(server);

        const { stats, queues, domains } = parsePmtaOutput(raw);

        await Promise.all([
          PmtaStats.updateOne(
            { server: server._id },
            { ...stats, updatedAt: new Date() },
            { upsert: true }
          ),

          PmtaQueues.updateOne(
            { server: server._id },
            { queues, updatedAt: new Date() },
            { upsert: true }
          ),

          PmtaDomains.updateOne(
            { server: server._id },
            { domains, updatedAt: new Date() },
            { upsert: true }
          )
        ]);

        console.log("✅ Synced:", server.name);

      } catch (err) {
        console.error("❌ Server error:", server.name, err.message);
      }

      // 🧘 delay between servers
      await new Promise((r) => setTimeout(r, 2000));
    }

  } catch (e) {
    console.error("🔥 Worker fatal:", e.message);
  }

  // 🔥 SAFE LOOP
  setTimeout(monitorLoop, 30000);
}

// 🚀 START
export function startPmtaMonitor() {
  monitorLoop();
}