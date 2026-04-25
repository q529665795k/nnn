const http = require('http');
const net = require('net');
const url = require('url');

const PORT = process.env.PORT || 3000;
// 自定义你的用户名和密码
const AUTH_USER = "long";
const AUTH_PASS = "123456";

const server = http.createServer((req, res) => {
    // 健康检测接口
    if (req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('pong');
        return;
    }

    // 基础鉴权
    const auth = req.headers['proxy-authorization'];
    if (!auth || !checkAuth(auth)) {
        res.writeHead(407, {
            'Proxy-Authenticate': 'Basic realm="Proxy"'
        });
        res.end('Proxy Auth Required');
        return;
    }

    const { method, headers, url: reqUrl } = req;
    const parsedUrl = url.parse(reqUrl);
    const { hostname, port, path } = parsedUrl;

    if (!hostname) {
        res.writeHead(400);
        res.end('Bad Request');
        return;
    }

    // 处理 HTTPS CONNECT 隧道
    if (method === 'CONNECT') {
        const targetPort = parseInt(port, 10) || 443;
        const socket = net.connect(targetPort, hostname, () => {
            res.writeHead(200, {
                'Connection': 'keep-alive',
                'Proxy-Connection': 'keep-alive'
            });
            socket.pipe(res.socket, { end: true });
            res.socket.pipe(socket, { end: true });
        });

        socket.on('error', (err) => {
            res.destroy(err);
        });
        return;
    }

    // 处理普通 HTTP 请求
    const options = {
        hostname,
        port: port || 80,
        path,
        method,
        headers: { ...headers, host: hostname }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        res.writeHead(503);
        res.end('Proxy Error');
    });

    req.pipe(proxyReq, { end: true });
});

// 鉴权校验函数
function checkAuth(authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme.toLowerCase() !== 'basic') return false;
    const decoded = Buffer.from(encoded, 'base64').toString();
    const [user, pass] = decoded.split(':');
    return user === AUTH_USER && pass === AUTH_PASS;
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ 服务已启动，监听端口：${PORT}`);
    console.log(`✅ 代理鉴权开启，用户名：${AUTH_USER}`);
});
