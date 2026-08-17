const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { type: String, required: true }, // 'client' o 'admin'
    text: { type: String, required: true },
    time: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    messages: [messageSchema],
    unreadAdmin: { type: Number, default: 0 },
    unreadClient: { type: Number, default: 0 },
    lastTime: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema);
