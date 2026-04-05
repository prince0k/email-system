import SenderServer from "../../models/SenderServer.js";
import { callPmtaApi } from "./pmtaHttpClient.js";

export async function runCommandOnServers({ command, serverIds, raw = false }) {

  // 🔥 1. Fetch servers
  let servers;

  if (Array.isArray(serverIds) && serverIds.length > 0) {
    servers = await SenderServer.find({
      _id: { $in: serverIds },
      active: true
    });
  } else {
    servers = await SenderServer.find({ active: true });
  }

  // 🔥 2. Execute command via HTTP
  const results = await Promise.all(
    servers.map(async (server) => {
      try {
        const res = await callPmtaApi(server, "/command.php", "POST", {
          command,
          raw
        });

        return {
          server: server.name,
          success: res.success,
          stdout: res.stdout ?? "",
          stderr: res.error ?? ""
        };

      } catch (err) {
        return {
          server: server.name,
          success: false,
          stdout: "",
          stderr: err.message || "Unknown error"
        };
      }
    })
  );

  return results;
}