import axios from "axios";

/**
 * PMTA HTTP CLIENT (FINAL - STABLE)
 */

export async function callPmtaApi(
  server,
  endpoint,
  method = "GET",
  data = {}
) {
  try {
    // ✅ validation
    if (!server?.pmta?.apiUrl) {
      throw new Error("PMTA apiUrl missing in server config");
    }

    // ✅ remove trailing slash (avoid // issue)
    const baseURL = server.pmta.apiUrl.replace(/\/$/, "");

    const config = {
      method,
      url: `${baseURL}${endpoint}`,
      timeout: 8000,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.SENDER_API_KEY
      },
      validateStatus: () => true
    };

    // ✅ GET vs POST handling (important)
    if (method === "GET") {
      config.params = data; // query params
    } else {
      config.data = data; // body
    }

    const response = await axios(config);

    // ✅ success normalize
    if (response.status >= 200 && response.status < 300) {
      return {
        success: true,
        data: response.data?.data ?? null,
        stdout: response.data?.stdout ?? null,
        error: null
      };
    }

    // ❌ API returned error
    return {
      success: false,
      data: null,
      error:
        response.data?.error ||
        `HTTP ${response.status} - ${response.statusText}`
    };

  } catch (err) {
    // ❌ network / timeout
    return {
      success: false,
      data: null,
      error: err.message || "PMTA API request failed"
    };
  }
}