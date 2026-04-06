"use client"

import { useEffect, useState } from "react"
import { getPmtaQueues } from "@/lib/pmtaApi"
import QueueTable from "@/components/pmta/QueueTable"

export default function QueuePage() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const res = await getPmtaQueues()
      setData(res || [])
    }
    load()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-xl mb-4">PMTA Queues</h1>

      {/* ✅ Direct pass */}
      <QueueTable queues={data} />

    </div>
  )
}