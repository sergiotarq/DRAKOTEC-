require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');

// Cargar Modelos Mongoose
const Producto = require('./models/Producto');
const Orden = require('./models/Orden');
const Reserva = require('./models/Reserva');
const Notificacion = require('./models/Notificacion');
const Movimiento = require('./models/Movimiento');



const app = express();
const PORT = process.env.PORT || 5500;

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_DB_URL)
    .then(() => console.log('✅ Conectado a MongoDB'))
    .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Servir la carpeta raíz y el directorio de subidas de forma estática
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Asegurarse de que el directorio de uploads exista al iniciar
async function ensureUploadsDir() {
    try {
        await fs.mkdir(path.join(__dirname, 'public/uploads'), { recursive: true });
    } catch (err) {
        console.error("Error al crear carpeta de subidas:", err);
    }
}
ensureUploadsDir();

// ==========================================
// CONFIGURACIÓN DE MULTER (Subida de Imágenes)
// ==========================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public/uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Validar tipo MIME (JPG o PNG)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato de imagen inválido. Solo se admiten JPG/PNG.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 Megabytes máximo
    }
});

// ==========================================
// FUNCIONES AUXILIARES DE BASE DE DATOS
// ==========================================

// Genera un código de orden único alfanumérico en MongoDB
async function generateUniqueCode() {
    const chars = '0123456789ABCDEF';
    let code;
    let isUnique = false;
    
    while (!isUnique) {
        let codeSegment = '';
        for (let i = 0; i < 4; i++) {
            codeSegment += chars[Math.floor(Math.random() * chars.length)];
        }
        code = `DRAKO-${codeSegment}`;
        const exists = await Orden.findOne({ code });
        if (!exists) {
            isUnique = true;
        }
    }
    return code;
}

// ==========================================
// ENDPOINTS DE AUTENTICACIÓN
// ==========================================
app.post('/api/login', (req, res) => {
    const { role, password } = req.body;
    
    if (!role || !password) {
        return res.status(400).json({ error: 'Rol y contraseña son requeridos' });
    }

    if (role === 'tecnico' && password === 'tecnico123') {
        return res.json({ name: 'Técnico Drakotec', role: 'tecnico', token: 'mock-tec-session-token' });
    } else if (role === 'admin' && password === 'admin123') {
        return res.json({ name: 'Administrador Drakotec', role: 'admin', token: 'mock-admin-session-token' });
    }

    return res.status(401).json({ error: 'Credenciales incorrectas' });
});

// ==========================================
// ENDPOINTS API: PRODUCTOS
// ==========================================

// Obtener todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find({});
        res.json(productos);
    } catch (err) {
        res.status(500).json({ error: 'Error al leer productos de la base de datos' });
    }
});

// Crear un producto (TEC-U01 - Rol: Admin)
app.post('/api/productos', (req, res, next) => {
    // Usar multer para subir las imágenes (máximo 5)
    upload.array('imagenes', 5)(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Una de las imágenes excede el límite de 5MB' });
            }
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const { name, price, stock, category, specs } = req.body;
        const parsedPrice = parseFloat(price);
        const parsedStock = parseInt(stock);

        // Validación estricta en el servidor
        const errors = [];
        if (!name || name.trim() === "") errors.push("El nombre es requerido");
        if (isNaN(parsedPrice) || parsedPrice < 0) errors.push("El precio debe ser un número mayor o igual a 0");
        if (isNaN(parsedStock) || parsedStock < 0) errors.push("El stock debe ser un entero mayor o igual a 0");
        if (!category) errors.push("La categoría es requerida");
        if (!specs || specs.trim() === "") errors.push("La ficha técnica es requerida");
        if (!req.files || req.files.length === 0) errors.push("Debe subir al menos una imagen para el producto");

        if (errors.length > 0) {
            // Si hay errores, borrar archivos subidos
            if (req.files) {
                for (const file of req.files) {
                    await fs.unlink(file.path).catch(() => {});
                }
            }
            return res.status(400).json({ errors });
        }

        // Generar ID correlativo
        const maxProduct = await Producto.findOne().sort({ id: -1 });
        const nextId = maxProduct ? maxProduct.id + 1 : 1;

        const imagePaths = req.files.map(file => `/uploads/${path.basename(file.path)}`);

        const nuevoProducto = new Producto({
            id: nextId,
            name: name.trim(),
            category: category.trim(),
            price: parsedPrice,
            stock: parsedStock,
            specs: specs.trim(),
            imagePath: imagePaths[0],
            images: imagePaths
        });

        await nuevoProducto.save();

        res.status(201).json({ message: 'Producto publicado con éxito', producto: nuevoProducto });
    } catch (err) {
        console.error(err);
        if (req.files) {
            for (const file of req.files) {
                await fs.unlink(file.path).catch(() => {});
            }
        }
        res.status(500).json({ error: 'Error interno del servidor al publicar producto' });
    }
});

