const express = require('express');
const socksv5 = require('socksv5');
const app = express();

// 自动获取 Railway 端口，优先环境变量，没有就默认3000
const PORT = process.env.PORT || 3000;
const USER = "long";
const PWD = "123456";

// Web保活首页，防休眠
app.get('/', (req, res) => {
  res.send(`
    <h2>代理服务正常运行</h2>
    <p>SOCKS5 账号密码认证</p>
    <p>用户名：${USER}</p>
    <p>密码：${PWD}</p>
  `);
});

// 创建带账号密码的 SOCKS5 代理
const proxyServer = socksv5.createServer({
  auths: [
    socksv5.auth.UserPassword(USER, PWD)
  ]
});

// 代理监听全网段 + 自动端口
proxyServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SOCKS5 代理启动成功`);
  console.log(`✅ 监听端口: ${PORT}`);
  console.log(`✅ 认证账号: ${USER} / 密码: ${PWD}`);
});

// Web服务同端口运行
app.listen(PORT, '0.0.0.0');
