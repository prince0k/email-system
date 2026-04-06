type Props = {
  online?: boolean
  label?: string
}

export default function ServerHealth({ online = false, label }: Props) {

  const text = label ?? (online ? "Online" : "Offline")

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
        online
          ? "bg-primary/10 text-primary border-primary/30"
          : "bg-destructive/10 text-destructive border-destructive/30"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          online
            ? "bg-primary animate-pulse"
            : "bg-destructive"
        }`}
      />
      {text}
    </span>
  )
}