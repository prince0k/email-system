type Queue = {
  domain: string
  queued: number
}

type Props = {
  queues?: Queue[]
  warnThreshold?: number
}

function format(n: number) {
  return n.toLocaleString()
}

export default function QueueTable({
  queues = [],
  warnThreshold = 1000
}: Props) {

  if (queues.length === 0) {
    return (
      <div className="card-glass p-6 text-sm text-muted-foreground">
        No queues found
      </div>
    )
  }

  const sorted = [...queues].sort((a, b) => b.queued - a.queued)

  const maxQueue = sorted[0]?.queued || 0

  return (
    <div className="card-glass overflow-hidden max-h-[400px] overflow-y-auto">

      <table className="w-full text-sm">

        <thead className="border-b border-border bg-muted/40 sticky top-0">
          <tr>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">
              Domain
            </th>
            <th className="text-right px-4 py-3 text-muted-foreground font-medium">
              Queued
            </th>
          </tr>
        </thead>

        <tbody>

          {sorted.map((q, i) => {

            const highQueue = q.queued > warnThreshold
            const percent =
              maxQueue > 0 ? Math.round((q.queued / maxQueue) * 100) : 0

            return (
              <tr
                key={`${q.domain}-${i}`}
                className="border-b border-border hover:bg-muted/40 transition"
              >
                <td className="px-4 py-3 text-foreground">
                  {q.domain}
                </td>

                <td
                  className={`px-4 py-3 text-right font-medium ${
                    highQueue
                      ? "text-destructive"
                      : "text-foreground"
                  }`}
                >
                  {format(q.queued)}

                  <span className="ml-2 text-xs text-muted-foreground">
                    {percent}%
                  </span>

                </td>
              </tr>
            )

          })}

        </tbody>

      </table>

    </div>
  )
}