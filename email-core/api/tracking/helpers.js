export const TRACKING_TOKEN_REGEX = /^[a-f0-9]{64}$/i;

export function isValidTrackingToken(token) {
  return TRACKING_TOKEN_REGEX.test(String(token || "").trim());
}

export function getClientMeta(req) {
  const forwarded = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();

  return {
    ip: req.headers["cf-connecting-ip"] || forwarded || req.socket?.remoteAddress || null,
    userAgent: req.headers["user-agent"] || "",
    country: req.headers["cf-ipcountry"] || null,
  };
}

export function getPacificDayString(date = new Date()) {
  return date.toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });
}