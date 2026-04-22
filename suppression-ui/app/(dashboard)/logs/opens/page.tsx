"use client";
import { useState } from "react";

import api from "@/lib/api";
type OpenOffer = {
  offer_id: string;
  unique_opens: number;
  total_opens: number;
  human_opens: number;
  bot_opens: number;
  bot_rate: number;
};

type OpenResponse = {
  offers: OpenOffer[];
};
export default function OpenLogs() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<OpenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const offers = data?.offers ?? [];
const fetchData = async () => {
  if (!from || !to) {
    setError("Select both From and To dates");
    return;
  }

  if (from > to) {
    setError("From date cannot be greater than To date");
    return;
  }

  setLoading(true);
  setError("");
  setData(null);

  try {
    const res = await api.get("/reports/openReport", {
      params: { from, to },
    });

    setData(res.data);
  } catch (e: any) {
    setError(
      e?.response?.data?.error || "Failed to load"
    );
  } finally {
    setLoading(false);
  }
};

return (
  <div className="w-full space-y-10">

    {/* HEADER */}
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">
          Open Logs
        </h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Analyze human vs bot open activity across custom date ranges and monitor engagement health.
        </p>
      </div>

      <div className="relative bg-card border border-border rounded-2xl p-6 shadow-2xl shadow-black/40 w-full xl:w-auto">
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-end gap-6">
          <div className="flex items-end gap-4">
            <div className="flex flex-col">
              <label className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-background border border-border text-foreground px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-background border border-border text-foreground px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading || !from || !to}
            className="h-[44px] px-7 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all text-foreground font-medium shadow-lg shadow-blue-900/40 disabled:opacity-40"
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </div>
      </div>
    </div>

    {/* ERROR */}
    {error && (
      <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-xl text-sm">
        {error}
      </div>
    )}

    {/* SUMMARY CARDS */}
    {offers.length > 0 && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        <StatCard
          label="Unique Opens"
          value={offers.reduce((a: number, b: OpenOffer) => a + (b.unique_opens || 0), 0)}
          color="text-foreground"
        />

        <StatCard
          label="Human Opens"
          value={offers.reduce((a: number, b: OpenOffer) => a + (b.human_opens || 0), 0)}
          color="text-green-400"
        />

        <StatCard
          label="Bot Opens"
          value={offers.reduce((a: number, b: OpenOffer) => a + (b.bot_opens || 0), 0)}
          color="text-destructive"
        />

        <StatCard
          label="Average Bot %"
          value={
  offers.length > 0
    ? `${(
        offers.reduce(
          (a: number, b: OpenOffer) => a + (b.bot_rate || 0),
          0
        ) / offers.length
      ).toFixed(2)}%`
    : "0%"
}
          color="text-yellow-400"
        />

      </div>
    )}

    {/* TABLE */}
    {offers.length > 0 && (
      <div className="bg-gray-900 border border-border rounded-2xl overflow-hidden shadow-xl">

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background text-muted-foreground uppercase text-xs tracking-wide">
              <tr>
                <th className="px-6 py-4 text-left">Offer</th>
                <th className="px-6 py-4 text-left">Unique</th>
                <th className="px-6 py-4 text-left">Total</th>
                <th className="px-6 py-4 text-left">Human</th>
                <th className="px-6 py-4 text-left">Bots</th>
                <th className="px-6 py-4 text-left">Bot %</th>
              </tr>
            </thead>

            <tbody>
              {offers.map((o: OpenOffer) => (
                <tr
                  key={o.offer_id}
                  className="border-t border-border hover:bg-muted/40 transition"
                >
                  <td className="px-6 py-4 font-mono text-foreground">
                    {o.offer_id}
                  </td>

                  <td className="px-6 py-4 text-foreground">
                    {o.unique_opens?.toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-foreground">
                    {o.total_opens?.toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-green-400">
                    {o.human_opens?.toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-destructive">
                    {o.bot_opens?.toLocaleString()}
                  </td>

                  <td
                    className={`px-6 py-4 font-medium ${
                      o.bot_rate > 30
                        ? "text-red-500"
                        : o.bot_rate > 15
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                  >
                    {o.bot_rate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* EMPTY STATE */}
    {data && offers.length === 0 && (
      <div className="bg-gray-900 border border-border rounded-xl p-6 text-center text-muted-foreground">
        No open data found for this date range.
      </div>
    )}
  </div>
);

type StatCardProps = {
  label: string;
  value: number | string;
  color: string;
};

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className={`text-3xl font-semibold mt-3 ${color}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}
}