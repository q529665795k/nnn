// ========== 全部补全原生内置依赖 无缺失 ==========
const http = require('http');
const https = require('https');
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const url = require('url');

// 自动获取平台端口，不写死
const PORT = process.env.PORT;
// 固定UUID，V2RayNG保持一致即可
const UUID = "6ba22d88-7b51-4f99-a799-2c567f448899";

// 简易网页 生成VMess链接
const server = http.createServer((req, res) => {
  const hostInfo = req.headers.host || "";
  const [address, port] = hostInfo.split(':');

  const vmessConfig = {
    v: "2",
    ps: "Railway-VMess",
    add: address,
    port: port,
    id: UUID,
    aid: "0",
    scy: "auto",
    net: "tcp",
    type: "none",
    host: "",
    path: "/",
    tls: ""
  };

  const base64Code = Buffer.from(JSON.stringify(vmessConfig)).toString("base64");
  const vmessUrl = `vmess://${base64Code}`;

  res.setHeader("Content-Type", "text/html;charset=utf-8");
  res.end(`
    <h3>VMess 节点正常</h3>
    <p>UUID：${UUID}</p>
    <p>地址：${address}:${port}</p>
    <div>${vmessUrl}</div>
  `);
});

// 标准VMess TCP处理
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

// 规范监听 0.0.0.0
server.listen(PORT, "0.0.0.0", () => {
  console.log("✅ 所有依赖加载完成");
  console.log("✅ 自动端口：", PORT);
  console.log("✅ 固定UUID：", UUID);
});

// 3分钟保活 防止休眠下线
setInterval(() => {
  http.get(`http://127.0.0.1:${PORT}`).on("error", () => {});
}, 180000);
