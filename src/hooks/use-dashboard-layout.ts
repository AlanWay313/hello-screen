import { useState, useEffect, useCallback } from "react";

export interface WidgetConfig {
  id: string;
  title: string;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "stats", title: "Estatísticas", visible: true, order: 0 },
  { id: "clients-chart", title: "Evolução de Clientes", visible: true, order: 1 },
  { id: "status-pie", title: "Distribuição de Status", visible: true, order: 2 },
];

const STORAGE_KEY = "dashboard-layout";

export function useDashboardLayout() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return DEFAULT_WIDGETS.map(defaultWidget => {
          const saved = parsed.find((w: WidgetConfig) => w.id === defaultWidget.id);
          return saved || defaultWidget;
        }).sort((a, b) => a.order - b.order);
      }
    } catch (e) {
      console.error("Erro ao carregar layout:", e);
    }
    return DEFAULT_WIDGETS;
  });

  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null);

  // Salvar no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch (e) {
      console.error("Erro ao salvar layout:", e);
    }
  }, [widgets]);

  const toggleWidget = useCallback((widgetId: string) => {
    setWidgets(prev =>
      prev.map(w =>
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      )
    );
  }, []);

  const reorderWidgets = useCallback((fromIndex: number, toIndex: number) => {
    setWidgets(prev => {
      const newWidgets = [...prev];
      const [removed] = newWidgets.splice(fromIndex, 1);
      newWidgets.splice(toIndex, 0, removed);
      return newWidgets.map((w, i) => ({ ...w, order: i }));
    });
  }, []);

  const resetLayout = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const moveWidget = useCallback((widgetId: string, direction: "up" | "down") => {
    setWidgets(prev => {
      const index = prev.findIndex(w => w.id === widgetId);
      if (index === -1) return prev;
      
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newWidgets = [...prev];
      [newWidgets[index], newWidgets[newIndex]] = [newWidgets[newIndex], newWidgets[index]];
      return newWidgets.map((w, i) => ({ ...w, order: i }));
    });
  }, []);

  // Drag and Drop handlers
  const handleDragStart = useCallback((widgetId: string) => {
    setDraggedWidget(widgetId);
  }, []);

  const handleDragOver = useCallback((widgetId: string) => {
    if (draggedWidget && draggedWidget !== widgetId) {
      setDragOverWidget(widgetId);
    }
  }, [draggedWidget]);

  const handleDragEnd = useCallback(() => {
    if (draggedWidget && dragOverWidget && draggedWidget !== dragOverWidget) {
      const fromIndex = widgets.findIndex(w => w.id === draggedWidget);
      const toIndex = widgets.findIndex(w => w.id === dragOverWidget);
      if (fromIndex !== -1 && toIndex !== -1) {
        reorderWidgets(fromIndex, toIndex);
      }
    }
    setDraggedWidget(null);
    setDragOverWidget(null);
  }, [draggedWidget, dragOverWidget, widgets, reorderWidgets]);

  const handleDragLeave = useCallback(() => {
    setDragOverWidget(null);
  }, []);

  const visibleWidgets = widgets.filter(w => w.visible);

  return {
    widgets,
    visibleWidgets,
    toggleWidget,
    reorderWidgets,
    resetLayout,
    moveWidget,
    // Drag and drop
    draggedWidget,
    dragOverWidget,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragLeave,
  };
}
