"use client"

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from "recharts"
import { useRouter } from "next/navigation";
type Queue = {
  domain: string
  queued: number
}

type Domain = {
  domain: string
  sent: number
}

type Props = {
  server: {
    _id: string
    name: string
    code: string
  }
  sent?: number
  delivered?: number
  bounced?: number
  deferred?: number
  queues?: Queue[]
  domains?: Domain[]
}

function format(n: number) {
  return n.toLocaleString()
}

export default function ServerCard({
  server,
  sent = 0,
  delivered = 0,
  bounced = 0,
  deferred = 0,
  queues = [],
  domains = []
}: Props) {

  const deliveryRate =
    sent > 0 ? Math.round((delivered / sent) * 100) : 0

  const pieData = [
    { name: "Delivered", value: delivered },
    { name: "Bounced", value: bounced },
    { name: "Deferred", value: deferred }
  ]

  const COLORS = ["#3b82f6", "#ef4444", "#f59e0b"]
  const router = useRouter();
 const normalizedQueues = (queues || [])
  .flatMap((q: any) => {
    // case 1: direct array
    if (q?.domain || q?.queued) return [q]

    // case 2: nested queues array (VERY COMMON BUG)
    if (Array.isArray(q?.queues)) return q.queues

    return []
  })
  .map((q: any) => ({
    domain: q?.domain ?? q?.name ?? "-",
    queued: Number(q?.queued ?? q?.queue ?? q?.rcpt ?? 0)
  }))

const topQueues = normalizedQueues
  .sort((a, b) => b.queued - a.queued)
  .slice(0, 2)


// ✅ Normalize domains (MATCH DomainTable)
const normalizedDomains = (domains || [])
  .flatMap((d: any) => {
    if (d?.domain || d?.sent) return [d]

    if (Array.isArray(d?.domains)) return d.domains

    return []
  })
  .map((d: any) => ({
    domain: d?.domain ?? d?.name ?? "-",
    sent: Number(d?.sent ?? d?.count ?? 0),
    delivered: Number(d?.delivered ?? 0),
    bounced: Number(d?.bounced ?? 0)
  }))

const topDomains = normalizedDomains
  .sort((a, b) => b.sent - a.sent)
  .slice(0, 2)

  return (
    <div
  onClick={() => router.push(`/pmta/server/${server._id}`)}
  className="card-glass p-5 space-y-5 cursor-pointer hover:scale-[1.02] transition"
>

      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{server.name}</h3>
          <p className="text-xs text-muted-foreground">{server.code}</p>
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold">{format(sent)}</p>
          <p className="text-xs text-muted-foreground">Total Sent</p>
        </div>
      </div>

      {/* MAIN SECTION */}
      <div className="flex items-center justify-between">

        {/* PIE */}
        <div className="relative h-[120px] w-[120px]">

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                innerRadius={35}
                outerRadius={50}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* CENTER TEXT */}
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-sm font-semibold">
              {deliveryRate}%
            </span>
            <span className="text-[10px] text-muted-foreground">
              Delivered
            </span>
          </div>

        </div>

        {/* STATS */}
        <div className="space-y-1 text-sm">

          <div className="flex gap-2 items-center">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Delivered: {format(delivered)}
          </div>

          <div className="flex gap-2 items-center">
            <span className="h-2 w-2 rounded-full bg-destructive" />
            Bounced: {format(bounced)}
          </div>

          <div className="flex gap-2 items-center">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            Deferred: {format(deferred)}
          </div>

        </div>

      </div>

      {/* QUEUES + DOMAINS */}
      <div className="grid grid-cols-2 gap-4 text-xs">

        {/* QUEUES */}
        <div>
          <p className="text-muted-foreground mb-1">Queues</p>

          {topQueues.length === 0 ? (
            <p className="text-muted-foreground">—</p>
          ) : (
            topQueues.map((q, i) => (
              <div key={i} className="flex justify-between">
                <span className="truncate">{q.domain}</span>
                <span>{format(q.queued)}</span>
              </div>
            ))
          )}
        </div>

        {/* DOMAINS */}
        <div>
          <p className="text-muted-foreground mb-1">Domains</p>

          {topDomains.length === 0 ? (
            <p className="text-muted-foreground">—</p>
          ) : (
            topDomains.map((d, i) => (
              <div key={i} className="flex justify-between">
                <span className="truncate">{d.domain}</span>
                <div className="text-right">
                  <div>{format(d.sent)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    D: {format(d.delivered)} | B: {format(d.bounced)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  )
}