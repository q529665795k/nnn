const express = require('express');
const { SocksServer } = require('socks');
const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN || 'your-domain.up.railway.app';

// SOCKS5 代理服务
const socksServer = new SocksServer({ allowCommand: true, auths: [] });
socksServer.listen(1080, '0.0.0.0', () => {
  console.log('SOCKS5 代理已启动，端口 1080');
});

// 节点复制页面
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
app.listen(PORT, () => {
  console.log('节点页面运行在端口:', PORT);
});
