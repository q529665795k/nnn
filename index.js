const express = require('express');
const https = require('https');
const socks = require('socksv5');
const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost';

console.log("=== 服务启动日志 ===");
console.log("PORT:", PORT);
console.log("DOMAIN:", DOMAIN);

// 网页服务（节点复制页面）
app.get('/', (req, res) => {
  const node = `socks5://${DOMAIN}:443`;
  res.send(`
    <html>
      <body style="text-align:center;padding-top:50px;background:#111;color:#fff">
        <h1>✅ 节点就绪</h1>
        <p>一键复制导入 V2RayNG</p>
        <textarea id="node" style="width:80%;height:100px;font-size:18px">${node}</textarea>
        <br><br>
        <button onclick="copy()" style="padding:15px 30px;font-size:18px;background:#6c38ff;color:#fff;border:none;border-radius:8px">复制节点</button>
        <script>
          function copy(){
            document.getElementById('node').select();
            document.execCommand('copy');
            alert('复制成功！直接粘贴到V2RayNG即可');
          }
        </script>
      </body>
    </html>
  `);
});

// 启动网页服务
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 网页服务已启动，监听端口 ${PORT}`);
  // 3分钟自ping保活
  setInterval(() => {
    if (DOMAIN && DOMAIN !== 'localhost') {
      https.get(`https://${DOMAIN}`, (res) => {
        console.log(`[保活ping] 状态码: ${res.statusCode}`);
      }).on('error', (err) => {
        console.error(`[保活ping] 失败: ${err.message}`);
      });
    }
  }, 3 * 60 * 1000);
});

// 启动 SOCKS5 代理服务（兼容 socksv5）
const socksServer = socks.createServer((info, accept, deny) => {
  accept();
});

socksServer.listen(1080, '0.0.0.0', () => {
  console.log('✅ SOCKS5 代理已启动，监听端口 1080');
});

socksServer.useAuth(socks.auth.None());