// Actualizar un producto (TEC-U01 - Rol: Admin)
app.put('/api/productos/:id', (req, res, next) => {
    upload.array('imagenes', 5)(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Una de las imágenes excede el límite de 5MB' });
            }
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, price, stock, category, specs } = req.body;
        const parsedPrice = parseFloat(price);
        const parsedStock = parseInt(stock);

        const prod = await Producto.findOne({ id });

        if (!prod) {
            if (req.files) {
                for (const file of req.files) {
                    await fs.unlink(file.path).catch(() => {});
                }
            }
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Validaciones
        const errors = [];
        if (!name || name.trim() === "") errors.push("El nombre es requerido");
        if (isNaN(parsedPrice) || parsedPrice < 0) errors.push("El precio debe ser un número mayor o igual a 0");
        if (isNaN(parsedStock) || parsedStock < 0) errors.push("El stock debe ser un entero mayor o igual a 0");
        if (!category) errors.push("La categoría es requerida");
        if (!specs || specs.trim() === "") errors.push("La ficha técnica es requerida");

        if (errors.length > 0) {
            if (req.files) {
                for (const file of req.files) {
                    await fs.unlink(file.path).catch(() => {});
                }
            }
            return res.status(400).json({ errors });
        }

        // Editar producto existente
        prod.name = name.trim();
        prod.category = category.trim();
        prod.price = parsedPrice;
        prod.stock = parsedStock;
        prod.specs = specs.trim();

        // Si se cargaron nuevas imágenes, reemplazar las anteriores
        if (req.files && req.files.length > 0) {
            // Borrar fotos anteriores
            const oldImages = prod.images && prod.images.length > 0 ? prod.images : [prod.imagePath];
            for (const imgPath of oldImages) {
                if (imgPath && !imgPath.includes('/uploads/iphone') && !imgPath.includes('/uploads/s24')) {
                    const oldPath = path.join(__dirname, 'public', imgPath);
                    await fs.unlink(oldPath).catch(() => {});
                }
            }

            const imagePaths = req.files.map(file => `/uploads/${path.basename(file.path)}`);
            prod.imagePath = imagePaths[0];
            prod.images = imagePaths;
        }

        await prod.save();

        res.json({ message: 'Producto actualizado con éxito', producto: prod });
    } catch (err) {
        console.error(err);
        if (req.files) {
            for (const file of req.files) {
                await fs.unlink(file.path).catch(() => {});
            }
        }
        res.status(500).json({ error: 'Error interno del servidor al actualizar producto' });
    }
});

// Eliminar un producto (TEC-U01 - Rol: Admin)
app.delete('/api/productos/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const prod = await Producto.findOne({ id });

        if (!prod) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Borrar archivos de imagen asociados
        const imagesToDelete = prod.images && prod.images.length > 0 ? prod.images : [prod.imagePath];
        for (const imgPath of imagesToDelete) {
            if (imgPath && !imgPath.includes('/uploads/iphone') && !imgPath.includes('/uploads/s24')) {
                const oldPath = path.join(__dirname, 'public', imgPath);
                await fs.unlink(oldPath).catch(() => {});
            }
        }

        await Producto.deleteOne({ id });

        res.json({ message: 'Producto eliminado con éxito' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor al eliminar producto' });
    }
});


