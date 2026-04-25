const http = require('http');
const net = require('net');
const url = require('url');

// 必须用 Render 分配的端口，不能写死！
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    // 1. 专门给 Render 用的健康检测接口
    if (req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('pong');
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

    // 2. 处理 HTTPS CONNECT 隧道请求
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
            console.error('CONNECT error:', err);
            res.destroy(err);
        });
        return;
    }

    // 3. 处理普通 HTTP 请求转发
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
        console.error('proxy error:', err);
        res.writeHead(503);
        res.end('Proxy Error');
    });

    req.pipe(proxyReq, { end: true });
});

// 启动服务，监听 Render 分配的端口
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ 服务已启动，监听端口：${PORT}`);
    console.log(`✅ 健康检测地址：/ping`);
});
