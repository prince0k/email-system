"use client"

import { useEffect, useState } from "react"
import { getPmtaStats } from "@/lib/pmtaApi"
import StatsGraph from "@/components/pmta/StatsGraph"

type ServerStats = {
  server: {
    _id: string
    name: string
    code: string
  }
  sent: number
  delivered: number
  bounced: number
  deferred: number
}

export default function StatsPage() {

  const [data, setData] = useState<ServerStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    async function load() {
      try {
        const res = await getPmtaStats()
        setData(res || [])
      } catch (err) {
        console.error("Stats load error", err)
      } finally {
        setLoading(false)
      }
    }

    load()

  }, [])

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">
        Loading stats...
      </div>
    )
  }

  return (

    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-semibold">
        PMTA Traffic Stats
      </h1>

      {data.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No stats available
        </div>
      )}

      {data.map((server) => (

        <div
          key={server.server._id}
          className="card-glass p-6 space-y-4"
        >

          {/* Header */}
          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-lg font-medium">
                {server.server.name}
              </h2>
              <div className="text-xs text-muted-foreground">
                {server.server.code}
              </div>
            </div>

            {/* Quick stat badge */}
            <div className="text-sm font-medium text-muted-foreground">
              Deferred: {server.deferred || 0}
            </div>

          </div>

          {/* Graph */}
          <StatsGraph
            sent={server.sent || 0}
            delivered={server.delivered || 0}
            bounced={server.bounced || 0}
          />

        </div>

      ))}

    </div>

  )

}