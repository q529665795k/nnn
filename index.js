const net = require('net');
const crypto = require('crypto');

// 你的固定 UUID
const UUID = Buffer.from("6ba22d88-7b51-4f99-a799-2c567f448899".replace(/-/g, ""), "hex");
const PORT = 3000;

const server = net.createServer((client) => {
  let stage = 0;
  let remoteSocket = null;
  let targetHost, targetPort;

  client.on('data', (buffer) => {
    try {
      if (stage === 0) {
        // VMess 握手阶段
        const ver = buffer[0];
        if (ver !== 0x01) return client.destroy();

        const iv = buffer.slice(1, 17);
        const encrypted = buffer.slice(17);
        const decipher = crypto.createDecipheriv('aes-128-cfb', UUID.slice(0, 16), iv);
        decipher.setAutoPadding(false);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

        const payloadLen = decrypted.readUInt16BE(0);
        const payload = decrypted.slice(2, 2 + payloadLen);

        const cmd = payload[1];
        if (cmd !== 0x01) return client.destroy();

        const addrType = payload[2];
        let offset = 3;
        if (addrType === 0x01) { // IPv4
          targetHost = `${payload[offset]}.${payload[offset+1]}.${payload[offset+2]}.${payload[offset+3]}`;
          offset += 4;
        } else if (addrType === 0x03) { // 域名
          const len = payload[offset];
          offset += 1;
          targetHost = payload.slice(offset, offset + len).toString();
          offset += len;
        } else {
          return client.destroy();
        }
        targetPort = payload.readUInt16BE(offset);

        // 建立远程连接
        remoteSocket = net.createConnection({
          host: targetHost,
          port: targetPort,
          timeout: 10000
        }, () => {
          // 发送 VMess 响应头
          const resp = Buffer.from([
            0x01, 0x00, 0x00, 0x00, 0x01,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00
          ]);
          client.write(resp);
          stage = 1;
        });

        remoteSocket.on('data', (chunk) => {
          if (stage === 1 && client.writable) {
            client.write(chunk);
          }
        });

        remoteSocket.on('error', (err) => {
          console.error('Remote error:', err.message);
          client.destroy();
        });

        remoteSocket.on('close', () => {
          client.destroy();
        });

      } else if (stage === 1 && remoteSocket) {
        if (remoteSocket.writable) {
          remoteSocket.write(buffer);
        }
      }
    } catch (err) {
      console.error('VMess error:', err.message);
      client.destroy();
    }
  });

  client.on('error', (err) => {
    console.error('Client error:', err.message);
    if (remoteSocket) remoteSocket.destroy();
  });

  client.on('close', () => {
    if (remoteSocket) remoteSocket.destroy();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 稳定版VMess已启动，监听端口: ${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
});
