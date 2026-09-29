// Server-Sent Events (SSE) Manager for Real-Time Updates
let clients = [];

function addClient(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial keepalive
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to live timetable stream' })}\n\n`);

  const clientId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const client = { id: clientId, res };
  clients.push(client);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
}

function broadcastEvent(eventType, payload) {
  const data = JSON.stringify(payload);
  clients.forEach(client => {
    try {
      client.res.write(`event: ${eventType}\n`);
      client.res.write(`data: ${data}\n\n`);
    } catch (err) {
      console.error('Error sending event to client:', err.message);
    }
  });
}

function getActiveClientCount() {
  return clients.length;
}

module.exports = { addClient, broadcastEvent, getActiveClientCount };
