import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

type MessageHandler = (data: any) => void;

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, MessageHandler[]>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intentionalCloseRef = useRef(false);
  const { token } = useAuthStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (!token) {
      console.warn('No token available for WebSocket connection');
      return;
    }

    try {
      // Ensure URL is WebSocket protocol
      let wsUrl = url;
      if (url.startsWith('http://')) {
        wsUrl = url.replace('http://', 'ws://');
      } else if (url.startsWith('https://')) {
        wsUrl = url.replace('https://', 'wss://');
      } else if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + url;
      }
      
      const ws = new WebSocket(`${wsUrl}/ws?token=${token}`);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          
          // Call registered handlers
          if (data.type && handlersRef.current.has(data.type)) {
            handlersRef.current.get(data.type)?.forEach((handler) => handler(data));
          }
          
          // Call general handlers
          if (handlersRef.current.has('*')) {
            handlersRef.current.get('*')?.forEach((handler) => handler(data));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = () => {
        // Only log errors after we were actually connected; avoids noise from
        // "closed before the connection is established" (e.g. React Strict Mode unmount)
        if (ws.readyState === WebSocket.OPEN) {
          console.error('WebSocket error');
        }
      };

      ws.onclose = () => {
        const wasIntentional = intentionalCloseRef.current;
        intentionalCloseRef.current = false;
        setIsConnected(false);
        if (!wasIntentional) {
          console.log('WebSocket disconnected');
          // Reconnect after 3 seconds
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connect();
            }, 3000);
          }
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [url, token]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const on = useCallback((type: string, handler: MessageHandler) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, []);
    }
    handlersRef.current.get(type)?.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = handlersRef.current.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    send,
    on,
    connect,
    disconnect,
  };
}
