const mongoose = require('mongoose');

const MovimientoSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['INGRESO', 'GASTO'],
        required: true
    },
    categoria: {
        type: String,
        enum: ['VENTA_PRESENCIAL', 'VENTA_WEB', 'RESERVA', 'REPARACION', 'GASTO_OPERATIVO', 'OTRO'],
        default: 'VENTA_PRESENCIAL'
    },
    monto: {
        type: Number,
        required: true
    },
    metodoPago: {
        type: String,
        enum: ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'QR'],
        default: 'EFECTIVO'
    },
    descripcion: {
        type: String,
        required: true
    },
    referenciaId: {
        type: String,
        default: null
    },
    comprobanteNum: {
        type: String,
        default: null
    },
    cliente: {
        nombre: { type: String, default: 'Cliente General' },
        docIdentidad: { type: String, default: '' }
    },
    usuario: {
        type: String,
        default: 'Admin / Caja'
    }
}, { timestamps: true });

module.exports = mongoose.model('Movimiento', MovimientoSchema);
