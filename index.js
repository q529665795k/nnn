const express = require('express');
const Socks5Server = require('node-socks5-server');
const app = express();

// Railway 分配的主端口（给Web服务用）
const WEB_PORT = process.env.PORT || 3000;
// 代理端口固定为 1080（不抢主端口）
const SOCKS_PORT = 1080;

const USER = "long";
const PWD = "123456";

// Web保活页面
app.get('/', (req, res) => {
  res.send(`✅ 服务正常运行 | SOCKS5 代理已就绪`);
});

// 启动SOCKS5代理
const proxyServer = new Socks5Server({
  port: SOCKS_PORT,
  host: '0.0.0.0',
  auths: [
    Socks5Server.auth.UserPassword(USER, PWD)
  ]
});

proxyServer.listen(() => {
  console.log(`✅ SOCKS5代理启动成功，端口: ${SOCKS_PORT}`);
});

// Web服务绑定主端口
app.listen(WEB_PORT, '0.0.0.0', () => {
  console.log(`✅ Web保活服务启动成功，端口: ${WEB_PORT}`);
});
