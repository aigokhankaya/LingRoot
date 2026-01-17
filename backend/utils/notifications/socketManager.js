const logger = require('../common/logger.js');
let io = null;

/**
 * Initialize Socket.IO server and attach it to the given HTTP server.
 * This should be called once from server.js after creating the HTTP server.
 */
function initSocket(server) {
  if (io) {
    // Already initialized
    return io;
  }

  const { Server } = require('socket.io');

  io = new Server(server, {
    path: '/socket.io',
    cors: {
      // HTTP tarafında zaten CORS korumaları var; burada daha esnek bırakıyoruz.
      // İleride ihtiyaç olursa origin listesini sıkılaştırabiliriz.
      origin: (origin, callback) => {
        callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('join_admin_support_room', () => {
      socket.join('admin_support');
      logger.info(`[Socket.IO] Socket ${socket.id} joined admin_support room`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  return io;
}

/**
 * Get the initialized Socket.IO instance. Throws if called before initSocket.
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initSocket(server) first.');
  }
  return io;
}

module.exports = {
  initSocket,
  getIO,
};
