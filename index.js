const http = require('http');
const crypto = require('crypto');
const net = require('net');

// 自动取平台端口
const PORT = process.env.PORT;
// 固定UUID 永久不变
const UUID = "6ba22d88-7b51-4f99-a799-2c567f448899";

const server = http.createServer((req, res) => {
  const host = req.headers.host;
  const vmessData = {
    v: "2",
    ps: "Railway节点",
    add: host.split(':')[0],
    port: host.split(':')[1],
    id: UUID,
    aid: "0",
    scy: "auto",
    net: "tcp",
    type: "none",
    tls: ""
  };
  const vmess = `vmess://${Buffer.from(JSON.stringify(vmessData)).toString('base64')}`;
  res.setHeader('Content-Type','text/html');
  res.end(`<h3>VMess一键复制</h3><div>${vmess}</div>`);
});

// VMess 处理
server.on('connection', socket => {
  socket.once('data', d=>{
    if(d[0]!==0x01) return;
    let iv = d.slice(1,17);
    let key = crypto.createHash('md5').update(UUID).digest();
    let dec = crypto.createDecipheriv('aes-128-cfb',key,iv);
    let raw = Buffer.concat([dec.update(d.slice(17)),dec.final()]);
    let at = raw[4],host,port;
    if(at===1){
      host = `${raw[5]}.${raw[6]}.${raw[7]}.${raw[8]}`;
      port = raw.readUInt16BE(9);
    }else if(at===2){
      let l = raw[5];
      host = raw.slice(6,6+l).toString();
      port = raw.readUInt16BE(6+l);
    }else return socket.destroy();
    let t = net.connect(port,host,()=>{
      t.write(raw.slice(at===1?11:8+l));
      t.pipe(socket);socket.pipe(t);
    });
    t.on('error',()=>socket.destroy());
  });
});

server.listen(PORT,'0.0.0.0',()=>{
  console.log('✅自动端口启动:',PORT);
  console.log('✅固定UUID:',UUID);
});

// 3分钟保活
setInterval(()=>{
  http.get(`http://127.0.0.1:${PORT}`).on('error',()=>{});
}, 180000);
