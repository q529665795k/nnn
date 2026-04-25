const net = require('net');
const crypto = require('crypto');

// 固定你的 UUID
const UUID = Buffer.from("6ba22d88-7b51-4f99-a799-2c567f448899".replace(/-/g, ""), "hex");

// 只监听 Railway 自动分配的端口，完全不写死 3000
const port = process.env.PORT;

if (!port) {
  console.error('❌ 错误：Railway 未设置 PORT 环境变量！');
  process.exit(1);
}

const server = net.createServer((client) => {
  let state = 'handshake';
  let remote = null;
  let targetAddr = null;
  let targetPort = null;

  client.on('data', (data) => {
    try {
      if (state === 'handshake') {
        const ver = data[0];
        if (ver !== 0x01) return client.destroy();

        const iv = data.slice(1, 17);
        const encrypted = data.slice(17);
        const decipher = crypto.createDecipheriv('aes-128-cfb', UUID.slice(0, 16), iv);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

        const pLen = decrypted.readUInt16BE(0);
        const payload = decrypted.slice(2, 2 + pLen);

        const addrType = payload[0];
        let addr;
        if (addrType === 1) {
          addr = `${payload[1]}.${payload[2]}.${payload[3]}.${payload[4]}`;
          targetPort = payload.readUInt16BE(5);
          targetAddr = addr;
        } else if (addrType === 2) {
          const len = payload[1];
          addr = payload.slice(2, 2 + len).toString();
          targetPort = payload.readUInt16BE(2 + len);
          targetAddr = addr;
        } else {
          return client.destroy();
        }

        remote = net.createConnection({ host: targetAddr, port: targetPort }, () => {
          const resp = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
          client.write(resp);
          state = 'forward';
        });

        remote.on('data', (chunk) => {
          if (state === 'forward') client.write(chunk);
        });
        remote.on('error', () => client.destroy());
        remote.on('close', () => client.destroy());
      } else if (state === 'forward' && remote) {
        remote.write(data);
      }
    } catch (e) {
      client.destroy();
    }
  });

  client.on('error', () => {
    if (remote) remote.destroy();
  });
  client.on('close', () => {
    if (remote) remote.destroy();
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`✅ VMess 服务已启动，监听端口：${port}`);
});

server.on('error', (err) => console.error('❌ 错误：', err.message));
