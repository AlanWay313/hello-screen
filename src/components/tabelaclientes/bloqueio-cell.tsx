import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { buscarBloqueiosContrato } from "@/services/bloqueiosContrato"

type BloqueioStatus = "unknown" | "blocked" | "unblocked"

const bloqueioCache = new Map<string, BloqueioStatus>()
const inflight = new Map<string, Promise<BloqueioStatus>>()

function normalizeContratoId(contrato?: string | number) {
  return String(contrato ?? "").trim()
}

async function fetchBloqueioStatus(contratoId: string): Promise<BloqueioStatus> {
  if (!contratoId) return "unknown"

  const cached = bloqueioCache.get(contratoId)
  if (cached) return cached

  const existing = inflight.get(contratoId)
  if (existing) return existing

  const req = (async () => {
    try {
      const res = await buscarBloqueiosContrato(contratoId, true)
      const blocked = !!(res.bloqueios && res.bloqueios.length > 0)
      const status: BloqueioStatus = blocked ? "blocked" : "unblocked"
      bloqueioCache.set(contratoId, status)
      return status
    } catch {
      // Em falhas de rede/credenciais, mantemos como desconhecido.
      const status: BloqueioStatus = "unknown"
      bloqueioCache.set(contratoId, status)
      return status
    } finally {
      inflight.delete(contratoId)
    }
  })()

  inflight.set(contratoId, req)
  return req
}

export function BloqueioCell({
  contratoId,
  onResolved,
}: {
  contratoId: string | number
  onResolved?: (contratoId: string, status: BloqueioStatus) => void
}) {
  const id = React.useMemo(() => normalizeContratoId(contratoId), [contratoId])
  const [status, setStatus] = React.useState<BloqueioStatus>(() => bloqueioCache.get(id) ?? "unknown")
  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!id) return
    const cached = bloqueioCache.get(id)
    if (!cached) return
    setStatus(cached)
    onResolved?.(id, cached)
  }, [id, onResolved])

  React.useEffect(() => {
    if (!id) return
    if (status !== "unknown") return
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        io.disconnect()
        fetchBloqueioStatus(id).then((next) => {
          setStatus(next)
          onResolved?.(id, next)
        })
      },
      { rootMargin: "200px" }
    )

    io.observe(el)
    return () => io.disconnect()
  }, [id, onResolved, status])

  if (status === "blocked") {
    return (
      <div ref={ref} className="inline-flex">
        <Badge variant="destructive">Bloqueado</Badge>
      </div>
    )
  }

  if (status === "unblocked") {
    return (
      <div ref={ref} className="inline-flex">
        <Badge variant="secondary">Livre</Badge>
      </div>
    )
  }

  return (
    <div ref={ref} className="inline-flex">
      <Badge variant="outline">—</Badge>
    </div>
  )
}

export type { BloqueioStatus }
