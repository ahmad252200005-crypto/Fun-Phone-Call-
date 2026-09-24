const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// خريطة لتخزين المستخدمين المتصلين (المعرف -> socket.id)
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log(`مستخدم متصل: ${socket.id}`);

    // تسجيل مستخدم برقم معين
    socket.on('register', (userId) => {
        connectedUsers.set(userId, socket.id);
        console.log(`تم تسجيل: ${userId}`);
        socket.emit('registered', { status: 'success', userId });
    });

    // طلب إجراء مكالمة
    socket.on('call-user', (data) => {
        const targetSocketId = connectedUsers.get(data.targetId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('incoming-call', { 
                callerId: data.callerId, 
                offer: data.offer 
            });
        } else {
            socket.emit('call-error', { message: 'الرقم المستهدف غير متصل حالياً.' });
        }
    });

    // قبول المكالمة
    socket.on('answer-call', (data) => {
        io.to(data.callerSocketId).emit('call-accepted', { answer: data.answer });
    });

    // تبادل مرشحات ICE
    socket.on('ice-candidate', (data) => {
        io.to(data.targetSocketId).emit('ice-candidate', { candidate: data.candidate });
    });

    // عند قطع الاتصال
    socket.on('disconnect', () => {
        for (let [userId, socketId] of connectedUsers.entries()) {
            if (socketId === socket.id) { 
                connectedUsers.delete(userId); 
                console.log(`تم قطع اتصال: ${userId}`);
                break; 
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
});