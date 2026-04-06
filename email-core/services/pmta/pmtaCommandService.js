import { callPmtaApi } from "./pmtaHttpClient.js";

export async function runPmtaCommand(server, command, raw = false) {

  const res = await callPmtaApi(server, "/command.php", "POST", {
    command,
    raw
  });

  return {
    success: res.success,
    stdout: res.stdout ?? "",
    stderr: res.error ?? ""
  };
}