// 原生依赖补全
const http = require('http');
const https = require('https');
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const url = require('url');
const dns = require('dns');

// 强制IPv4，避免IPv6干扰
dns.setDefaultResultOrder('ipv4first');

// ========== 全部10个Railway环境变量 ==========
const RAILWAY_PRIVATE_DOMAIN = process.env.RAILWAY_PRIVATE_DOMAIN;
const RAILWAY_TCP_PROXY_DOMAIN = process.env.RAILWAY_TCP_PROXY_DOMAIN;
const RAILWAY_TCP_PROXY_PORT = process.env.RAILWAY_TCP_PROXY_PORT;
const RAILWAY_TCP_APPLICATION_PORT = process.env.RAILWAY_TCP_APPLICATION_PORT;
const RAILWAY_PROJECT_NAME = process.env.RAILWAY_PROJECT_NAME;
const RAILWAY_ENVIRONMENT_NAME = process.env.RAILWAY_ENVIRONMENT_NAME;
const RAILWAY_SERVICE_NAME = process.env.RAILWAY_SERVICE_NAME;
const RAILWAY_PROJECT_ID = process.env.RAILWAY_PROJECT_ID;
const RAILWAY_ENVIRONMENT_ID = process.env.RAILWAY_ENVIRONMENT_ID;
const RAILWAY_SERVICE_ID = process.env.RAILWAY_SERVICE_ID;

// 端口配置：优先使用Railway TCP应用端口
const PORT = RAILWAY_TCP_APPLICATION_PORT || process.env.PORT;

// 固定UUID（与V2RayNG保持一致）
const UUID = "6ba22d88-7b51-4f99-a799-2c567f448899";

// 网页服务：防溢出处理，VMess链接带滚动条
const server = http.createServer((req, res) => {
  const vmessConfig = {
    v: "2",
    ps: "Railway-VMess",
    add: RAILWAY_TCP_PROXY_DOMAIN,
    port: RAILWAY_TCP_PROXY_PORT,
    id: UUID,
    aid: "0",
    scy: "auto",
    net: "tcp",
    type: "none",
    tls: ""
  };

  const base64Code = Buffer.from(JSON.stringify(vmessConfig)).toString("base64");
  const vmessUrl = `vmess://${base64Code}`;

  res.setHeader("Content-Type", "text/html;charset=utf-8");
  res.end(`
    <style>
      body { background:#111; color:#fff; text-align:center; font-family:Arial, sans-serif; padding:20px; margin:0; }
      .box { background:#222; padding:15px; border-radius:8px; max-width:90%; margin:15px auto; }
      .code { background:#333; padding:10px; border-radius:4px; overflow-x:auto; text-align:left; white-space:nowrap; font-size:12px; }
      button { background:#007bff; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; margin-top:10px; }
    </style>
    <h3>VMess 节点配置</h3>
    <div class="box">
      <p><strong>UUID：</strong>${UUID}</p>
      <p><strong>地址：</strong>${RAILWAY_TCP_PROXY_DOMAIN}:${RAILWAY_TCP_PROXY_PORT}</p>
    </div>
    <div class="box">
      <p><strong>VMess链接（可复制）：</strong></p>
      <div class="code">${vmessUrl}</div>
      <button onclick="navigator.clipboard.writeText('${vmessUrl}').then(()=>alert('复制成功！'))">复制链接</button>
    </div>
  `);
});

// VMess TCP处理逻辑
server.on("connection", (socket) => {
  socket.once("data", buf => {
    if (buf[0] !== 0x01) return socket.destroy();

    try {
      const iv = buf.slice(1, 17);
      const md5Key = crypto.createHash("md5").update(UUID).digest();
      const decipher = crypto.createDecipheriv("aes-128-cfb", md5Key, iv);
      const raw = Buffer.concat([decipher.update(buf.slice(17)), decipher.final()]);

      const addrType = raw[4];
      let host, targetPort, cutLen;

      if (addrType === 1) {
        host = `${raw[5]}.${raw[6]}.${raw[7]}.${raw[8]}`;
        targetPort = raw.readUInt16BE(9);
        cutLen = 11;
      } else if (addrType === 2) {
        const dLen = raw[5];
        host = raw.slice(6, 6 + dLen).toString();
        targetPort = raw.readUInt16BE(6 + dLen);
        cutLen = 6 + dLen + 2;
      } else {
        return socket.destroy();
      }

      const remote = net.connect(targetPort, host, () => {
        remote.write(raw.slice(cutLen));
        remote.pipe(socket);
        socket.pipe(remote);
      });

      remote.on("error", () => socket.destroy());
      socket.on("error", () => remote.destroy());
    } catch (e) {
      socket.destroy();
    }
  });
});

// 监听配置（绑定0.0.0.0，Railway标准）
server.listen(PORT, "0.0.0.0", () => {
  console.log("✅ 已加载全部10个Railway环境变量");
  console.log("✅ 监听端口：", PORT);
  console.log("✅ 公网地址：", RAILWAY_TCP_PROXY_DOMAIN, ":", RAILWAY_TCP_PROXY_PORT);
  console.log("✅ UUID：", UUID);
});
