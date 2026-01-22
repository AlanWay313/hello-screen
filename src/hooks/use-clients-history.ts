import { useState, useCallback, useRef } from 'react';

export interface MonthlySnapshot {
  month: string; // formato: "2024-01" 
  monthLabel: string; // formato: "Jan/24"
  ativos: number;
  inativos: number;
  cancelados: number;
  total: number;
  timestamp: string;
}

const STORAGE_KEY = 'sysprov_clients_history';

export function useClientsHistory() {
  const [history, setHistory] = useState<MonthlySnapshot[]>(() => {
    // Carregar do localStorage na inicialização
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
    }
    return [];
  });

  const historyRef = useRef(history);
  historyRef.current = history;

  // Salvar snapshot do mês atual
  const saveSnapshot = useCallback((data: {
    ativos: number;
    inativos: number;
    cancelados: number;
  }) => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthLabel = `${monthNames[now.getMonth()]}/${String(now.getFullYear()).slice(-2)}`;

    const prev = historyRef.current;
    
    // Verificar se já existe snapshot deste mês
    const existingIndex = prev.findIndex(s => s.month === monthKey);
    
    const newSnapshot: MonthlySnapshot = {
      month: monthKey,
      monthLabel,
      ativos: data.ativos,
      inativos: data.inativos,
      cancelados: data.cancelados,
      total: data.ativos + data.inativos,
      timestamp: now.toISOString(),
    };

    let updated: MonthlySnapshot[];
    
    if (existingIndex >= 0) {
      // Atualiza o snapshot existente do mês (sempre com os dados mais recentes)
      updated = [...prev];
      updated[existingIndex] = newSnapshot;
    } else {
      // Adiciona novo mês
      updated = [...prev, newSnapshot];
    }

    // Ordenar por mês e manter apenas os últimos 12 meses
    updated = updated
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    // Salvar no localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao salvar histórico:', e);
    }

    setHistory(updated);
  }, []);

  // Calcular novos clientes comparando com mês anterior
  const calculateNewClients = useCallback((currentAtivos: number): number => {
    const current = historyRef.current;
    if (current.length < 2) return 0;
    
    const sortedHistory = [...current].sort((a, b) => a.month.localeCompare(b.month));
    const previousMonth = sortedHistory[sortedHistory.length - 2];
    
    if (!previousMonth) return 0;
    
    const diff = currentAtivos - previousMonth.ativos;
    return Math.max(0, diff); // Retorna 0 se for negativo
  }, []);

  // Obter dados formatados para o gráfico
  const getChartData = useCallback(() => {
    return historyRef.current
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((snapshot, index, arr) => {
        // Calcular novos comparando com mês anterior
        const prevSnapshot = index > 0 ? arr[index - 1] : null;
        const novos = prevSnapshot 
          ? Math.max(0, snapshot.ativos - prevSnapshot.ativos)
          : 0;

        return {
          month: snapshot.monthLabel,
          ativos: snapshot.ativos,
          novos,
        };
      });
  }, []);

  return {
    history,
    saveSnapshot,
    calculateNewClients,
    getChartData,
    hasHistory: history.length > 0,
  };
}
