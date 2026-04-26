const socksv5 = require('socksv5');

const PORT = process.env.PORT || 3000;
const USER = "long";
const PWD = "123456";

// 创建代理服务器
const server = socksv5.createServer({
  auths: [
    socksv5.auth.UserPassword(USER, PWD)
  ]
});

// 让代理服务器同时处理 HTTP 请求（浏览器访问也能返回网页）
server.on('request', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <h1>✅ 服务正常运行</h1>
    <p>SOCKS5 代理已就绪</p>
    <p>用户名: ${USER}</p>
    <p>密码: ${PWD}</p>
  `);
});

// 只监听 3000 这一个端口
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务启动成功，端口: ${PORT}`);
});
