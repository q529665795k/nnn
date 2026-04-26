const http = require('http');
const net = require('net');

const PORT = 3000;
const USER = "long";
const PWD = "123456";

function checkAuth(req) {
  const auth = req.headers['proxy-authorization'];
  if (!auth) return false;
  const [, encoded] = auth.split(' ');
  const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');
  return user === USER && pass === PWD;
}

const server = http.createServer((req, res) => {
  if (!checkAuth(req)) {
    res.writeHead(407, { 'Proxy-Authenticate': 'Basic realm="Proxy"' });
    return res.end('Auth Required');
  }
  res.end("✅ 服务正常｜单端口3000运行｜HTTP CONNECT代理可用");
});

server.on('connect', (req, clientSocket, head) => {
  if (!checkAuth(req)) {
    clientSocket.write('HTTP/1.1 407 Proxy Authentication Required\r\n\r\n');
    clientSocket.destroy();
    return;
  }
  const [host, portStr] = req.url.split(':');
  const port = parseInt(portStr, 10) || 443;
  const serverSocket = net.connect(port, host, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });
  serverSocket.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => serverSocket.destroy());
});

server.listen(PORT, '0.0.0.0', () => {
  console.log("✅ 仅监听 3000 端口，零依赖启动完成");
});