// Reservar stock de productos
app.post('/api/productos/reservar', async (req, res) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Lista de items inválida' });
    }
    try {
        for (const item of items) {
            const prod = await Producto.findOne({ id: item.id });
            if (prod) {
                prod.stock = Math.max(0, prod.stock - item.quantity);
                await prod.save();
            }
        }
        res.json({ message: 'Stock reservado con éxito en la base de datos' });
    } catch (err) {
        console.error("Error al reservar stock:", err);
        res.status(500).json({ error: 'Error al actualizar el stock en la base de datos' });
    }
});

// Liberar stock de productos por vencimiento de reserva (48 horas)
app.post('/api/productos/liberar', async (req, res) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Lista de items inválida' });
    }
    try {
        for (const item of items) {
            const prod = await Producto.findOne({ id: item.id });
            if (prod) {
                prod.stock += item.quantity;
                await prod.save();
            }
        }
        res.json({ message: 'Stock liberado y restaurado en la base de datos' });
    } catch (err) {
        console.error("Error al liberar stock:", err);
        res.status(500).json({ error: 'Error al restaurar el stock en la base de datos' });
    }
});

// ==========================================
// ENDPOINTS API: ÓRDENES TÉCNICAS (TEC-A01)
// ==========================================

// Obtener todas las órdenes
app.get('/api/ordenes', async (req, res) => {
    try {
        const ordenes = await Orden.find({});
        res.json(ordenes);
    } catch (err) {
        res.status(500).json({ error: 'Error al leer las órdenes de la base de datos' });
    }
});

// Crear una orden (TEC-A01 - Rol: Técnico)
app.post('/api/ordenes', async (req, res) => {
    try {
        const { client, brandModel, issues, accessories } = req.body;

        // Validación estricta en el servidor
        const errors = [];
        if (!client || client.trim() === "") errors.push("El nombre del cliente es obligatorio");
        if (!brandModel || brandModel.trim() === "") errors.push("La marca y modelo son obligatorios");
        if (!issues || issues.trim() === "") errors.push("El detalle de las fallas es obligatorio");

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const code = await generateUniqueCode();

        const nuevaOrden = new Orden({
            code,
            client: client.trim(),
            brandModel: brandModel.trim(),
            issues: issues.trim(),
            accessories: accessories ? accessories.trim() : "Ninguno",
            status: "recibido", // Estado inicial
            createdAt: new Date()
        });

        await nuevaOrden.save();

        res.status(201).json({ message: 'Orden técnica registrada con éxito', orden: nuevaOrden });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno al registrar la orden' });
    }
});

// Actualizar el estado de una orden
app.put('/api/ordenes/:code', async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        const { status } = req.body;

        const allowedStatus = ['recibido', 'diagnostico', 'reparacion', 'listo'];
        if (!status || !allowedStatus.includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        const orden = await Orden.findOne({ code });

        if (!orden) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        orden.status = status;
        await orden.save();

        res.json({ message: 'Estado de orden actualizado', orden });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno al actualizar la orden' });
    }
});

// Eliminar una orden (Rol: Admin)
app.delete('/api/ordenes/:code', async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        await Orden.deleteOne({ code });
        res.json({ message: `Orden ${code} eliminada con éxito` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar la orden' });
    }
});

// ==========================================
// ENDPOINTS API: RESERVAS Y NOTIFICACIONES
// ==========================================

// Obtener todas las reservas
app.get('/api/reservas', async (req, res) => {
    try {
        const reservas = await Reserva.find({}).sort({ createdAt: -1 });
        res.json(reservas);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener las reservas de la base de datos' });
    }
});

