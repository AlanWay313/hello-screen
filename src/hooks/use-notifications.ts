import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/services/api';
import useIntegrador from '@/hooks/use-integrador';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'new_client';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface UseNotificationsOptions {
  pollInterval?: number; // em ms
  enabled?: boolean;
}

const STORAGE_KEY = 'sysprov_notifications';
const LAST_CHECK_KEY = 'sysprov_last_notification_check';

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { pollInterval = 60000, enabled = true } = options; // 1 minuto padrão
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const lastCheckRef = useRef<string | null>(null);
  const integrador = useIntegrador();

  // Carregar notificações do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(parsed);
      }
      
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      if (lastCheck) {
        lastCheckRef.current = lastCheck;
      }
    } catch (e) {
      console.error('Erro ao carregar notificações:', e);
    }
  }, []);

  // Atualizar contagem de não lidos
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // Salvar notificações no localStorage
  const saveNotifications = useCallback((notifs: Notification[]) => {
    // Manter apenas as últimas 50 notificações
    const toSave = notifs.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    setNotifications(toSave);
  }, []);

  // Adicionar nova notificação
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      saveNotifications(updated);
      return updated;
    });

    return newNotif;
  }, [saveNotifications]);

  // Marcar como lida
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // Limpar notificação
  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // Limpar todas
  const clearAll = useCallback(() => {
    saveNotifications([]);
  }, [saveNotifications]);

  // Buscar novos logs e gerar notificações
  const checkForNewLogs = useCallback(async () => {
    if (!integrador || isLoading) return;

    setIsLoading(true);
    try {
      const result = await api.get("/src/services/LogsDistintosClientes.php", { 
        params: { idIntegra: integrador } 
      });
      
      const logs = result.data.data || [];
      const now = new Date();
      const lastCheck = lastCheckRef.current ? new Date(lastCheckRef.current) : new Date(now.getTime() - pollInterval);
      
      // Filtrar logs novos desde última verificação
      const newLogs = logs.filter((log: any) => {
        const logDate = new Date(log.created_at);
        return logDate > lastCheck;
      });

      // Padrões para detectar novos clientes
      const newClientPatterns = [
        /cliente.*cadastrado/i,
        /novo.*cliente/i,
        /cadastro.*realizado/i,
        /cliente.*criado/i,
        /integrado com sucesso/i,
      ];

      // Padrões para omitir (CPF/CNPJ já cadastrado)
      const omitPatterns = [
        /cpf\s*(já\s*)?cadastrado/i,
        /cnpj\s*(já\s*)?cadastrado/i,
        /documento\s*(já\s*)?cadastrado/i,
      ];

      newLogs.forEach((log: any) => {
        const text = `${log.title || ''} ${log.acao || ''}`.toLowerCase();
        
        // Ignorar logs de CPF/CNPJ já cadastrado
        if (omitPatterns.some(p => p.test(text))) return;

        const codeLog = log.codeLog?.toLowerCase() || '';
        const clienteId = log.id_cliente || '';
        const clienteNome = log.nome_cliente || log.cliente_nome || '';
        
        // Detectar novo cliente
        if (newClientPatterns.some(p => p.test(text)) || codeLog === 'success') {
          addNotification({
            type: 'new_client',
            title: 'Novo Cliente Cadastrado',
            message: clienteNome 
              ? `${clienteNome} (${clienteId})` 
              : log.title || `Documento: ${clienteId}`,
            data: { ...log, clienteId, clienteNome },
          });
        }
        // Notificar erros
        else if (codeLog === 'error') {
          addNotification({
            type: 'error',
            title: clienteNome ? `Erro: ${clienteNome}` : 'Erro no Sistema',
            message: log.title || log.acao?.substring(0, 100) || 'Ocorreu um erro',
            data: { ...log, clienteId, clienteNome },
          });
        }
        // Notificar avisos importantes
        else if (codeLog === 'warning') {
          addNotification({
            type: 'warning',
            title: clienteNome ? `Aviso: ${clienteNome}` : 'Aviso',
            message: log.title || log.acao?.substring(0, 100) || 'Novo aviso',
            data: { ...log, clienteId, clienteNome },
          });
        }
      });

      // Atualizar última verificação
      lastCheckRef.current = now.toISOString();
      localStorage.setItem(LAST_CHECK_KEY, now.toISOString());

    } catch (error) {
      console.error('Erro ao verificar novos logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [integrador, isLoading, pollInterval, addNotification]);

  // Polling para verificar novos logs
  useEffect(() => {
    if (!enabled || !integrador) return;

    // Verificar imediatamente ao iniciar
    const timeout = setTimeout(() => {
      checkForNewLogs();
    }, 5000); // Delay inicial de 5s para não sobrecarregar

    // Configurar intervalo
    const interval = setInterval(checkForNewLogs, pollInterval);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [enabled, integrador, pollInterval, checkForNewLogs]);

  return {
    notifications,
    unreadCount,
    isLoading,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    refresh: checkForNewLogs,
  };
}