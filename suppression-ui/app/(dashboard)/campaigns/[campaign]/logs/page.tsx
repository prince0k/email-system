"use client";

/**
 * STEP 4 – CAMPAIGN STATUS / LOGS
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { campaignApi } from "@/lib/campaignApi";

export default function CampaignLogsPage() {
  const params = useParams();
  const campaign = params?.campaign as string;

  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (!campaign) return;

    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const res = await campaignApi.liveStatus(undefined, campaign);

if (isMounted) {
  setStatus(res.status);
}
      } catch (err) {
        console.error("Status fetch failed:", err);
      }
    };

    // Initial load
    fetchStatus();

    // Poll every 3 seconds
    const interval = setInterval(fetchStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [campaign]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Campaign Status</h2>

      {!status && <p>Loading...</p>}

      {status && (
        <pre>{JSON.stringify(status, null, 2)}</pre>
      )}
    </div>
  );
}
