"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";

import StatsGraph from "@/components/pmta/StatsGraph";
import QueueTable from "@/components/pmta/QueueTable";
import DomainTable from "@/components/pmta/DomainTable";
import PmtaControlPanel from "@/components/pmta/PmtaControlPanel";
import ServerHealth from "@/components/pmta/ServerHealth";

type ServerData = {
  server: {
    _id: string;
    name: string;
    code: string;
  };
  sent: number;
  delivered: number;
  bounced: number;
  deferred: number;
  queues: {
    domain: string;
    queued: number;
  }[];
  domains: {
    domain: string;
    sent: number;
    delivered?: number;
    bounced?: number;
  }[];
};

function ensureArray<T>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}
export default function ServerDetailPage() {
  const { id } = useParams();

  const [data, setData] = useState<ServerData | null>(null);
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/pmta/server/${id}`);
        setData(res.data);
      } catch (err) {
        console.error("API Error:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!data) return <div className="p-6">No data</div>;

  return (
    <div className="p-6 space-y-6">

      {/* 🔥 HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">
            {data.server?.name || "Unknown"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.server?.code}
          </p>
        </div>

        {/* You can replace with real status later */}
        <ServerHealth online={true} />
      </div>

      {/* 🔥 STATS */}
      <StatsGraph
        sent={data.sent}
        delivered={data.delivered}
        bounced={data.bounced}
      />

      {/* 🔥 QUEUES + DOMAINS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div>
          <h2 className="text-lg font-semibold mb-2">Queues</h2>
          <QueueTable queues={data.queues || []} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Domains</h2>
          <DomainTable
            domains={ensureArray(data.domains)
              .filter((d: any) => d && typeof d === "object")
              .map((d: any) => ({
                domain: d?.domain ?? "-",
                sent: Number(d?.sent ?? 0),
                delivered: Number(d?.delivered ?? 0),
                bounced: Number(d?.bounced ?? 0)
              }))
            }
          />
        </div>

      </div>

      {/* 🔥 CONTROL PANEL */}
      <div>
        <h2 className="text-lg font-semibold mb-2">
          PMTA Control Panel
        </h2>

        <PmtaControlPanel server={data.server} />
      </div>

    </div>
  );
}