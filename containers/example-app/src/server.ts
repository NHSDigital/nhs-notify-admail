// Placeholder HTTP server for AppRunner. Replace with real application code.
import http from 'http';

const port = Number(process.env.PORT ?? 8080);

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});

server.listen(port, () => {
  console.log(`Placeholder app listening on port ${port}`);
});
