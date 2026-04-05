"use client";

import { useEffect, useState } from "react";
import {
  getPmtaStats,
  getPmtaQueues,
  getPmtaDomains
} from "@/lib/pmtaApi";
import ServerCard from "@/components/pmta/ServerCard";
import MultiServerControlPanel from "@/components/pmta/MultiServerControlPanel";

type ServerStats = {
  server: {
    _id: string;
    name: string;
    code: string;
  };
  sent: number;
  delivered: number;
  bounced: number;
  deferred: number;
  queues?: any[];
  domains?: any[];
};

export default function PmtaDashboard() {
  const [servers, setServers] = useState<ServerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  async function load() {
    try {
      const [stats, queues, domains] = await Promise.all([
        getPmtaStats(),
        getPmtaQueues(),
        getPmtaDomains()
      ]);

      // ✅ DEBUG (ek baar run karke check kar lena)
      console.log("STATS:", stats);
      console.log("QUEUES:", queues);
      console.log("DOMAINS:", domains);

      // ✅ Create maps (FAST + SAFE)
      const queueMap = new Map();

(queues || []).forEach((q: any) => {
  const serverId = String(
    q?.server?._id || q?.serverId || q?.server_id || ""
  );

  if (!serverId) return;

  const existing = queueMap.get(serverId) || [];

  const newQueues = Array.isArray(q?.queues)
    ? q.queues
    : Array.isArray(q)
    ? q
    : [];

  queueMap.set(serverId, [...existing, ...newQueues]);
});

      const domainMap = new Map();

(domains || []).forEach((d: any) => {
  const serverId = String(
    d?.server?._id || d?.serverId || d?.server_id || ""
  );

  if (!serverId) return;

  const existing = domainMap.get(serverId) || [];

  const newDomains = Array.isArray(d?.domains)
    ? d.domains
    : Array.isArray(d)
    ? d
    : [];

  domainMap.set(serverId, [...existing, ...newDomains]);
});

      // ✅ Merge correctly
      const merged = (stats || []).map((s: any) => {
        const serverId = s.server?._id;

        return {
          ...s,
          queues: queueMap.get(serverId) || [],
          domains: domainMap.get(serverId) || []
        };
      });

      console.log("MERGED:", merged);

      setServers(merged);

    } catch (err) {
      console.error("PMTA load error", err);
    } finally {
      setLoading(false);
    }
  }

  load();
}, []);

  // 🔥 GLOBAL STATS
  const totalSent = servers.reduce((a, s) => a + (s.sent || 0), 0);
  const totalDelivered = servers.reduce((a, s) => a + (s.delivered || 0), 0);
  const totalBounced = servers.reduce((a, s) => a + (s.bounced || 0), 0);

  const deliveryRate =
    totalSent > 0
      ? Math.round((totalDelivered / totalSent) * 100)
      : 0;

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          PMTA Monitoring
        </h1>

        <span className="text-sm text-muted-foreground">
          {servers.length} servers
        </span>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      )}

      {/* KPI CARDS */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="card-glass p-4">
            <p className="text-xs text-muted-foreground">Total Sent</p>
            <p className="text-xl font-semibold">
              {totalSent.toLocaleString()}
            </p>
          </div>

          <div className="card-glass p-4">
            <p className="text-xs text-muted-foreground">Delivered</p>
            <p className="text-xl font-semibold text-primary">
              {totalDelivered.toLocaleString()}
            </p>
          </div>

          <div className="card-glass p-4">
            <p className="text-xs text-muted-foreground">Bounced</p>
            <p className="text-xl font-semibold text-destructive">
              {totalBounced.toLocaleString()}
            </p>
          </div>

          <div className="card-glass p-4">
            <p className="text-xs text-muted-foreground">Delivery Rate</p>
            <p className="text-xl font-semibold">
              {deliveryRate}%
            </p>
          </div>

        </div>
      )}

      {/* EMPTY */}
      {!loading && servers.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No servers found
        </div>
      )}

      {/* 🔥 CONTROL PANEL (ONLY ONCE) */}
      {!loading && servers.length > 0 && (
        <div className="card-glass p-4">
          <MultiServerControlPanel servers={servers.map(s => s.server)} />
        </div>
      )}

      {/* SERVER CARDS */}
      {!loading && servers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

          {servers.map((s, i) => (
            s.server && (
              <ServerCard
                key={s.server._id || i}
                server={s.server}
                sent={s.sent || 0}
                delivered={s.delivered || 0}
                bounced={s.bounced || 0}
                deferred={s.deferred || 0}
                queues={Array.isArray(s.queues) ? s.queues : []}
                domains={Array.isArray(s.domains) ? s.domains : []}
              />
            )
          ))}

        </div>
      )}

    </div>
  );
}