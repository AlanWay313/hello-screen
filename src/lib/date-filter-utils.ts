/**
 * Utilitário para filtrar dados por período usando o campo created_at
 */

export type PeriodoFilter = "todos" | "hoje" | "7dias" | "30dias" | "90dias" | "ano"

/**
 * Filtra um array de itens pelo campo created_at baseado no período selecionado
 */
export function filterByPeriodo<T extends { created_at?: string }>(
  items: T[],
  periodo: string
): T[] {
  if (!periodo || periodo === "todos") {
    return items
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  let startDate: Date

  switch (periodo) {
    case "hoje":
      startDate = today
      break
    case "7dias":
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 7)
      break
    case "30dias":
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 30)
      break
    case "90dias":
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 90)
      break
    case "ano":
      startDate = new Date(now.getFullYear(), 0, 1) // 1 de janeiro do ano atual
      break
    default:
      return items
  }

  return items.filter((item) => {
    if (!item.created_at) return false
    
    const itemDate = new Date(item.created_at)
    return itemDate >= startDate && itemDate <= now
  })
}

/**
 * Retorna a contagem de itens por período
 */
export function countByPeriodo<T extends { created_at?: string }>(
  items: T[],
  periodo: string
): number {
  return filterByPeriodo(items, periodo).length
}
