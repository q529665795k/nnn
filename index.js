const express = require('express');
const socksv5 = require('socksv5');
const app = express();

// 端口配置
const PORT = process.env.PORT || 3000;
const USER = "long";
const PWD = "123456";

// 1. Web保活服务（只负责返回网页，防止休眠）
app.get('/', (req, res) => {
  res.send(`
    <h1>✅ 服务正常运行</h1>
    <p>SOCKS5 代理已就绪</p>
    <p>用户名: ${USER}</p>
    <p>密码: ${PWD}</p>
  `);
});

// 2. 启动 SOCKS5 代理
const proxyServer = socksv5.createServer({
  auths: [
    socksv5.auth.UserPassword(USER, PWD)
  ]
});

// 启动 Web 服务
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Web保活服务启动成功，端口: ${PORT}`);
});

// 启动 SOCKS5 代理，监听 1080 端口
proxyServer.listen(1080, '0.0.0.0', () => {
  console.log(`✅ SOCKS5 代理启动成功，端口: 1080`);
});
