import { callPmtaApi } from "./pmtaHttpClient.js";

export async function fetchDomains(server) {

  try {
    const res = await callPmtaApi(server, "/domains.php");

    if (!res.success) {
      console.log("fetchDomains error:", server.name, res.error);
      return [];
    }

    return res.data ?? [];

  } catch (err) {
    console.log("fetchDomains error:", server.name, err.message);
    return [];
  }
}