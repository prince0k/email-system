"use client";
import { useState } from "react";
import api from "@/lib/api";


type ClickLink = {
  rl: number;
  total_clicks: number;
  unique_clicks: number;
};

type ClickOffer = {
  offer_id: string;
  total_clicks: number;
  unique_clicks: number;
  links?: ClickLink[];
};

type ClickResponse = {
  offers: ClickOffer[];
};
export default function ClickLogs() {
  const [start, setStart] = useState("");
const [end, setEnd] = useState("");
  const [data, setData] = useState<ClickResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const offers = data?.offers ?? [];
const fetchData = async () => {
  if (!start || !end) {
    setError("Select start and end date");
    return;
  }

  setLoading(true);
  setError("");
  setData(null);

  try {
    const res = await api.get("/reports/clicks", {
      params: { start, end },
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
          Click Logs
        </h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Monitor click engagement, analyze link-level performance, and track conversion depth.
        </p>
      </div>

      <div className="relative bg-gradient-to-b bg-card border border-border rounded-2xl p-6 shadow-2xl shadow-black/40 w-full xl:w-auto">
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-end gap-6">

          <div className="flex items-end gap-4">
            <div className="flex flex-col">
              <label className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                From
              </label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="bg-background border border-border text-foreground px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                To
              </label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="bg-background border border-border text-foreground px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading || !start || !end}
            className="h-[44px] px-7 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all text-foreground font-medium shadow-lg shadow-indigo-900/40 disabled:opacity-40"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        <StatCard
          label="Total Clicks"
          value={offers.reduce(
  (a: number, b: ClickOffer) => a + (b.total_clicks || 0),
  0
)}
          color="text-foreground"
        />

        <StatCard
          label="Unique Clicks"
          value={offers.reduce(
  (a: number, b: ClickOffer) => a + (b.total_clicks || 0),
  0
)}
          color="text-primary"
        />

        <StatCard
          label="Avg Clicks per Offer"
          value={
  offers.length > 0
    ? (
        offers.reduce(
  (a: number, b: ClickOffer) => a + (b.total_clicks || 0),
  0
) /
        offers.length
      ).toFixed(1)
    : "0"
}
          color="text-yellow-500"
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
                <th className="px-6 py-4 text-left">Total</th>
                <th className="px-6 py-4 text-left">Unique</th>
                <th className="px-6 py-4 text-left">Link Breakdown</th>
              </tr>
            </thead>

            <tbody>
              {offers.map((o) => {
  const links = o.links ?? [];

  return (
    <tr
      key={o.offer_id}
      className="border-t border-border hover:bg-muted/40 transition align-top"
    >
                  <td className="px-6 py-4 font-mono text-foreground">
                    {o.offer_id}
                  </td>

                  <td className="px-6 py-4 text-foreground">
                    {o.total_clicks?.toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-indigo-400">
                    {o.unique_clicks?.toLocaleString()}
                  </td>

                  <td className="px-6 py-4">
                    {links.length > 0 ? (
  <div className="space-y-2">
    {links.map((l) => (
                          <div
                            key={l.rl}
                            className="flex justify-between bg-background/40 border border-border px-3 py-2 rounded-lg"
                          >
                            <span className="text-muted-foreground">
                              Link #{l.rl}
                            </span>

                            <span className="text-gray-300">
                              {l.total_clicks} / {l.unique_clicks}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">
                        No link clicks
                      </span>
                    )}
                  </td>

                </tr>
  );
})}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* EMPTY */}
    {data && offers.length === 0 && (
      <div className="bg-gray-900 border border-border rounded-xl p-6 text-center text-muted-foreground">
        No click data found for this date range.
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
    <div className="bg-gradient-to-b bg-card border border-border rounded-2xl p-6 shadow-lg">
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