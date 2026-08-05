const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    clientName: { type: String, required: true },
    clientPhone: { type: String, required: true },
    items: [
        {
            productId: { type: Number, required: true },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true }
        }
    ],
    status: {
        type: String,
        required: true,
        enum: ['activa', 'liberada', 'completada'],
        default: 'activa'
    },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
});

module.exports = mongoose.model('Reserva', reservaSchema);
