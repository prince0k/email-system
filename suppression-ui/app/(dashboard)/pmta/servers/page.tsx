"use client"

import { useEffect, useState } from "react"
import { getPmtaServers } from "@/lib/pmtaApi"
import ServerHealth from "@/components/pmta/ServerHealth"

type Server = {
  _id: string
  name: string
  code: string
  active: boolean
  pmta?: {
    host: string
  }
}

export default function ServerPage() {

  const [servers, setServers] = useState<Server[]>([])

  useEffect(() => {
    async function load() {
      const res = await getPmtaServers()
      setServers(res.servers || [])
    }
    load()
  }, [])

  return (

    <div className="p-6 space-y-4">

      <h1 className="text-xl font-semibold">Servers</h1>

      {servers.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No servers found
        </div>
      )}

      <div className="space-y-3">

        {servers.map((s) => (

          <div
            key={s._id}
            className="card-glass p-4 flex items-center justify-between"
          >

            <div>
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground">
                {s.pmta?.host || "No host"}
              </div>
            </div>

            <ServerHealth online={s.active} />

          </div>

        ))}

      </div>

    </div>

  )
}