// Crear una reserva
app.post('/api/reservas', async (req, res) => {
    try {
        const { code, clientName, clientPhone, items, expiresAt } = req.body;

        // Validaciones
        if (!clientName || !clientPhone || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Datos de la reserva incompletos o inválidos' });
        }

        // Validar stock antes de realizar descuento
        for (const item of items) {
            const prod = await Producto.findOne({ id: item.productId });
            if (!prod) {
                return res.status(404).json({ error: `Producto con ID ${item.productId} no encontrado` });
            }
            if (prod.stock < item.quantity) {
                return res.status(400).json({ error: `Stock insuficiente para el producto ${prod.name}` });
            }
        }

        // Descontar stock
        for (const item of items) {
            const prod = await Producto.findOne({ id: item.productId });
            prod.stock = Math.max(0, prod.stock - item.quantity);
            await prod.save();
        }

        const nuevaReserva = new Reserva({
            code,
            clientName,
            clientPhone,
            items,
            expiresAt: new Date(expiresAt),
            status: 'activa',
            createdAt: new Date()
        });

        await nuevaReserva.save();
        res.status(201).json({ message: 'Reserva registrada con éxito', reserva: nuevaReserva });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno al registrar la reserva' });
    }
});

// Liberar reserva manualmente
app.post('/api/reservas/:code/liberar', async (req, res) => {
    try {
        const { code } = req.params;
        const resv = await Reserva.findOne({ code });
        if (!resv) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }
        if (resv.status !== 'activa') {
            return res.status(400).json({ error: `La reserva no está activa. Estado actual: ${resv.status}` });
        }

        resv.status = 'liberada';
        await resv.save();

        // Devolver stock
        for (const item of resv.items) {
            const prod = await Producto.findOne({ id: item.productId });
            if (prod) {
                prod.stock += item.quantity;
                await prod.save();
            }
        }

        res.json({ message: 'Reserva liberada con éxito', reserva: resv });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al liberar la reserva' });
    }
});

// Completar reserva manualmente (Venta realizada)
app.post('/api/reservas/:code/completar', async (req, res) => {
    try {
        const { code } = req.params;
        const resv = await Reserva.findOne({ code });
        if (!resv) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }
        if (resv.status !== 'activa') {
            return res.status(400).json({ error: `La reserva no está activa. Estado actual: ${resv.status}` });
        }

        resv.status = 'completada';
        await resv.save();

        res.json({ message: 'Reserva completada con éxito', reserva: resv });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al completar la reserva' });
    }
});

// Eliminar reserva (Solo si está completada o liberada)
app.delete('/api/reservas/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const resv = await Reserva.findOne({ code });
        if (!resv) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }
        if (resv.status === 'activa') {
            return res.status(400).json({ error: 'No se puede eliminar una reserva ACTIVA. Debes completarla o liberarla primero.' });
        }

        await Reserva.deleteOne({ code });
        res.json({ message: 'Reserva eliminada con éxito del sistema' });
    } catch (err) {
        console.error("Error al eliminar reserva:", err);
        res.status(500).json({ error: 'Error interno al eliminar la reserva' });
    }
});

// Obtener notificaciones de WhatsApp (historial)
app.get('/api/notificaciones', async (req, res) => {
    try {
        const notificaciones = await Notificacion.find({}).sort({ sentAt: -1 });
        res.json(notificaciones);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener el historial de notificaciones' });
    }
});

// Hilo de verificación automática de reservas vencidas (Cada 30 segundos)
setInterval(async () => {
    try {
        // Verificar que la conexión a MongoDB esté lista antes de hacer la consulta
        if (mongoose.connection.readyState !== 1) return;

        const now = new Date();
        const expired = await Reserva.find({ status: 'activa', expiresAt: { $lte: now } });

        for (const resv of expired) {
            resv.status = 'liberada';
            await resv.save();

            // Devolver stock
            for (const item of resv.items) {
                const prod = await Producto.findOne({ id: item.productId });
                if (prod) {
                    prod.stock += item.quantity;
                    await prod.save();
                }
            }

            // Enviar notificación automática por WhatsApp (Simulada/Registrada)
            const cleanPhone = resv.clientPhone.replace(/[^0-9]/g, '');
            const msg = `Hola *${resv.clientName}*, su reserva *${resv.code}* por el producto *${resv.items.map(i => i.name).join(', ')}* ha expirado después del límite de 48 horas. El stock ha sido liberado nuevamente al catálogo. ¡Saludos, Drakotec!`;
            
            const notif = new Notificacion({
                type: 'vencimiento_reserva',
                recipientName: resv.clientName,
                recipientPhone: cleanPhone,
                message: msg,
                sentAt: new Date(),
                status: 'Enviado'
            });
            await notif.save();

            console.log(`[WHATSAPP AUTOMÁTICO - RESERVA EXPIRADA] Enviado a ${cleanPhone}: "${msg}"`);
        }
    } catch (err) {
        console.error("Error al procesar reservas vencidas:", err);
    }
}, 30000);

