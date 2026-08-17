# ⚡ Drakotec - Sistema Web de Ventas, Servicios Técnicos y Reservas

Drakotec es una plataforma web completa desarrollada para la gestión comercial de ventas de tecnología, cotizaciones de reparación en tiempo real, seguimiento de órdenes técnicas, reservaciones de catálogo y módulo contable POS.

---

## 🚀 Características Principales

- **Tienda Virtual y Catálogo**: Vista de productos con soporte para múltiples fotografías, especificaciones técnicas y carrito de reservas.
- **Cotizador de Reparaciones**: Cálculo inmediato de presupuestos por marca, modelo y tipo de falla con redirección directa al Chat en Vivo.
- **Rastreador de Órdenes Técnicas**: Seguimiento en línea con número de ticket para conocer el progreso de reparación de equipos.
- **Ticket Virtual de Reserva (48h)**: Emisión de comprobantes con temporizador de cuenta regresiva en tiempo real e impresión/descarga en PDF.
- **Panel de Administración Todo en Uno**:
  - Gestión de inventario de productos.
  - Seguimiento de órdenes de laboratorio técnico.
  - Módulo Contable (Caja chica, ingresos, gastos y venta presencial POS).
  - Chat de Atención Messenger en tiempo real (Cliente <-> Admin).
  - Módulo de Copias de Seguridad (Exportación e Importación de respaldos `.ZIP` con base de datos e imágenes).

---

## 🛠️ Tecnologías Utilizadas

- **Backend**: Node.js, Express.js.
- **Base de Datos**: MongoDB con Mongoose ORM.
- **Empaquetado y Archivos**: Multer, Archiver, Unzipper.
- **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism), JavaScript ES6.

---

## 📦 Instalación y Configuración Local

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/drakotec.git
   cd drakotec
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:
   ```env
   MONGO_DB_URL=mongodb://localhost:27017/drakotec
   PORT=5500
   ```

4. **Iniciar el servidor**:
   ```bash
   npm start
   # o para modo desarrollo:
   npm run dev
   ```

5. **Acceder en el navegador**:
   Abre [http://localhost:5500](http://localhost:5500) en tu navegador web.

---

## 📝 Licencia

Este proyecto está bajo la licencia ISC. Desarrollado para la gestión tecnológica comercial.
