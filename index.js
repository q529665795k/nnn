const net = require('net');
const server = net.createServer();

// 只读官方唯一端口变量
const port = process.env.PORT;

server.listen(port, '0.0.0.0', () => {
  console.log('✅ TCP 监听成功 端口：', port);
});

server.on('error', e => console.log('❌ 错误：', e.message));
