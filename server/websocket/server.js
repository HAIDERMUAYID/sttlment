const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.clients = new Map();
    this.setup();
  }

  setup() {
    this.wss.on('connection', (ws, req) => {
      // Extract token from query string
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Store client
        ws.userId = userId;
        this.clients.set(userId, ws);

        console.log(`WebSocket client connected: ${userId}`);

        // Send welcome message
        ws.send(
          JSON.stringify({
            type: 'connected',
            message: 'Connected to real-time updates',
          })
        );

        // Handle messages
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message);
            this.handleMessage(ws, data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });

        // Handle disconnect
        ws.on('close', () => {
          console.log(`WebSocket client disconnected: ${userId}`);
          this.clients.delete(userId);
        });

        // Handle errors
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
        });
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        ws.close(1008, 'Invalid token');
      }
    });
  }

  handleMessage(ws, data) {
    // Handle ping/pong for keepalive
    if (data.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
    }
  }

  broadcast(type, data, excludeUserId = null) {
    const message = JSON.stringify({ type, ...data });
    this.clients.forEach((ws, userId) => {
      if (userId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  sendToUser(userId, type, data) {
    const ws = this.clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, ...data }));
    }
  }
}

module.exports = WebSocketServer;
