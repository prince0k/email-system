type Props = {
  sent?: number
  delivered?: number
  bounced?: number
}

function format(n: number) {
  return n.toLocaleString()
}

export default function StatsGraph({
  sent = 0,
  delivered = 0,
  bounced = 0
}: Props) {

  const deliveryRate =
    sent > 0 ? ((delivered / sent) * 100).toFixed(1) : "0.0"

  const bounceRate =
    sent > 0 ? ((bounced / sent) * 100).toFixed(1) : "0.0"

  return (

    <div className="grid grid-cols-3 gap-4">

      <div className="card-glass p-5">
        <p className="text-sm text-muted-foreground mb-1">
          Sent
        </p>

        <p className="text-2xl font-semibold text-foreground">
          {format(sent)}
        </p>
      </div>

      <div className="card-glass p-5">
        <p className="text-sm text-muted-foreground mb-1">
          Delivered
        </p>

        <p className="text-2xl font-semibold text-primary">
          {format(delivered)}
        </p>

        <p className="text-xs text-muted-foreground mt-1">
          {deliveryRate}% delivery
        </p>
      </div>

      <div className="card-glass p-5">
        <p className="text-sm text-muted-foreground mb-1">
          Bounce
        </p>

        <p className="text-2xl font-semibold text-destructive">
          {format(bounced)}
        </p>

        <p className="text-xs text-muted-foreground mt-1">
          {bounceRate}% bounce
        </p>
      </div>

    </div>

  )
}