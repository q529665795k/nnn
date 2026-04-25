const express = require('express');
const http = require('http');
const crypto = require('crypto');
const net = require('net');

const app = express();
const PORT = process.env.PORT || 3000;
const UUID = crypto.randomUUID();

// 1. 网页：自动生成并显示 VMess 链接
app.get('/', (req, res) => {
  const host = req.headers.host;
  const [address, port] = host.split(':');
  const vmessObj = {
    v: "2",
    ps: "Railway-VMess",
    add: address,
    port: port || "443",
    id: UUID,
    aid: "0",
    scy: "auto",
    net: "tcp",
    type: "none",
    host: "",
    path: "",
    tls: ""
  };
  const vmessStr = Buffer.from(JSON.stringify(vmessObj)).toString('base64');
  const vmessLink = `vmess://${vmessStr}`;

  res.send(`
    <html>
      <head>
        <title>VMess 节点就绪</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding-top: 50px; background: #1a1a1a; color: #fff; }
          .link-box { background: #2a2a2a; padding: 15px; border-radius: 8px; margin: 20px auto; max-width: 400px; word-break: break-all; }
          button { background: #7c3aed; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>✅ VMess 节点就绪</h1>
        <p>一键复制导入 V2RayNG</p>
        <div class="link-box">
          <code id="vmess">${vmessLink}</code>
        </div>
        <button onclick="navigator.clipboard.writeText(document.getElementById('vmess').textContent)">复制 VMess 链接</button>
      </body>
    </html>
  `);
});

// 2. 启动 HTTP/VMess 服务
const server = http.createServer(app);

// 简化版 VMess 流量转发（兼容 TCP 模式）
server.on('connection', (socket) => {
  socket.on('data', (data) => {
    try {
      if (data[0] !== 1) return;

      const ivLen = 16;
      const iv = data.slice(1, 1 + ivLen);
      const key = crypto.createHash('md5').update(UUID).digest();
      const decipher = crypto.createDecipheriv('aes-128-cfb', key, iv);
      const decrypted = Buffer.concat([decipher.update(data.slice(1 + ivLen)), decipher.final()]);

      const targetPort = decrypted.readUInt16BE(2);
      const targetAddrType = decrypted[4];
      let targetAddr, addrLenOffset;

      if (targetAddrType === 1) {
        targetAddr = `${decrypted[5]}.${decrypted[6]}.${decrypted[7]}.${decrypted[8]}`;
        addrLenOffset = 4;
      } else if (targetAddrType === 2) {
        const addrLen = decrypted[5];
        targetAddr = decrypted.slice(6, 6 + addrLen).toString();
        addrLenOffset = 1 + addrLen;
      } else if (targetAddrType === 3) {
        targetAddr = decrypted.slice(5, 21).toString('hex').match(/.{1,4}/g).join(':');
        addrLenOffset = 16;
      } else {
        return;
      }

      const targetSocket = net.connect(targetPort, targetAddr, () => {
        targetSocket.write(decrypted.slice(5 + addrLenOffset));
        socket.pipe(targetSocket);
        targetSocket.pipe(socket);
      });

      targetSocket.on('error', (err) => socket.destroy(err));
    } catch (err) {
      socket.destroy(err);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务已启动，端口 ${PORT}`);
  console.log(`UUID: ${UUID}`);
  console.log(`3分钟保活已开启`);
});

// 3. 3分钟保活逻辑（防止 Railway 休眠）
setInterval(() => {
  http.get(`http://127.0.0.1:${PORT}`, (res) => {
    console.log(`[保活] 心跳请求成功，状态码: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`[保活] 心跳请求失败: ${err.message}`);
  });
}, 3 * 60 * 1000); // 每3分钟请求一次
