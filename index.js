const express = require('express');
const socksv5 = require('socksv5');
const app = express();

// 自动获取 Railway 端口
const PORT = process.env.PORT || 3000;
const USER = "long";
const PWD = "123456";

// Web保活页面
app.get('/', (req, res) => {
  res.send(`✅ 代理服务运行正常 | 账号: ${USER}`);
});

// 启动带账号密码的 SOCKS5 代理
const server = socksv5.createServer({
  auths: [
    socksv5.auth.UserPassword(USER, PWD)
  ]
});

// 关键：让 Web 和 SOCKS5 共用一个端口，通过 HTTP CONNECT 协议兼容
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SOCKS5 代理启动成功，端口: ${PORT}`);
});

// 让 Express 也挂载到这个服务上，共用端口
app.use((req, res) => {
  res.send(`✅ 服务正常运行 | SOCKS5 代理已就绪`);
});