// ==========================================
// ENDPOINTS DE CAJA Y CONTABILIDAD (MOVIMIENTOS & POS)
// ==========================================

// Obtener todos los movimientos contables
app.get('/api/movimientos', async (req, res) => {
    try {
        const movimientos = await Movimiento.find({}).sort({ createdAt: -1 });
        res.json(movimientos);
    } catch (err) {
        console.error("Error al obtener movimientos:", err);
        res.status(500).json({ error: 'Error al obtener movimientos de la base de datos' });
    }
});

// Registrar un movimiento manual (Gasto u otro Ingreso)
app.post('/api/movimientos', async (req, res) => {
    try {
        const { tipo, categoria, monto, metodoPago, descripcion, cliente } = req.body;
        if (!tipo || !monto || !descripcion) {
            return res.status(400).json({ error: 'Tipo, monto y descripción son obligatorios' });
        }

        const movimiento = new Movimiento({
            tipo,
            categoria: categoria || 'GASTO_OPERATIVO',
            monto: parseFloat(monto),
            metodoPago: metodoPago || 'EFECTIVO',
            descripcion,
            cliente: cliente || { nombre: 'General', docIdentidad: '' }
        });

        await movimiento.save();
        res.status(201).json({ message: 'Movimiento registrado con éxito', movimiento });
    } catch (err) {
        console.error("Error al guardar movimiento:", err);
        res.status(500).json({ error: 'Error al registrar el movimiento' });
    }
});

// Editar un movimiento contable existente
app.put('/api/movimientos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { monto, descripcion, metodoPago, categoria } = req.body;
        const movimiento = await Movimiento.findById(id);

        if (!movimiento) {
            return res.status(404).json({ error: 'Movimiento no encontrado' });
        }

        if (monto !== undefined) movimiento.monto = parseFloat(monto);
        if (descripcion !== undefined) movimiento.descripcion = descripcion;
        if (metodoPago !== undefined) movimiento.metodoPago = metodoPago;
        if (categoria !== undefined) movimiento.categoria = categoria;

        await movimiento.save();
        res.json({ message: 'Movimiento actualizado correctamente', movimiento });
    } catch (err) {
        console.error("Error al editar movimiento:", err);
        res.status(500).json({ error: 'Error al editar el movimiento' });
    }
});

// Eliminar un movimiento contable existente
app.delete('/api/movimientos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Movimiento.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({ error: 'Movimiento no encontrado' });
        }
        res.json({ message: 'Movimiento eliminado correctamente' });
    } catch (err) {
        console.error("Error al eliminar movimiento:", err);
        res.status(500).json({ error: 'Error al eliminar el movimiento' });
    }
});


