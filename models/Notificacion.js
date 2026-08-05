const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema({
    type: { type: String, required: true }, // e.g. 'vencimiento_reserva'
    recipientName: { type: String, required: true },
    recipientPhone: { type: String, required: true },
    message: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    status: { type: String, default: 'Enviado' }
});

module.exports = mongoose.model('Notificacion', notificacionSchema);
