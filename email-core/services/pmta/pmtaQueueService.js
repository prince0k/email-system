import { callPmtaApi } from "./pmtaHttpClient.js";

export async function fetchQueues(server) {

  try {
    const res = await callPmtaApi(server, "/queues.php");

    if (!res.success) {
      console.log("fetchQueues error:", server.name, res.error);
      return null;
    }

    return res.data ?? [];

  } catch (err) {
    console.log("fetchQueues error:", server.name, err.message);
    return null; // ❌ NEVER THROW
  }
}