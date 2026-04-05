import { callPmtaApi } from "./pmtaHttpClient.js";

export async function fetchPmtaStats(server) {

  const res = await callPmtaApi(server, "/stats.php");

  if (!res.success) {
    console.error("PMTA STATS ERROR:", server.name, res.error);

    return {
      sent: 0,
      delivered: 0,
      bounced: 0,
      deferred: 0
    };
  }

  return {
    sent: res.data?.sent ?? 0,
    delivered: res.data?.delivered ?? 0,
    bounced: res.data?.bounced ?? 0,
    deferred: res.data?.deferred ?? 0
  };
}