// Procesar Venta Presencial (POS) con emisión de Factura / Ticket
app.post('/api/ventas-presenciales', async (req, res) => {
    try {
        const { items, metodoPago, cliente, tipoComprobante, total, reservaCode } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Debe incluir al menos un producto para la venta.' });
        }

        // Generar número de comprobante único
        const count = await Movimiento.countDocuments();
        const comprobanteNum = `${tipoComprobante === 'FACTURA' ? 'FAC' : 'TCK'}-${String(count + 1).padStart(5, '0')}`;

        // 1. Validar y descontar stock
        let detalleDesc = [];
        for (const item of items) {
            const prod = await Producto.findOne({ id: item.id });
            if (!prod) {
                return res.status(400).json({ error: `Producto ${item.name || item.id} no fue encontrado.` });
            }
            if (prod.stock < item.quantity) {
                return res.status(400).json({ error: `Stock insuficiente para ${prod.name}. Disponible: ${prod.stock}` });
            }
            prod.stock -= item.quantity;
            await prod.save();

            detalleDesc.push(`${item.quantity}x ${prod.name}`);
        }

        // 2. Si viene de una reserva, marcar reserva como completada
        if (reservaCode) {
            const resv = await Reserva.findOne({ code: reservaCode });
            if (resv && resv.status === 'activa') {
                resv.status = 'completada';
                await resv.save();
            }
        }

        // 3. Registrar Movimiento Contable
        const descCompleta = `Venta Presencial (${tipoComprobante || 'TICKET'}) #${comprobanteNum}: ${detalleDesc.join(', ')}`;
        const nuevoMovimiento = new Movimiento({
            tipo: 'INGRESO',
            categoria: reservaCode ? 'RESERVA' : 'VENTA_PRESENCIAL',
            monto: parseFloat(total),
            metodoPago: metodoPago || 'EFECTIVO',
            descripcion: descCompleta,
            comprobanteNum,
            cliente: {
                nombre: cliente?.nombre || 'Cliente General',
                docIdentidad: cliente?.docIdentidad || 'S/N'
            },
            referenciaId: reservaCode || null
        });

        await nuevoMovimiento.save();

        res.status(201).json({
            message: 'Venta presencial completada con éxito',
            comprobanteNum,
            movimiento: nuevoMovimiento
        });
    } catch (err) {
        console.error("Error al procesar venta presencial:", err);
        res.status(500).json({ error: 'Error interno al procesar la venta presencial.' });
    }
});

// ==========================================
// ENDPOINTS API: COPIAS DE SEGURIDAD (BACKUP & RESTORE CON IMÁGENES EN ZIP)
// ==========================================
const archiver = require('archiver');
const unzipper = require('unzipper');

// Configuración de multer temporal para restaurar archivos ZIP de backup
const backupUpload = multer({ dest: path.join(__dirname, 'public/uploads/temp') });

