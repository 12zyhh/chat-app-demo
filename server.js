const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let users = {};

io.on('connection', (socket) => {
    let clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    if (clientIp.substr(0, 7) == "::ffff:") clientIp = clientIp.substr(7);
    if (clientIp === '::1') clientIp = '127.0.0.1';

    // 随机生成更有趣的名字
    const adjectives = ['快乐', '神秘', '极速', '呆萌', '这种', '那位'];
    const nouns = ['考拉', '极客', '路人', '大师', '浣熊', '七号'];
    const defaultName = `${adjectives[Math.floor(Math.random()*adjectives.length)]}的${nouns[Math.floor(Math.random()*nouns.length)]}`;
    
    users[socket.id] = { name: defaultName, ip: clientIp };

    socket.emit('system', { text: `👋 欢迎来到极光聊天室！`, name: users[socket.id].name });
    socket.broadcast.emit('system', { text: `${users[socket.id].name} 滑入了聊天室` });

    socket.on('changeName', (newName) => {
        const oldName = users[socket.id].name;
        users[socket.id].name = newName;
        io.emit('system', { text: `📝 [${oldName}] 改名为 [${newName}]` });
    });

    // 接收消息 (新增 type 字段)
    socket.on('chat message', (data) => {
        const user = users[socket.id];
        io.emit('chat message', {
            id: socket.id,
            name: user.name,
            ip: user.ip,
            content: data.content,   // 内容
            type: data.type || 'text', // 类型：text 或 sticker
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    socket.on('typing', () => {
        socket.broadcast.emit('displayTyping', { name: users[socket.id].name });
    });

    socket.on('stopTyping', () => {
        socket.broadcast.emit('hideTyping');
    });

    socket.on('disconnect', () => {
        if(users[socket.id]) {
            socket.broadcast.emit('system', { text: `${users[socket.id].name} 离开了` });
            delete users[socket.id];
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});