"use client"

import { useEffect, useState } from "react"
import { getPmtaDomains } from "@/lib/pmtaApi"
import DomainTable from "@/components/pmta/DomainTable"

export default function DomainPage() {

  const [data, setData] = useState<any[]>([])

  useEffect(() => {

    async function load() {

      const res = await getPmtaDomains()

      setData(res || [])

    }

    load()

  }, [])

  return (

    <div className="p-6">

      <h1 className="text-xl mb-4">Domain Stats</h1>

      {data.map((server, i) => (

        <div key={server.server?._id || i} className="mb-8">

          <h2 className="mb-2 font-semibold">
            {server.server?.name}
          </h2>

          <DomainTable domains={server.domains || []} />

        </div>

      ))}

    </div>

  )

}