// Endpoint auxiliar: Obtener JSON de vista previa del backup
app.get('/api/backup/preview', async (req, res) => {
    try {
        const productos = await Producto.find({});
        const ordenes = await Orden.find({});
        const reservas = await Reserva.find({});
        const movimientos = await Movimiento.find({});
        const notificaciones = await Notificacion.find({});

        res.json({
            version: '1.0',
            exportedAt: new Date().toISOString(),
            system: 'Drakotec Store',
            summary: {
                totalProductos: productos.length,
                totalOrdenes: ordenes.length,
                totalReservas: reservas.length,
                totalMovimientos: movimientos.length,
                totalNotificaciones: notificaciones.length
            },
            data: {
                productos,
                ordenes,
                reservas,
                movimientos,
                notificaciones
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Error al generar la vista previa del backup.' });
    }
});

// 1. Exportar Backup Completo en ZIP (Datos JSON + Carpeta Uploads con Imágenes)
app.get('/api/backup', async (req, res) => {
    try {
        const productos = await Producto.find({});
        const ordenes = await Orden.find({});
        const reservas = await Reserva.find({});
        const movimientos = await Movimiento.find({});
        const notificaciones = await Notificacion.find({});

        const backupData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            system: 'Drakotec Store',
            summary: {
                totalProductos: productos.length,
                totalOrdenes: ordenes.length,
                totalReservas: reservas.length,
                totalMovimientos: movimientos.length,
                totalNotificaciones: notificaciones.length
            },
            data: {
                productos,
                ordenes,
                reservas,
                movimientos,
                notificaciones
            }
        };

        const tempZipPath = path.join(__dirname, 'public/uploads/temp', `backup_${Date.now()}.zip`);
        await fs.mkdir(path.dirname(tempZipPath), { recursive: true });
        
        const output = require('fs').createWriteStream(tempZipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            res.download(tempZipPath, `drakotec_full_backup_${Date.now()}.zip`, async (err) => {
                if (err) console.error("Error enviando archivo ZIP:", err);
                await fs.unlink(tempZipPath).catch(() => {});
            });
        });

        archive.on('error', (err) => {
            console.error("Error comprimiendo backup:", err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error al empaquetar copia de seguridad.' });
            }
        });

        archive.pipe(output);

        // Añadir archivo JSON de datos
        archive.append(JSON.stringify(backupData, null, 2), { name: 'backup.json' });

        // Añadir carpeta de imágenes de subidas si existe
        const uploadsPath = path.join(__dirname, 'public/uploads');
        try {
            await fs.access(uploadsPath);
            archive.directory(uploadsPath, 'uploads');
        } catch (dirErr) {
            console.warn("Carpeta de subidas vacía o inaccesible, continuando solo con base de datos:", dirErr.message);
        }

        await archive.finalize();
    } catch (err) {
        console.error("Error al exportar backup ZIP:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error al generar la copia de seguridad.' });
        }
    }
});

// 2. Restaurar Backup Completo (Acepta paquete ZIP o archivo JSON)
app.post('/api/backup/restore', backupUpload.single('backupFile'), async (req, res) => {
    try {
        let backupObj = null;

        if (req.file) {
            const filePath = req.file.path;
            
            // Si subieron un archivo ZIP
            if (req.file.originalname.endsWith('.zip') || req.file.mimetype.includes('zip')) {
                const directory = await unzipper.Open.file(filePath);
                
                // Extraer imágenes a public/uploads (creando carpeta si no existe)
                await fs.mkdir(path.join(__dirname, 'public/uploads'), { recursive: true });
                for (const file of directory.files) {
                    if (file.path.startsWith('uploads/')) {
                        const targetName = file.path.replace('uploads/', '');
                        if (targetName && targetName !== '.gitkeep') {
                            const destPath = path.join(__dirname, 'public/uploads', targetName);
                            const content = await file.buffer();
                            await fs.writeFile(destPath, content);
                        }
                    } else if (file.path === 'backup.json') {
                        const content = await file.buffer();
                        backupObj = JSON.parse(content.toString('utf-8'));
                    }
                }

                await fs.unlink(filePath).catch(() => {});
            } else {
                // Si subieron un archivo JSON directamente
                const fileContent = await fs.readFile(filePath, 'utf-8');
                backupObj = JSON.parse(fileContent);
                await fs.unlink(filePath).catch(() => {});
            }
        } else if (req.body.backup) {
            backupObj = req.body.backup;
        }

        if (!backupObj || !backupObj.data) {
            return res.status(400).json({ error: 'Formato de archivo de backup no válido o incompleto.' });
        }

        const { productos, ordenes, reservas, movimientos, notificaciones } = backupObj.data;

        if (Array.isArray(productos) && productos.length > 0) {
            await Producto.deleteMany({});
            await Producto.insertMany(productos);
        }

        if (Array.isArray(ordenes) && ordenes.length > 0) {
            await Orden.deleteMany({});
            await Orden.insertMany(ordenes);
        }

        if (Array.isArray(reservas) && reservas.length > 0) {
            await Reserva.deleteMany({});
            await Reserva.insertMany(reservas);
        }

        if (Array.isArray(movimientos) && movimientos.length > 0) {
            await Movimiento.deleteMany({});
            await Movimiento.insertMany(movimientos);
        }

        if (Array.isArray(notificaciones) && notificaciones.length > 0) {
            await Notificacion.deleteMany({});
            await Notificacion.insertMany(notificaciones);
        }

        res.json({ message: 'Base de datos e imágenes restauradas con éxito.' });
    } catch (err) {
        console.error("Error al restaurar backup:", err);
        res.status(500).json({ error: 'Error al restaurar el paquete de datos e imágenes.' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor Drakotec corriendo en: http://localhost:${PORT}`);
});


