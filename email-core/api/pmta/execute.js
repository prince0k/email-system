import { runCommandOnServers } from "../../services/pmta/pmtaBulkService.js";

const SAFE_COMMANDS = {
  queues: {
    cmd: "show queues",
    label: "Show Queues"
  },
  domains: {
    cmd: "show domains",
    label: "Show Domains"
  },
  status: {
    cmd: "show status",
    label: "Server Status"
  },
  topdomains: {
    cmd: "show topdomains",
    label: "Top Domains"
  },
  topqueues: {
    cmd: "show topqueues",
    label: "Top Queues"
  },
  vmtas: {
    cmd: "show vmtas",
    label: "VMTA List"
  },
  jobs: {
    cmd: "show jobs",
    label: "Jobs"
  },
  license: {
    cmd: "show license",
    label: "License"
  },
  version: {
    cmd: "show version",
    label: "Version"
  },
  precache: {
    cmd: "show precache",
    label: "Precache"
  }
};

export default async function handler(req, res) {
    try {
    const { action, serverIds, domain, vmta, ip, jobId, mode } = req.body;

    // 🔥 1. ACTION CHECK (sabse pehle)
    if (!action) {
        return res.status(400).json({ error: "Action required" });
    }

    // 🔥 2. CLEAN INPUT
    const cleanDomain = domain?.trim();
    const cleanIp = ip?.trim();

    // 🔥 3. SERVER CHECK
    if (!Array.isArray(serverIds) || serverIds.length === 0) {
        return res.status(400).json({
        error: "Select at least one server"
        });
    }

    // 🔥 4. REQUIRED PARAMS CHECK

    const requiresDomain = [
        "pause",
        "resume",
        "schedule",
        "queueMode",
        "showQueue",
        "showSettings",
        "deleteQueue",
        "resolve"
    ];

    if (requiresDomain.includes(action) && !cleanDomain) {
        return res.status(400).json({
        error: "Domain is required for this action"
        });
    }

    const requiresIP = [
        "disableSource",
        "enableSource",
        "spf"
    ];

    if (requiresIP.includes(action) && !cleanIp) {
        return res.status(400).json({
        error: "IP is required for this action"
        });
    }

    const requiresJob = ["pauseJob", "resumeJob"];

    if (requiresJob.includes(action) && !jobId) {
        return res.status(400).json({
        error: "jobId is required"
        });
    }

    if (action === "queueMode" && !mode) {
        return res.status(400).json({
        error: "Mode is required (normal/backoff)"
        });
    }

    // 🔥 5. VALIDATION

    if (cleanDomain && !/^[a-zA-Z0-9.-]+$/.test(cleanDomain)) {
        return res.status(400).json({ error: "Invalid domain" });
    }

    if (cleanIp && !/^(\d{1,3}\.){3}\d{1,3}$/.test(cleanIp)) {
        return res.status(400).json({ error: "Invalid IP" });
    }

    if (mode && !["normal", "backoff"].includes(mode)) {
        return res.status(400).json({ error: "Invalid mode" });
    }

    let command = null;

// 👉 CLEAN VALUES (use these)
const d = cleanDomain;
const i = cleanIp;

// ✅ SAFE COMMANDS
if (Object.prototype.hasOwnProperty.call(SAFE_COMMANDS, action)) {
  command = SAFE_COMMANDS[action].cmd;
}

else if (action === "reload") {
  command = "reload";
}

else if (action === "resetStatus") {
  command = "reset status";
}

else if (action === "rotateLogs") {
  command = "rotate log";
}

// ⚠️ QUEUE CONTROL
else if (action === "queueMode") {
  command = `set queue --mode=${mode} ${d}`;
}

else if (action === "pause") {
  command = `pause queue ${d}`;
}

else if (action === "resume") {
  command = `resume queue ${d}`;
}

else if (action === "schedule") {
  command = `schedule ${d}`;
}

// ⚠️ SOURCE CONTROL
else if (action === "disableSource") {
  command = `disable source ${i} ${d}`;
}

else if (action === "enableSource") {
  command = `enable source ${i} ${d}`;
}

// ⚠️ JOB CONTROL
else if (action === "pauseJob") {
  command = `pause job ${jobId}`;
}

else if (action === "resumeJob") {
  command = `resume job ${jobId}`;
}

// ⚠️ DNS / SPF
else if (action === "resolve") {
  command = `resolve ${d}`;
}

else if (action === "spf") {
  command = `check spf ${i} ${d}`;
}


// ⚠️ DELETE QUEUE (dangerous)
else if (action === "deleteQueue") {
  if (req.body.confirm !== "YES_DELETE") {
    return res.status(400).json({
      error: "Confirmation required: YES_DELETE"
    });
  }
  command = `delete --queue=${d}`;
}

// ⚠️ DELETE ALL QUEUES (VERY DANGEROUS)
else if (action === "deleteAllQueues") {
  if (req.body.confirm !== "YES_DELETE_ALL" || !req.body.force) {
    return res.status(400).json({
      error: "Double confirmation required"
    });
  }
  command = "delete --queue=*/*";
}

// ⚠️ RESTART (very dangerous)
else if (action === "restart") {
  if (req.body.confirm !== "YES_RESTART") {
    return res.status(400).json({
      error: "Confirmation required: YES_RESTART"
    });
  }
  command = "systemctl restart pmta || service pmta restart";
}

else if (action === "resetCounters") {
  if (req.body.confirm !== "YES_RESET") {
    return res.status(400).json({
      error: "Confirmation required: YES_RESET"
    });
  }
  command = "reset counters";
}
// ❌ INVALID
else {
  return res.status(400).json({
    error: "Invalid action or missing params"
  });
}

if (!command) {
  return res.status(400).json({
    error: "Command could not be resolved"
  });
}

    // 🚀 EXECUTE
const results = await runCommandOnServers({
  command,
  serverIds,
  raw: ["restart"].includes(action)
});

// 🧠 CLEAN RESULT (frontend friendly)
const formattedResults = results.map(r => ({
  server: r.server,
  success: r.stderr ? false : true,
  output: r.stdout || r.stderr || ""
}));

// 📊 LOG (better debugging)
console.log("PMTA ACTION:", {
  action,
  command,
  domain: cleanDomain,
  ip: cleanIp,
  servers: serverIds,
  user: req.user?._id,
  successCount: formattedResults.filter(r => r.success).length,
  failCount: formattedResults.filter(r => !r.success).length,
  time: new Date()
});

// 📤 RESPONSE
const successCount = formattedResults.filter(r => r.success).length;
const failCount = formattedResults.length - successCount;

const actionLabel = SAFE_COMMANDS[action]?.label || action;

return res.json({
  success: true,
  action,
  actionLabel, // 👈 UI ke liye useful
  command,
  totalServers: serverIds.length,
  successCount,
  failCount,
  results: formattedResults
});

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}