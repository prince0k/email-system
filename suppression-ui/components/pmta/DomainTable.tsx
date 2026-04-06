type Domain = {
  domain: string
  sent: number
  delivered: number
  bounced: number
}

type Props = {
  domains?: Domain[]
}

function format(n: number) {
  return n.toLocaleString()
}

export default function DomainTable({ domains = [] }: Props) {

  if (domains.length === 0) {
    return (
      <div className="card-glass p-6 text-sm text-muted-foreground">
        No domain stats available
      </div>
    )
  }

  return (
    <div className="card-glass overflow-hidden max-h-[500px] overflow-y-auto">

      <table className="w-full text-sm">

        <thead className="border-b border-border bg-muted/40 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-muted-foreground font-medium">
              Domain
            </th>

            <th className="px-4 py-3 text-right text-muted-foreground font-medium">
              Sent
            </th>

            <th className="px-4 py-3 text-right text-muted-foreground font-medium">
              Delivered
            </th>

            <th className="px-4 py-3 text-right text-muted-foreground font-medium">
              Bounce
            </th>
          </tr>
        </thead>

        <tbody>

          {domains.map((d, i) => {

            const bounceRate =
              d.sent > 0 ? Math.round((d.bounced / d.sent) * 100) : 0

            const bounceColor =
              bounceRate > 5
                ? "text-destructive"
                : bounceRate > 2
                ? "text-yellow-500"
                : "text-green-500"

            return (
              <tr
                key={`${d.domain}-${i}`}
                className="border-b border-border hover:bg-muted/40 transition"
              >

                <td className="px-4 py-3 text-foreground font-medium">
                  {d.domain}
                </td>

                <td className="px-4 py-3 text-right text-foreground">
                  {format(d.sent)}
                </td>

                <td className="px-4 py-3 text-right text-green-500 font-medium">
                  {format(d.delivered)}
                </td>

                <td className={`px-4 py-3 text-right font-medium ${bounceColor}`}>
                  {format(d.bounced)}

                  <span className="ml-2 text-xs text-muted-foreground">
                    {bounceRate}%
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