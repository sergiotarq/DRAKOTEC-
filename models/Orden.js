const mongoose = require('mongoose');

const ordenSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    client: { type: String, required: true },
    phone: { type: String, default: '' },
    deviceType: { type: String, default: 'Celular' },
    brandModel: { type: String, required: true },
    imei: { type: String, default: '' },
    physicalState: { type: String, default: 'Rayones leves' },
    accessories: { type: String, default: 'Ninguno' },
    issues: { type: String, required: true },
    pattern: { type: String, default: 'Sin Patrón' },
    pin: { type: String, default: 'Sin PIN' },
    status: { 
        type: String, 
        required: true, 
        enum: ['recibido', 'diagnostico', 'reparacion', 'listo', 'entregado'],
        default: 'recibido'
    },
    laborCost: { type: Number, default: 0 },
    partsCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    surcharge: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Orden', ordenSchema);
