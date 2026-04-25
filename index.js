const net = require('net');
const crypto = require('crypto');

const UUID = Buffer.from("6ba22d88-7b51-4f99-a799-2c567f448899".replace(/-/g, ""), "hex");
const PORT = process.env.PORT || 3000; // 必须用Render分配的端口

const server = net.createServer((client) => {
  let stage = 0;
  let remote = null;
  let host, port;

  client.on('data', (data) => {
    try {
      if (stage === 0) {
        if (data[0] !== 0x01) return client.destroy();
        const iv = data.slice(1, 17);
        const payload = data.slice(17);
        const decipher = crypto.createDecipheriv('aes-128-cfb', UUID, iv);
        decipher.setAutoPadding(false);
        const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
        host = decrypted.slice(2, 2+decrypted.readUInt16BE(0));
        stage = 1;
        client.write(Buffer.from([0x01, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0, 0]));
        remote = net.createConnection({host, port}, () => {
          stage = 2;
        });
        remote.on('data', (chunk) => { if (stage === 2) client.write(chunk); });
        remote.on('close', () => client.destroy());
        remote.on('error', () => client.destroy());
      } else if (stage === 2 && remote) {
        remote.write(data);
      }
    } catch (e) {
      client.destroy();
    }
  });

  client.on('close', () => remote && remote.destroy());
  client.on('error', () => {});
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ VMess已启动，监听端口：${PORT}`);
});
