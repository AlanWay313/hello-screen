import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  UserPlus, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  Clock,
  ExternalLink,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useNotifications, Notification } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'new_client':
      return { icon: UserPlus, color: 'text-success', bg: 'bg-success/10' };
    case 'error':
      return { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' };
    case 'warning':
      return { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' };
    case 'info':
    case 'success':
    default:
      return { icon: Info, color: 'text-primary', bg: 'bg-primary/10' };
  }
};

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'Agora';
  if (diffMinutes < 60) return `${diffMinutes}min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

const NotificationItem = ({ 
  notification, 
  onMarkAsRead, 
  onDelete,
  onNavigate
}: { 
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (notification: Notification) => void;
}) => {
  const { icon: Icon, color, bg } = getNotificationIcon(notification.type);
  const clienteId = notification.data?.clienteId || notification.data?.id_cliente;
  const clienteNome = notification.data?.clienteNome || notification.data?.nome_cliente;

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    onNavigate(notification);
  };

  return (
    <div 
      className={cn(
        "p-3 rounded-lg transition-colors hover:bg-secondary/50 group cursor-pointer",
        !notification.read && "bg-primary/5 border-l-2 border-primary"
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        <div className={cn("p-2 rounded-lg flex-shrink-0", bg)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "text-sm font-medium truncate",
              !notification.read ? "text-foreground" : "text-muted-foreground"
            )}>
              {notification.title}
            </h4>
            <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(notification.timestamp)}
            </span>
          </div>
          
          {/* Nome do cliente se disponível */}
          {clienteNome && (
            <p className="text-sm font-medium text-foreground mt-0.5 truncate">
              {clienteNome}
            </p>
          )}
          
          {/* Documento */}
          {clienteId && (
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="secondary" className="font-mono text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {clienteId}
              </Badge>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {notification.message}
          </p>
          
          <div className="flex items-center gap-1 mt-2">
            {/* Botão de ação principal */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              className="h-6 px-2 text-xs text-primary hover:text-primary"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              {notification.type === 'new_client' ? 'Ver cliente' : 'Ver logs'}
            </Button>
            
            <div className="flex-1" />
            
            {!notification.read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              className="h-6 px-2 text-xs text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const {
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotification, 
    clearAll,
    isLoading 
  } = useNotifications({ pollInterval: 60000 });

  const handleNavigate = (notification: Notification) => {
    setOpen(false);
    const clienteId = notification.data?.clienteId || notification.data?.id_cliente;
    
    if (notification.type === 'new_client' && clienteId) {
      // Navega para clientes com filtro do documento
      navigate(`/clientes?search=${encodeURIComponent(clienteId)}`);
    } else {
      // Navega para logs com filtro do documento
      navigate(`/logs?search=${encodeURIComponent(clienteId || '')}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative h-9 w-9 rounded-lg"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs bg-destructive text-destructive-foreground border-2 border-background"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          {isLoading && (
            <span className="absolute bottom-0 right-0 h-2 w-2 bg-primary rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        align="end" 
        className="w-80 sm:w-96 p-0 bg-popover border border-border"
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Notificações</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 px-2 text-xs"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Ler todas
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="p-3 bg-secondary/50 rounded-full w-fit mx-auto mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhuma notificação</p>
              <p className="text-xs text-muted-foreground mt-1">
                Você será notificado sobre novos clientes e eventos
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={clearNotification}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="w-full h-8 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar todas
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}