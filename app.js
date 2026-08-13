/* ==========================================
   DRAKOTEC - INTERACTIVIDAD MULTI-PÁGINA
   ========================================== */

const API_URL = ''; // Ruta relativa para unificación de entornos

// SVGs Premium de Respaldo en caso de error de imagen
const SVGS_FALLBACK = {
    celulares: `
        <svg viewBox="0 0 120 180" width="100" height="120">
            <rect x="15" y="10" width="90" height="160" rx="18" fill="#1e1212" stroke="#dc2626" stroke-width="3"/>
            <rect x="18" y="13" width="84" height="154" rx="15" fill="#0f0505"/>
            <rect x="22" y="17" width="76" height="146" rx="11" fill="#381010"/>
            <rect x="45" y="22" width="30" height="7" rx="3.5" fill="#000"/>
        </svg>
    `,
    audio: `
        <svg viewBox="0 0 120 180" width="100" height="120">
            <path d="M 25 90 A 35 35 0 0 1 95 90" fill="none" stroke="#dc2626" stroke-width="6" stroke-linecap="round"/>
            <rect x="15" y="80" width="16" height="36" rx="8" fill="#1c1010" stroke="#d97706" stroke-width="2"/>
            <rect x="89" y="80" width="16" height="36" rx="8" fill="#1c1010" stroke="#d97706" stroke-width="2"/>
        </svg>
    `,
    smartwatches: `
        <svg viewBox="0 0 120 180" width="100" height="120">
            <rect x="46" y="15" width="28" height="150" rx="8" fill="#1c1010"/>
            <circle cx="60" cy="90" r="38" fill="#120a0a" stroke="#dc2626" stroke-width="3"/>
            <circle cx="60" cy="90" r="32" fill="#d97706" fill-opacity="0.8"/>
            <text x="60" y="94" fill="#ffffff" font-size="10" font-weight="700" text-anchor="middle">10:45</text>
        </svg>
    `,
    accesorios: `
        <svg viewBox="0 0 120 180" width="100" height="120">
            <rect x="35" y="45" width="50" height="80" rx="8" fill="#1c1010" stroke="#dc2626" stroke-width="2"/>
            <circle cx="60" cy="65" r="8" fill="#090505"/>
            <rect x="48" y="90" width="24" height="6" rx="1.5" fill="#d97706"/>
        </svg>
    `
};

const DEFAULT_REPAIR_MODELS = {
    apple: [
        { name: "iPhone 15 Pro Max", priceMultiplier: 1.4 },
        { name: "iPhone 15", priceMultiplier: 1.25 },
        { name: "iPhone 14 Pro", priceMultiplier: 1.2 },
        { name: "iPhone 13", priceMultiplier: 1.05 },
        { name: "iPhone 12", priceMultiplier: 0.95 }
    ],
    samsung: [
        { name: "Galaxy S24 Ultra", priceMultiplier: 1.35 },
        { name: "Galaxy S23 Ultra", priceMultiplier: 1.2 },
        { name: "Galaxy S22", priceMultiplier: 1.0 },
        { name: "Galaxy A54", priceMultiplier: 0.8 },
        { name: "Galaxy A34", priceMultiplier: 0.7 }
    ],
    xiaomi: [
        { name: "Xiaomi 14 Ultra", priceMultiplier: 1.15 },
        { name: "Xiaomi 13T Pro", priceMultiplier: 0.95 },
        { name: "Redmi Note 13 Pro", priceMultiplier: 0.75 },
        { name: "Poco F5", priceMultiplier: 0.7 }
    ],
    motorola: [
        { name: "Edge 40 Pro", priceMultiplier: 1.05 },
        { name: "Moto G84", priceMultiplier: 0.75 },
        { name: "Moto G54", priceMultiplier: 0.65 },
        { name: "Edge 30", priceMultiplier: 0.8 }
    ]
};

const DEFAULT_REPAIR_ISSUES = {
    screen: { name: "Cambio de Pantalla", basePrice: 100, time: "2 - 3 horas" },
    battery: { name: "Degradación de Batería", basePrice: 45, time: "1 - 2 horas" },
    port: { name: "Puerto de Carga", basePrice: 35, time: "1 hora" },
    camera: { name: "Cámara delantera/trasera", basePrice: 65, time: "24 horas" },
    diagnostic: { name: "Diagnóstico general", basePrice: 25, time: "24 - 48 horas" }
};

let REPAIR_MODELS = JSON.parse(localStorage.getItem('drakotec_repair_models')) || DEFAULT_REPAIR_MODELS;
let REPAIR_ISSUES = JSON.parse(localStorage.getItem('drakotec_repair_issues')) || DEFAULT_REPAIR_ISSUES;

// ESTADO GLOBAL
let productosList = [];
let ordenesList = [];
let carrito = JSON.parse(localStorage.getItem('drakotec_cart')) || [];
let currentUser = JSON.parse(sessionStorage.getItem('drakotec_user')) || null;
let currentFilter = 'all';
let currentSort = 'default';

// ==========================================
// INICIALIZADOR POR PÁGINA ACTIVA
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Inicialización compartida (Tema, Navbar, Badge de Carrito, Configuración de Contacto)
    initTheme();
    initNavbar();
    updateCartCountBadge();
    updatePortalNavLink();
    loadAndApplyStoreSettings();
    checkExpiredReservations();

    const path = window.location.pathname.toLowerCase().replace(/\/$/, '');

    // Detectar página de forma robusta (soporta clean URLs, trailing slashes y .html)
    if (path.endsWith('reparaciones.html') || path.endsWith('/reparaciones')) {
        initRepairCalculator();
        initRepairTracker();
        fetchOrdenes();
    } 
    else if (path.endsWith('carrito.html') || path.endsWith('/carrito')) {
        // Carga productos para cotejar precios reales y stock actualizados en el carrito
        await fetchProductos(false); // No renderiza catálogo general
        initCartPage();
    } 
    else if (path.endsWith('portal.html') || path.endsWith('/portal')) {
        // Si ya hay sesión activa, redirección automática
        if (currentUser) {
            window.location.replace(currentUser.role === 'admin' ? 'admin.html' : 'tecnico.html');
            return;
        }
        initPortalAuth();
    } 
    else if (path.endsWith('tecnico.html') || path.endsWith('/tecnico')) {
        initTechnicalWorkshopModule();
        initLogoutBtn();
        fetchOrdenes();
    } 
    else if (path.endsWith('admin.html') || path.endsWith('/admin') || path.endsWith('admin')) {
        initTechnicalWorkshopModule();
        initAdminProductForm();
        initSettingsFormListener();
        initPOSModule();
        initUserManagementModal();
        initLogoutBtn();
        fetchProductos(true); // Carga productos y renderiza tabla del administrador
        fetchOrdenes();
        fetchMovimientos();
        updateAdminUnreadBadge();
    } 
    else if (path.endsWith('tienda.html') || path.endsWith('/tienda')) {
        await fetchProductos(true); // Carga productos y renderiza catálogo de tienda
        initCatalogFilters();
    }
    else if (path.endsWith('contacto.html') || path.endsWith('/contacto')) {
        initContactForms();
    }
    else {
        // Por defecto: index.html (Inicio y Showcase Hero)
    }
});

// ==========================================
// LÓGICA DE COMPORTAMIENTO COMPARTIDO
// ==========================================

// Alternancia de Tema Claro/Oscuro
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    const storedTheme = localStorage.getItem('drakotec_theme');
    if (storedTheme === 'light') {
        document.body.classList.add('light-mode');
        updateThemeIcon(true);
    } else {
        document.body.classList.remove('light-mode');
        updateThemeIcon(false);
    }

    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem('drakotec_theme', isLight ? 'light' : 'dark');
        updateThemeIcon(isLight);
    });
}

function updateThemeIcon(isLight) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    if (isLight) {
        themeToggle.innerHTML = `
            <svg class="icon-sun" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
        `;
    } else {
        themeToggle.innerHTML = `
            <svg class="icon-moon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
        `;
    }
}

// Inicializar la navegación responsiva
function initNavbar() {
    const header = document.getElementById('header');
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Destacar automáticamente la pestaña activa según la página actual de forma robusta
    const path = window.location.pathname.toLowerCase();
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        const cleanHref = href.toLowerCase().split('#')[0];
        
        // Determinar si coincide
        let isCurrent = false;
        
        if (cleanHref === 'index.html' || cleanHref === '/') {
            isCurrent = path === '/' || path.endsWith('/index.html') || path.endsWith('/');
        } else {
            // Quitar la extensión .html para comparar limpiamente (ej: 'tienda.html' -> 'tienda')
            const hrefBase = cleanHref.replace('.html', '');
            isCurrent = path.endsWith('/' + cleanHref) || path.endsWith('/' + hrefBase);
        }
        
        if (isCurrent) {
            link.classList.add('active');
        } else if (href !== '#' && !href.startsWith('#')) {
            link.classList.remove('active');
        }
    });

    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    }

    window.addEventListener('scroll', () => {
        // Solo aplicar scroll dinámico si no tiene la clase estática de scrolled obligatoria
        const isSubpage = window.location.pathname.endsWith('reparaciones.html') || 
                           window.location.pathname.endsWith('carrito.html') || 
                           window.location.pathname.endsWith('portal.html') || 
                           window.location.pathname.endsWith('tecnico.html') || 
                           window.location.pathname.endsWith('admin.html') ||
                           window.location.pathname.endsWith('tienda.html') ||
                           window.location.pathname.endsWith('contacto.html');
                           
        if (window.scrollY > 50 || isSubpage) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
            menuToggle.classList.toggle('active');
            if (navMenu.classList.contains('open')) {
                menuToggle.children[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
                menuToggle.children[1].style.opacity = '0';
                menuToggle.children[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
            } else {
                menuToggle.children[0].style.transform = 'none';
                menuToggle.children[1].style.opacity = '1';
                menuToggle.children[2].style.transform = 'none';
            }
        });
    }

    // Cerrar el menú móvil al hacer click en una opción
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu && navMenu.classList.contains('open')) {
                navMenu.classList.remove('open');
                if (menuToggle) {
                    menuToggle.classList.remove('active');
                    menuToggle.children[0].style.transform = 'none';
                    menuToggle.children[1].style.opacity = '1';
                    menuToggle.children[2].style.transform = 'none';
                }
            }
        });
    });
}

// Sincronizar el badge del carrito en el navbar de todas las páginas
function updateCartCountBadge() {
    const cartCount = document.getElementById('cartCount');
    if (!cartCount) return;

    const totalItems = carrito.reduce((acc, curr) => acc + curr.quantity, 0);
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
}

// Ajustar el texto del enlace de portal según sesión activa
function updatePortalNavLink() {
    const link = document.getElementById('navPortalLink');
    if (!link) return;

    if (currentUser) {
        link.textContent = currentUser.role === 'admin' ? "Panel Admin" : "Panel Técnico";
        link.setAttribute('href', currentUser.role === 'admin' ? 'admin.html' : 'tecnico.html');
    } else {
        link.textContent = "Portal Personal";
        link.setAttribute('href', 'portal.html');
    }
}

// Botón de cerrar sesión para paneles protegidos
function initLogoutBtn() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('drakotec_user');
            currentUser = null;
            showToast("Sesión cerrada.");
            setTimeout(() => {
                window.location.replace('portal.html');
            }, 1000);
        });
    }
}

// ==========================================
// MÓDULO: TIENDA (CATÁLOGO EN INDEX.HTML)
// ==========================================
async function fetchProductos(render = true) {
    try {
        const res = await fetch(`${API_URL}/api/productos`);
        if (!res.ok) throw new Error("Error al obtener productos");
        productosList = await res.json();
        
        if (render) {
            const path = window.location.pathname;
            if (path.endsWith('admin.html')) {
                renderAdminProducts();
            } else if (path.endsWith('index.html') || path === '/' || path.endsWith('/') || path.endsWith('tienda.html')) {
                renderCatalog();
            }
        }
    } catch (err) {
        console.error(err);
        showToast("Error al conectar con la base de datos.", "danger");
    }
}

function renderCatalog() {
    const shopGrid = document.getElementById('shopGrid');
    if (!shopGrid) return;
    
    shopGrid.innerHTML = '';

    // Filtrar
    let filtered = currentFilter === 'all' 
        ? productosList 
        : productosList.filter(p => p.category === currentFilter);

    // Ordenar
    if (currentSort === 'price-asc') {
        filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (currentSort === 'price-desc') {
        filtered = [...filtered].sort((a, b) => b.price - a.price);
    }

    filtered.forEach(p => {
        const isOutOfStock = p.stock <= 0;
        
        const card = document.createElement('div');
        card.className = `product-card glass-card`;
        card.setAttribute('data-id', p.id);
        
        const tagHtml = isOutOfStock
            ? `<span class="product-tag" style="background: var(--danger); color: #fff;">Agotado</span>`
            : p.stock <= 2 
                ? `<span class="product-tag" style="background: var(--warning); color: #000;">¡Pocas unidades!</span>`
                : '';

        const fallbackSvg = SVGS_FALLBACK[p.category] || SVGS_FALLBACK['accesorios'];

        card.innerHTML = `
            <div class="product-img-container">
                ${tagHtml}
                <div class="product-img-wrapper" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <img src="${p.imagePath}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="display: none; width: 100%; height: 100%;">${fallbackSvg}</div>
                </div>
            </div>
            <div class="product-details">
                <span class="product-category">${p.category}</span>
                <h4 class="product-title">${p.name}</h4>
                <p style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.7); text-shadow: 0 1px 2px rgba(0,0,0,0.5); margin-bottom: 12px; height: 38px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                    ${p.specs}
                </p>
                <div class="product-meta">
                    <div>
                        <span class="product-price">${p.price.toLocaleString('es-BO')} Bs.</span>
                    </div>
                    <button class="btn btn-primary btn-add-cart" data-id="${p.id}" ${isOutOfStock ? 'disabled' : ''} style="font-size: 0.85rem; padding: 8px 14px; display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; background: ${isOutOfStock ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #d97706, #dc2626)'}; color: #fff; cursor: ${isOutOfStock ? 'not-allowed' : 'pointer'};">
                        ${isOutOfStock ? `
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                            </svg>
                            <span>Agotado</span>
                        ` : `
                            <span>📌 Reservar</span>
                        `}
                    </button>
                </div>
                ${isOutOfStock ? `<span class="stock-out-notice" style="margin-top: 4px; font-size: 0.75rem; color: var(--danger);">Sin Stock disponible</span>` : ''}
            </div>
        `;

        card.addEventListener('click', () => {
            openProductDetailModal(p);
        });
        card.style.cursor = 'pointer';

        shopGrid.appendChild(card);
    });

    // Añadir listener
    document.querySelectorAll('.btn-add-cart').forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(button.getAttribute('data-id'));
                addToCart(id);
            });
        }
    });
}

function openProductDetailModal(p) {
    // 1. Remover modal existente si lo hubiera
    const existing = document.getElementById('prodDetailModalOverlay');
    if (existing) existing.remove();

    const isOutOfStock = p.stock <= 0;
    const fallbackSvg = SVGS_FALLBACK[p.category] || SVGS_FALLBACK['accesorios'];
    const imagesList = p.images && p.images.length > 0 ? p.images : [p.imagePath];

    // Generar html para miniaturas si hay más de una imagen
    let thumbsHtml = '';
    if (imagesList.length > 1) {
        thumbsHtml = `
            <div class="prod-detail-gallery-thumbs">
                ${imagesList.map((img, idx) => `
                    <div class="prod-detail-gallery-thumb ${idx === 0 ? 'active' : ''}" data-src="${img}">
                        <img src="${img}" onerror="this.src='data:image/svg+xml;utf8,${encodeURIComponent(fallbackSvg)}'">
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Crear la estructura del modal
    const overlay = document.createElement('div');
    overlay.id = 'prodDetailModalOverlay';
    overlay.className = 'prod-detail-modal-overlay';
    overlay.innerHTML = `
        <div class="prod-detail-modal">
            <button class="prod-detail-close-btn" id="closeProdDetailModalBtn">✖</button>
            <div class="prod-detail-modal-grid">
                <!-- Columna Izquierda: Galería -->
                <div class="prod-detail-gallery">
                    <div class="prod-detail-gallery-main" id="modalMainImgWrapper">
                        <img id="modalMainImg" src="${p.imagePath}" alt="${p.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div style="display: none;">${fallbackSvg}</div>
                    </div>
                    ${thumbsHtml}
                </div>
                <!-- Columna Derecha: Información -->
                <div class="prod-detail-info">
                    <span class="prod-detail-category">${p.category}</span>
                    <h2 class="prod-detail-title">${p.name}</h2>
                    <div class="prod-detail-price">${p.price.toLocaleString('es-BO')} Bs.</div>
                    
                    <div class="prod-detail-divider"></div>
                    
                    <div class="prod-detail-specs-title">Ficha Técnica:</div>
                    <div class="prod-detail-specs">${p.specs}</div>
                    
                    <div class="prod-detail-stock-status">
                        <span>Stock:</span>
                        <strong>${p.stock > 0 ? `${p.stock} unidades disponibles` : 'Agotado'}</strong>
                    </div>
                    
                    <button class="btn btn-primary prod-detail-action-btn" id="modalAddToCartBtn" ${isOutOfStock ? 'disabled' : ''}>
                        ${isOutOfStock ? 'Agotado' : '📌 Reservar Producto'}
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Animación de aparición suave
    setTimeout(() => {
        overlay.classList.add('open');
    }, 10);

    // Escuchadores de cierre
    const closeBtn = overlay.querySelector('#closeProdDetailModalBtn');
    closeBtn.addEventListener('click', () => {
        overlay.classList.remove('open');
        setTimeout(() => overlay.remove(), 300);
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 300);
        }
    });

    // Agregar al carrito desde el modal
    const actionBtn = overlay.querySelector('#modalAddToCartBtn');
    if (actionBtn && !isOutOfStock) {
        actionBtn.addEventListener('click', () => {
            addToCart(p.id);
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 300);
        });
    }

    // Lógica para cambiar de imagen en la galería
    const thumbs = overlay.querySelectorAll('.prod-detail-gallery-thumb');
    thumbs.forEach(thumb => {
        const swapImg = () => {
            const newSrc = thumb.getAttribute('data-src');
            const mainImg = overlay.querySelector('#modalMainImg');
            
            // Transición de opacidad al cambiar de foto
            mainImg.style.opacity = '0.3';
            setTimeout(() => {
                mainImg.src = newSrc;
                mainImg.style.display = 'block';
                mainImg.nextElementSibling.style.display = 'none'; // ocultar fallback
                mainImg.style.opacity = '1';
            }, 100);

            thumbs.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        };

        // Cambiar al hacer click o pasar el cursor (mouseenter)
        thumb.addEventListener('click', swapImg);
        thumb.addEventListener('mouseenter', swapImg);
    });
}

function initCatalogFilters() {
    const filters = document.querySelectorAll('.filter-btn');
    const sortSelect = document.getElementById('sortSelect');

    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            filters.forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderCatalog();
        });
    });

    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            currentSort = sortSelect.value;
            renderCatalog();
        });
    }
}

function addToCart(productId) {
    const product = productosList.find(p => p.id === productId);
    if (!product) return;

    if (product.stock <= 0) {
        showToast("Este producto no tiene stock disponible para reservar.", "danger");
        return;
    }

    const existing = carrito.find(item => item.product.id === productId);
    
    if (existing) {
        if (existing.quantity >= product.stock) {
            showToast(`Límite alcanzado. Solo hay ${product.stock} unidades en stock disponible.`, "danger");
            return;
        }
        existing.quantity++;
    } else {
        carrito.push({ product, quantity: 1 });
    }

    saveCart();
    updateCartCountBadge();
    showToast(`¡${product.name} agregado a tu lista de reserva!`);
}

function saveCart() {
    localStorage.setItem('drakotec_cart', JSON.stringify(carrito));
}

// ==========================================
// MÓDULO: PÁGINA DE RESERVAS (RETIRO EN TIENDA - 48H)
// ==========================================
function initCartPage() {
    const reservationForm = document.getElementById('reservationForm');
    const checkoutBtn = document.getElementById('checkoutBtn');

    renderCartPage();

    if (reservationForm) {
        reservationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (carrito.length === 0) {
                showToast("Tu lista de reserva está vacía.", "danger");
                return;
            }

            const clientName = document.getElementById('resClientName').value.trim();
            const clientPhone = document.getElementById('resClientPhone').value.trim();

            if (!clientName || !clientPhone) {
                showToast("Por favor ingresa tu nombre y teléfono para la reserva.", "danger");
                return;
            }

            checkoutBtn.disabled = true;
            checkoutBtn.innerHTML = `📌 Procesando reserva...`;

            try {
                // 1. Calcular vencimiento exactamente a 48 horas
                const now = new Date();
                const expires = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +48 horas
                const resCode = `RES-${Math.floor(1000 + Math.random() * 9000)}`;

                const itemsToReserve = carrito.map(item => ({
                    productId: item.product.id,
                    name: item.product.name,
                    price: item.product.price,
                    quantity: item.quantity
                }));

                // 2. Enviar la reserva al backend (MongoDB) y descontar el stock
                const res = await fetch(`${API_URL}/api/reservas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: resCode,
                        clientName,
                        clientPhone,
                        items: itemsToReserve,
                        expiresAt: expires.toISOString()
                    })
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Error al guardar la reserva en el servidor");
                }

                const reservationData = {
                    code: resCode,
                    clientName,
                    clientPhone,
                    items: [...carrito],
                    createdAt: now.toISOString(),
                    expiresAt: expires.toISOString(),
                    released: false
                };

                let savedReservations = JSON.parse(localStorage.getItem('drakotec_reservations')) || [];
                savedReservations.push(reservationData);
                localStorage.setItem('drakotec_reservations', JSON.stringify(savedReservations));

                // Notificar en tiempo real a otras pestañas de la tienda que el stock cambió
                broadcastChannel.postMessage({ type: 'product_updated' });

                // 3. Limpiar carrito activo y notificar
                carrito = [];
                saveCart();
                updateCartCountBadge();
                renderCartPage();

                showToast(`¡Reserva ${resCode} confirmada! Válida por 48 horas.`, "success");

                // Mostrar alerta informativa con los detalles y la cláusula de 48 horas
                alert(
                    `📌 ¡RESERVA CONFIRMADA CON ÉXITO!\n\n` +
                    `Código de Reserva: ${resCode}\n` +
                    `Cliente: ${clientName}\n` +
                    `Teléfono: ${clientPhone}\n\n` +
                    `⏳ AVISO IMPORTANTE:\n` +
                    `La reserva será válida por solo 48 horas (hasta el ${expires.toLocaleString('es-ES')}).\n` +
                    `Después de ese tiempo tu reserva se disuelve automáticamente y el stock del producto se actualiza nuevamente.`
                );

            } catch (err) {
                console.error("Error al procesar reserva:", err);
                showToast("Error al procesar la reserva. Intenta nuevamente.", "danger");
            } finally {
                checkoutBtn.disabled = false;
                checkoutBtn.innerHTML = "📌 Confirmar Reserva (Válida 48h)";
            }
        });
    }
}

function renderCartPage() {
    const layout = document.getElementById('cartPageLayout');
    const emptyState = document.getElementById('cartPageEmptyState');
    const itemsContainer = document.getElementById('cartPageItemsContainer');
    const subtotalVal = document.getElementById('cartSubtotalVal');
    const totalVal = document.getElementById('cartTotalVal');

    if (!itemsContainer) return;

    // Sincronizar cantidades con stock más reciente del servidor
    carrito.forEach(item => {
        const newestProduct = productosList.find(p => p.id === item.product.id);
        if (newestProduct) {
            item.product.price = newestProduct.price;
            item.product.stock = newestProduct.stock;
            if (item.quantity > newestProduct.stock) {
                item.quantity = newestProduct.stock;
            }
        }
    });
    
    // Filtrar los de cantidad 0
    carrito = carrito.filter(item => item.quantity > 0);
    saveCart();
    updateCartCountBadge();

    if (carrito.length === 0) {
        layout.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    layout.style.display = 'grid';
    emptyState.style.display = 'none';

    itemsContainer.innerHTML = '';
    let totalPrice = 0;

    carrito.forEach(item => {
        const itemPrice = item.product.price * item.quantity;
        totalPrice += itemPrice;
        
        const fallbackSvg = SVGS_FALLBACK[item.product.category] || SVGS_FALLBACK['accesorios'];

        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="cart-item-img" style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
                <img src="${item.product.imagePath}" alt="${item.product.name}" style="max-height: 70px; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div style="display: none; scale: 0.8;">${fallbackSvg}</div>
            </div>
            <div class="cart-item-info">
                <h4 class="cart-item-title" style="font-size: 1.1rem;">${item.product.name}</h4>
                <span class="cart-item-price" style="font-size: 1rem;">${item.product.price.toLocaleString('es-BO')} Bs.</span>
                <div class="cart-item-qty" style="margin-top: 10px;">
                    <button class="qty-btn dec-qty-page" data-id="${item.product.id}">-</button>
                    <span style="font-weight: 700;">${item.quantity}</span>
                    <button class="qty-btn inc-qty-page" data-id="${item.product.id}">+</button>
                </div>
            </div>
            <div class="cart-item-remove" data-id="${item.product.id}" title="Eliminar artículo" style="padding: 10px;">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </div>
        `;
        itemsContainer.appendChild(itemElement);
    });

    subtotalVal.textContent = `${totalPrice.toLocaleString('es-BO')} Bs.`;
    totalVal.textContent = `${totalPrice.toLocaleString('es-BO')} Bs.`;

    // Eventos
    document.querySelectorAll('.dec-qty-page').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            const current = carrito.find(item => item.product.id === id);
            if (current) {
                updateCartQuantity(id, current.quantity - 1);
                renderCartPage();
            }
        });
    });

    document.querySelectorAll('.inc-qty-page').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            const current = carrito.find(item => item.product.id === id);
            if (current) {
                updateCartQuantity(id, current.quantity + 1);
                renderCartPage();
            }
        });
    });

    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            carrito = carrito.filter(item => item.product.id !== id);
            saveCart();
            updateCartCountBadge();
            renderCartPage();
        });
    });
}

function updateCartQuantity(productId, newQty) {
    const product = productosList.find(p => p.id === productId);
    const item = carrito.find(item => item.product.id === productId);
    if (!item) return;

    if (newQty <= 0) {
        carrito = carrito.filter(item => item.product.id !== productId);
    } else {
        if (product && newQty > product.stock) {
            showToast(`Solo quedan ${product.stock} unidades en inventario.`, "danger");
            item.quantity = product.stock;
        } else {
            item.quantity = newQty;
        }
    }
    saveCart();
    updateCartCountBadge();
}

// ==========================================
// MÓDULO: SERVICIO TÉCNICO (REPARACIONES.HTML)
// ==========================================
function initRepairCalculator() {
    const brandSelect = document.getElementById('repairBrand');
    const modelSelect = document.getElementById('repairModel');
    const issueSelect = document.getElementById('repairIssue');
    const calcResult = document.getElementById('calcResult');
    const calcPrice = document.getElementById('calcPrice');
    const calcTime = document.getElementById('calcTime');
    const bookRepairBtn = document.getElementById('bookRepairBtn');

    if (!brandSelect) return;

    brandSelect.addEventListener('change', () => {
        const brand = brandSelect.value;
        const models = REPAIR_MODELS[brand] || [];

        modelSelect.disabled = false;
        modelSelect.innerHTML = `<option value="" disabled selected>Selecciona el modelo</option>`;
        
        models.forEach(model => {
            modelSelect.innerHTML += `<option value="${model.name}" data-mult="${model.priceMultiplier}">${model.name}</option>`;
        });
        resetResult();
    });

    const checkCalculation = () => {
        const brand = brandSelect.value;
        const model = modelSelect.value;
        const issue = issueSelect.value;

        if (brand && model && issue) {
            const selectedOption = modelSelect.options[modelSelect.selectedIndex];
            const multiplier = parseFloat(selectedOption.getAttribute('data-mult'));
            const issueData = REPAIR_ISSUES[issue];

            // Precio aproximado
            const finalPrice = Math.round(issueData.basePrice * multiplier * 7);
            
            calcPrice.textContent = `${finalPrice.toLocaleString('es-BO')} Bs.`;
            calcTime.innerHTML = `<strong>Tiempo de entrega:</strong> ${issueData.time} <br><strong>Garantía:</strong> 6 meses en repuesto y mano de obra.`;
            calcResult.style.display = 'block';
        }
    };

    modelSelect.addEventListener('change', checkCalculation);
    issueSelect.addEventListener('change', checkCalculation);

    function resetResult() {
        calcResult.style.display = 'none';
        issueSelect.selectedIndex = 0;
    }

    bookRepairBtn.addEventListener('click', () => {
        const model = modelSelect.value;
        const issueName = REPAIR_ISSUES[issueSelect.value].name;
        showToast(`Cita confirmada para tu ${model} (${issueName}).`);
        brandSelect.selectedIndex = 0;
        modelSelect.innerHTML = `<option value="" disabled selected>Elige primero una marca</option>`;
        modelSelect.disabled = true;
        resetResult();
    });
}

async function fetchOrdenes() {
    try {
        const res = await fetch(`${API_URL}/api/ordenes`);
        if (!res.ok) throw new Error("Error al obtener órdenes");
        ordenesList = await res.json();
        
        const path = window.location.pathname;
        if (path.endsWith('tecnico.html')) {
            renderTechOrders();
        }
    } catch (err) {
        console.error(err);
    }
}

function initRepairTracker() {
    const trackerCode = document.getElementById('trackerCode');
    const trackerBtn = document.getElementById('trackerBtn');
    const trackerResults = document.getElementById('trackerResults');
    const resCode = document.getElementById('resCode');
    const resDevice = document.getElementById('resDevice');
    const resState = document.getElementById('resState');
    const demoCode1 = document.getElementById('demoCode1');
    const demoCode2 = document.getElementById('demoCode2');

    if (!trackerBtn) return;

    const steps = {
        recibido: document.getElementById('step-recibido'),
        diagnostico: document.getElementById('step-diagnostico'),
        reparacion: document.getElementById('step-reparacion'),
        listo: document.getElementById('step-listo')
    };

    const track = async () => {
        const code = trackerCode.value.trim().toUpperCase();
        await fetchOrdenes();
        
        const ticket = ordenesList.find(o => o.code === code);

        if (!ticket) {
            showToast("Orden no encontrada.", "danger");
            trackerResults.style.display = 'none';
            return;
        }

        resCode.textContent = ticket.code;
        resDevice.textContent = ticket.brandModel;
        
        let stateLabel = "";
        let stateClass = "";
        if (ticket.status === 'recibido') {
            stateLabel = "Recibido";
            stateClass = "state-diag";
        } else if (ticket.status === 'diagnostico') {
            stateLabel = "En Diagnóstico";
            stateClass = "state-diag";
        } else if (ticket.status === 'reparacion') {
            stateLabel = "En Reparación";
            stateClass = "state-repair";
        } else if (ticket.status === 'listo') {
            stateLabel = "Listo para Entrega";
            stateClass = "state-ready";
        }
        resState.textContent = stateLabel;
        resState.className = `tracker-state ${stateClass}`;

        // Limpiar timeline
        Object.values(steps).forEach(s => s.classList.remove('completed', 'active'));

        if (ticket.status === 'recibido') {
            steps.recibido.classList.add('active');
        } else if (ticket.status === 'diagnostico') {
            steps.recibido.classList.add('completed');
            steps.diagnostico.classList.add('active');
        } else if (ticket.status === 'reparacion') {
            steps.recibido.classList.add('completed');
            steps.diagnostico.classList.add('completed');
            steps.reparacion.classList.add('active');
        } else if (ticket.status === 'listo') {
            steps.recibido.classList.add('completed');
            steps.diagnostico.classList.add('completed');
            steps.reparacion.classList.add('completed');
            steps.listo.classList.add('active');
        }

        trackerResults.style.display = 'block';
        trackerResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    trackerBtn.addEventListener('click', track);
    trackerCode.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') track();
    });

    demoCode1.addEventListener('click', () => {
        trackerCode.value = "DRAKO-101";
        track();
    });
    demoCode2.addEventListener('click', () => {
        trackerCode.value = "DRAKO-202";
        track();
    });
}

// ==========================================
// MÓDULO: LOGIN DEL PERSONAL (PORTAL.HTML)
// ==========================================
function initPortalAuth() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const role = document.getElementById('loginRole').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, password })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Fallo al iniciar sesión");
            }

            const user = await res.json();
            sessionStorage.setItem('drakotec_user', JSON.stringify(user));
            currentUser = user;
            
            showToast("Acceso autorizado.");
            
            // Redireccionar al panel correspondiente
            setTimeout(() => {
                window.location.replace(user.role === 'admin' ? 'admin.html' : 'tecnico.html');
            }, 1000);
            
        } catch (err) {
            showToast(err.message, "danger");
        }
    });
}

// ==========================================
// MÓDULO: FORMULARIO DE PRODUCTOS (ADMIN)
// ==========================================
function initAdminProductForm() {
    const productForm = document.getElementById('productForm');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const prodSubmitBtn = document.getElementById('prodSubmitBtn');
            const id = document.getElementById('prodId').value;
            const name = document.getElementById('prodName').value;
            const price = parseFloat(document.getElementById('prodPrice').value);
            const stock = parseInt(document.getElementById('prodStock').value);
            const category = document.getElementById('prodCategory').value;
            const specs = document.getElementById('prodSpecs').value;
            const prodImageInput = document.getElementById('prodImage');
            const imageFiles = prodImageInput ? prodImageInput.files : [];

            if (price < 0 || stock < 0) {
                showToast("Precio y Stock no pueden ser negativos.", "danger");
                return;
            }

            const formData = new FormData();
            formData.append('name', name);
            formData.append('price', price);
            formData.append('stock', stock);
            formData.append('category', category);
            formData.append('specs', specs);
            
            if (imageFiles && imageFiles.length > 0) {
                for (let i = 0; i < imageFiles.length; i++) {
                    formData.append('imagenes', imageFiles[i]);
                }
            }

            if (prodSubmitBtn) {
                prodSubmitBtn.disabled = true;
                prodSubmitBtn.textContent = id ? "Guardando Cambios..." : "Publicando Producto...";
            }

            try {
                let url = `${API_URL}/api/productos`;
                let method = 'POST';

                if (id) {
                    url = `${API_URL}/api/productos/${id}`;
                    method = 'PUT';
                } else {
                    if (!imageFiles || imageFiles.length === 0) {
                        showToast("La foto de producto es obligatoria.", "danger");
                        return;
                    }
                }

                const res = await fetch(url, {
                    method: method,
                    body: formData
                });

                if (!res.ok) {
                    let errMsg = "Fallo al guardar producto";
                    try {
                        const errData = await res.json();
                        errMsg = errData.error || (errData.errors ? errData.errors.join(', ') : errMsg);
                    } catch (_) {
                        errMsg = `Error ${res.status}: ${res.statusText}`;
                    }
                    throw new Error(errMsg);
                }

                const data = await res.json();
                showToast(data.message || "Producto procesado con éxito");
                
                resetProductForm();
                await fetchProductos(true);

                // Notificar en tiempo real a otras pestañas/páginas (como tienda.html)
                if (typeof broadcastChannel !== 'undefined') {
                    broadcastChannel.postMessage({ type: 'product_updated' });
                }

            } catch (err) {
                showToast(err.message, "danger");
            } finally {
                if (prodSubmitBtn) {
                    prodSubmitBtn.disabled = false;
                    prodSubmitBtn.textContent = document.getElementById('prodId').value ? "Guardar Cambios" : "Publicar Producto";
                }
            }
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', resetProductForm);
    }
}

function resetProductForm() {
    const productForm = document.getElementById('productForm');
    if (!productForm) return;
    
    productForm.reset();
    document.getElementById('prodId').value = '';
    document.getElementById('productFormTitle').textContent = "Publicar Nuevo Producto";
    document.getElementById('prodSubmitBtn').textContent = "Publicar Producto";
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('imageRequiredNotice').textContent = "Requerido para nuevos productos.";
    
    const prodImageInput = document.getElementById('prodImage');
    if (prodImageInput) {
        prodImageInput.setAttribute('required', 'required');
    }

    const previewContainer = document.getElementById('editImagesPreview');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
}

// ==========================================
// RBAC ENGINE & MATRIZ DE PERMISOS
// ==========================================
const ROLE_PERMISSIONS = {
    tecnico: {
        roleName: 'Técnico / Operador',
        canCreateOrder: true,
        canEditTechnicalState: true,
        canDrawPattern: true,
        canUseTemplates: true,
        canPrintTicket: true,
        canSendWhatsapp: true,
        canEditDiscounts: true,   // HABILITADO PARA TÉCNICO
        canDeleteOrder: false,     // RESTRINGIDO PARA TÉCNICO
        canAccessAccounting: false, // RESTRINGIDO PARA TÉCNICO
        canAccessSettings: false,   // RESTRINGIDO PARA TÉCNICO
    },
    admin: {
        roleName: 'Administrador (Acceso Total)',
        canCreateOrder: true,
        canEditTechnicalState: true,
        canDrawPattern: true,
        canUseTemplates: true,
        canPrintTicket: true,
        canSendWhatsapp: true,
        canEditDiscounts: true,
        canDeleteOrder: true,
        canAccessAccounting: true,
        canAccessSettings: true,
    }
};

const DEFAULT_USERS = [
    { name: "Administrador General", username: "admin", role: "admin", pass: "admin123" },
    { name: "Técnico de Taller", username: "tecnico", role: "tecnico", pass: "tecnico123" }
];

let drakotecUsers = JSON.parse(localStorage.getItem('drakotec_users')) || DEFAULT_USERS;

function getDrakotecUsers() {
    return JSON.parse(localStorage.getItem('drakotec_users')) || DEFAULT_USERS;
}

function saveDrakotecUsers(users) {
    drakotecUsers = users;
    localStorage.setItem('drakotec_users', JSON.stringify(users));
}

// Autenticación en portal.html
function initPortalAuth() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const role = document.getElementById('loginRole').value;
        const pass = document.getElementById('loginPassword').value;

        if (!role) {
            showToast("Selecciona tu rol de acceso.", "danger");
            return;
        }

        const usersList = getDrakotecUsers();
        // Verificar si existe algún usuario que coincida con el rol y contraseña ingresados
        const matchUser = usersList.find(u => u.role === role && u.pass === pass);

        if (matchUser) {
            const userData = {
                username: matchUser.name || matchUser.username,
                role: matchUser.role
            };
            sessionStorage.setItem('drakotec_user', JSON.stringify(userData));
            currentUser = userData;
            showToast(`¡Bienvenido ${matchUser.name}! Sesión iniciada como ${ROLE_PERMISSIONS[role]?.roleName || role}`);

            setTimeout(() => {
                window.location.replace(role === 'admin' ? 'admin.html' : 'tecnico.html');
            }, 800);
        } else {
            showToast("Contraseña incorrecta para el rol seleccionado.", "danger");
        }
    });
}

// Módulo de Taller Técnico & RBAC (tecnico.html)
function initTechnicalWorkshopModule() {
    const page = document.getElementById('portal-tecnico-page');
    if (!page) return;

    const isAdminPage = window.location.pathname.toLowerCase().includes('admin');
    const defaultRole = isAdminPage ? 'admin' : 'tecnico';
    const defaultName = isAdminPage ? 'Administrador Drakotec' : 'Técnico Drakotec';

    const user = JSON.parse(sessionStorage.getItem('drakotec_user')) || { username: defaultName, role: defaultRole };
    const userRole = user.role || defaultRole;
    const perms = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS[defaultRole];

    // 1. Actualizar Nombre de Usuario y Badges de Rol
    const loggedInUserEl = document.getElementById('loggedInUser');
    const roleBadgeEl = document.getElementById('roleBadge');
    if (loggedInUserEl) loggedInUserEl.textContent = user.username;
    if (roleBadgeEl) {
        roleBadgeEl.textContent = `Rol: ${perms.roleName}`;
        roleBadgeEl.className = userRole === 'admin' ? 'status-badge listo' : 'status-badge reparacion';
    }

    // 2. Aplicar Restricciones RBAC en Campos Financieros (Descuento y Recargo)
    const ordDiscount = document.getElementById('ordDiscount');
    const ordSurcharge = document.getElementById('ordSurcharge');
    const badgeDiscountRole = document.getElementById('badgeDiscountRole');
    const badgeSurchargeRole = document.getElementById('badgeSurchargeRole');

    if (!perms.canEditDiscounts) {
        if (ordDiscount) {
            ordDiscount.disabled = true;
            ordDiscount.classList.add('input-restricted');
            ordDiscount.title = 'Restringido: Solo el Administrador puede aplicar descuentos finales.';
        }
        if (ordSurcharge) {
            ordSurcharge.disabled = true;
            ordSurcharge.classList.add('input-restricted');
            ordSurcharge.title = 'Restringido: Solo el Administrador puede aplicar recargos finales.';
        }
    } else {
        if (ordDiscount) {
            ordDiscount.disabled = false;
            ordDiscount.classList.remove('input-restricted');
        }
        if (ordSurcharge) {
            ordSurcharge.disabled = false;
            ordSurcharge.classList.remove('input-restricted');
        }
        if (badgeDiscountRole) badgeDiscountRole.style.display = 'none';
        if (badgeSurchargeRole) badgeSurchargeRole.style.display = 'none';
    }

    // 3. Sistema de Pestañas y Guards de Permisos
    const tabsNav = document.getElementById('moduleTabsNav');
    if (tabsNav) {
        tabsNav.querySelectorAll('.module-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.getAttribute('data-target');

                // Validar Permisos si el usuario es técnico
                if (targetId === 'mod-contabilidad' && !perms.canAccessAccounting) {
                    showToast("🔒 Acceso Denegado: El módulo de Contabilidad/Caja requiere rol Administrador.", "danger");
                    return;
                }
                if (targetId === 'mod-reservas' && !perms.canAccessAccounting) {
                    showToast("🔒 Acceso Denegado: El módulo de Reservas requiere rol Administrador.", "danger");
                    return;
                }
                if (targetId === 'mod-configuracion' && !perms.canAccessSettings) {
                    showToast("🔒 Acceso Denegado: El módulo de Configuración requiere rol Administrador.", "danger");
                    return;
                }

                // Cambiar clase activa en tabs
                tabsNav.querySelectorAll('.module-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Mostrar contenido objetivo
                document.querySelectorAll('.module-content').forEach(mod => mod.style.display = 'none');
                const targetMod = document.getElementById(targetId);
                if (targetMod) targetMod.style.display = 'block';

                if (targetId === 'mod-ordenes-guardadas') {
                    renderSavedOrders();
                } else if (targetId === 'mod-contabilidad') {
                    renderAccountingSummary();
                } else if (targetId === 'mod-reservas') {
                    renderReservationsAdmin();
                } else if (targetId === 'mod-configuracion') {
                    renderUsersTable();
                    initUserManagementModal();
                }
            });
        });

        // Inicializar botón de recarga de reservas si existe en el DOM
        document.getElementById('btnRefreshReservations')?.addEventListener('click', renderReservationsAdmin);
    }

    // 4. Interacción Grid Patrón 3x3
    let selectedPatternNodes = [];
    const patternGrid = document.getElementById('patternGrid');
    const ordPatternString = document.getElementById('ordPatternString');
    const clearPatternBtn = document.getElementById('clearPatternBtn');

    if (patternGrid) {
        patternGrid.querySelectorAll('.pattern-node').forEach(node => {
            node.addEventListener('click', () => {
                const num = node.getAttribute('data-num');
                if (!selectedPatternNodes.includes(num)) {
                    selectedPatternNodes.push(num);
                    node.classList.add('selected');
                    ordPatternString.value = selectedPatternNodes.join(' - ');
                }
            });
        });
    }

    if (clearPatternBtn) {
        clearPatternBtn.addEventListener('click', () => {
            selectedPatternNodes = [];
            patternGrid.querySelectorAll('.pattern-node').forEach(n => n.classList.remove('selected'));
            if (ordPatternString) ordPatternString.value = '';
        });
    }

    // 5. Plantillas Rápidas de Servicio
    document.querySelectorAll('.quick-template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const falla = btn.getAttribute('data-falla');
            const costo = parseFloat(btn.getAttribute('data-costo')) || 0;

            const ordIssues = document.getElementById('ordIssues');
            const ordLaborCost = document.getElementById('ordLaborCost');

            if (ordIssues) {
                ordIssues.value = ordIssues.value ? `${ordIssues.value}\n[Plantilla]: ${falla}` : falla;
            }
            if (ordLaborCost) {
                ordLaborCost.value = costo;
            }
            calculateOrderTotal();
            showToast(`Plantilla "${btn.textContent.trim()}" aplicada.`);
        });
    });

    // 6. Calculadora Financiera en Tiempo Real
    ['ordLaborCost', 'ordPartsCost', 'ordDiscount', 'ordSurcharge'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.addEventListener('input', calculateOrderTotal);
    });

    function calculateOrderTotal() {
        const labor = parseFloat(document.getElementById('ordLaborCost')?.value || 0);
        const parts = parseFloat(document.getElementById('ordPartsCost')?.value || 0);
        const discount = perms.canEditDiscounts ? parseFloat(document.getElementById('ordDiscount')?.value || 0) : 0;
        const surcharge = perms.canEditDiscounts ? parseFloat(document.getElementById('ordSurcharge')?.value || 0) : 0;

        const subtotal = labor + parts;
        const adj = surcharge - discount;
        const total = Math.max(0, subtotal + adj);

        if (document.getElementById('lblSubtotal')) document.getElementById('lblSubtotal').textContent = `$${subtotal.toFixed(2)}`;
        if (document.getElementById('lblAdjustments')) document.getElementById('lblAdjustments').textContent = `$${adj.toFixed(2)}`;
        if (document.getElementById('lblTotalAmount')) document.getElementById('lblTotalAmount').textContent = `$${total.toFixed(2)}`;
    }

    // 7. Guardar Orden
    const btnSaveOrder = document.getElementById('btnSaveOrder');
    if (btnSaveOrder) {
        btnSaveOrder.addEventListener('click', async () => {
            const client = document.getElementById('ordClient')?.value.trim();
            const phone = document.getElementById('ordPhone')?.value.trim();
            const brandModel = document.getElementById('ordBrandModel')?.value.trim();
            const imei = document.getElementById('ordImei')?.value.trim();
            const issues = document.getElementById('ordIssues')?.value.trim();

            if (!client || !phone || !brandModel || !imei || !issues) {
                showToast("Por favor completa los campos obligatorios (*)", "danger");
                return;
            }

            const code = document.getElementById('currentOrdCode')?.textContent || `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;
            const labor = parseFloat(document.getElementById('ordLaborCost')?.value || 0);
            const parts = parseFloat(document.getElementById('ordPartsCost')?.value || 0);
            const discount = perms.canEditDiscounts ? parseFloat(document.getElementById('ordDiscount')?.value || 0) : 0;
            const surcharge = perms.canEditDiscounts ? parseFloat(document.getElementById('ordSurcharge')?.value || 0) : 0;
            const total = Math.max(0, labor + parts + surcharge - discount);

            const newOrder = {
                code: code,
                client: client,
                phone: phone,
                deviceType: document.getElementById('ordDeviceType')?.value || 'Celular',
                brandModel: brandModel,
                imei: imei,
                physicalState: document.getElementById('ordPhysicalState')?.value || 'Rayones leves',
                accessories: document.getElementById('ordAccessories')?.value || '',
                issues: issues,
                pattern: ordPatternString?.value || 'Sin Patrón',
                pin: document.getElementById('ordPinCode')?.value || 'Sin PIN',
                status: document.getElementById('ordStatus')?.value || 'recibido',
                laborCost: labor,
                partsCost: parts,
                discount: discount,
                surcharge: surcharge,
                total: total,
                createdAt: new Date().toISOString()
            };

            const existingIdx = ordenesList.findIndex(o => o.code === code);
            if (existingIdx >= 0) {
                ordenesList[existingIdx] = newOrder;
            } else {
                ordenesList.push(newOrder);
            }

            // Enviar backend API
            try {
                await fetch(`${API_URL}/api/ordenes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newOrder)
                });
            } catch (e) {
                console.log("Nota: Guardado en memoria activa.");
            }

            // Notificar en tiempo real a todas las instancias (Técnico y Admin)
            broadcastChannel.postMessage({ type: 'order_updated' });
            localStorage.setItem('drakotec_last_order_update', Date.now().toString());

            showToast(`✅ Orden ${code} guardada con éxito.`);
            renderSavedOrders();
            renderTechOrders();
        });
    }

    // 8. Botones de Impresión y WhatsApp
    const btnPrintTicket = document.getElementById('btnPrintTicket');
    const btnPrintPdf = document.getElementById('btnPrintPdf');
    const btnSendWhatsapp = document.getElementById('btnSendWhatsapp');
    const printModal = document.getElementById('printModal');
    const closePrintModalBtn = document.getElementById('closePrintModalBtn');
    const btnExecutePrint = document.getElementById('btnExecutePrint');

    if (btnPrintTicket) {
        btnPrintTicket.addEventListener('click', () => openPrintModal('ticket'));
    }
    if (btnPrintPdf) {
        btnPrintPdf.addEventListener('click', () => openPrintModal('pdf'));
    }
    if (closePrintModalBtn && printModal) {
        closePrintModalBtn.addEventListener('click', () => printModal.style.display = 'none');
    }
    if (btnExecutePrint) {
        btnExecutePrint.addEventListener('click', () => window.print());
    }

    function openPrintModal(type) {
        const client = document.getElementById('ordClient')?.value || 'Cliente General';
        const phone = document.getElementById('ordPhone')?.value || 'N/A';
        const brandModel = document.getElementById('ordBrandModel')?.value || 'Dispositivo';
        const imei = document.getElementById('ordImei')?.value || 'N/A';
        const issues = document.getElementById('ordIssues')?.value || 'Diagnóstico preliminar';
        const pattern = ordPatternString?.value || 'Sin Patrón';
        const pin = document.getElementById('ordPinCode')?.value || 'Sin PIN';
        const code = document.getElementById('currentOrdCode')?.textContent || '#ORD-8042';
        const total = document.getElementById('lblTotalAmount')?.textContent || '$0.00';

        const printContent = document.getElementById('printTicketContent');
        if (!printContent || !printModal) return;

        printContent.innerHTML = `
            <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
                <h3 style="margin:0; font-size: 1.1rem; color:#000;">DRAKOTEC TALLER TÉCNICO</h3>
                <p style="margin:2px 0; font-size: 0.75rem;">RIF: J-50491823-0 | Tel: +58 412 1234567</p>
                <p style="margin:0; font-size: 0.8rem; font-weight: bold;">ORDEN DE SERVICIO: ${code}</p>
            </div>
            <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
            <p><strong>Cliente:</strong> ${client} (${phone})</p>
            <p><strong>Equipo:</strong> ${brandModel}</p>
            <p><strong>IMEI/Serie:</strong> ${imei}</p>
            <p><strong>Seguridad:</strong> Patrón [${pattern}] | PIN: ${pin}</p>
            <p><strong>Falla Reportada:</strong> ${issues}</p>
            <hr style="border-top: 1px dashed #000; margin: 10px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 1rem; font-weight: bold;">
                <span>Total Cotizado:</span>
                <span>${total}</span>
            </div>
            <hr style="border-top: 1px dashed #000; margin: 10px 0;">
            <p style="font-size: 0.65rem; text-align: center; margin-top: 8px;">
                * Garantía de 30 días en mano de obra. Todo equipo no retirado en 60 días pasa a resguardo.
            </p>
            <div style="margin-top: 24px; text-align: center; border-top: 1px solid #000; padding-top: 4px; font-size: 0.75rem;">
                Firma de Conformidad del Cliente
            </div>
        `;

        printModal.style.display = 'flex';
    }

    if (btnSendWhatsapp) {
        btnSendWhatsapp.addEventListener('click', () => {
            const client = document.getElementById('ordClient')?.value || 'Cliente';
            const phone = document.getElementById('ordPhone')?.value || '';
            const brandModel = document.getElementById('ordBrandModel')?.value || 'su equipo';
            const code = document.getElementById('currentOrdCode')?.textContent || '#ORD-8042';
            const status = document.getElementById('ordStatus')?.options[document.getElementById('ordStatus').selectedIndex]?.text || 'Recibido';
            const total = document.getElementById('lblTotalAmount')?.textContent || '$0.00';

            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const msg = `Hola *${client}*, te contactamos de *Drakotec Taller Técnico*. Tu equipo *${brandModel}* (Orden *${code}*) se encuentra en estado: *${status}*. Muestrario total: ${total}. ¡Cualquier duda estamos a la orden!`;

            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        });
    }

    // 9. Búsqueda y Filtrado de Órdenes Guardadas
    const searchOrdersInput = document.getElementById('searchOrdersInput');
    const filterStatusSelect = document.getElementById('filterStatusSelect');

    if (searchOrdersInput) searchOrdersInput.addEventListener('input', renderSavedOrders);
    if (filterStatusSelect) filterStatusSelect.addEventListener('change', renderSavedOrders);
}

// Renderizar Órdenes Guardadas con RBAC
function renderSavedOrders() {
    const tbody = document.getElementById('savedOrdersTableBody');
    if (!tbody) return;

    const user = JSON.parse(sessionStorage.getItem('drakotec_user')) || { role: 'tecnico' };
    const perms = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.tecnico;

    const searchTerm = (document.getElementById('searchOrdersInput')?.value || '').toLowerCase();
    const filterStatus = document.getElementById('filterStatusSelect')?.value || 'ALL';

    tbody.innerHTML = '';

    const filtered = ordenesList.filter(o => {
        const matchesSearch = (o.code || '').toLowerCase().includes(searchTerm) ||
                              (o.client || '').toLowerCase().includes(searchTerm) ||
                              (o.brandModel || '').toLowerCase().includes(searchTerm) ||
                              (o.imei || '').toLowerCase().includes(searchTerm);

        const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No se encontraron órdenes registradas.</td></tr>`;
        return;
    }

    filtered.forEach(o => {
        const tr = document.createElement('tr');
        const statusClass = `status-badge ${o.status || 'recibido'}`;

        tr.innerHTML = `
            <td><strong>${o.code}</strong></td>
            <td>${o.client}<br><span style="font-size:0.75rem; color:var(--text-muted);">${o.phone || ''}</span></td>
            <td>${o.brandModel}<br><span style="font-size:0.75rem; color:var(--text-muted);">IMEI: ${o.imei || 'N/A'}</span></td>
            <td title="${o.issues || ''}">${(o.issues || '').substring(0, 35)}...</td>
            <td><span class="${statusClass}">${o.status || 'recibido'}</span></td>
            <td><strong>$${(o.total || 0).toFixed(2)}</strong></td>
            <td>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    <button class="btn btn-secondary load-order-btn" data-code="${o.code}" style="padding: 4px 8px; font-size: 0.75rem;">📂 Cargar</button>
                    <button class="btn btn-secondary wa-order-btn" data-code="${o.code}" style="padding: 4px 8px; font-size: 0.75rem; border-color:#10b981; color:#10b981;">💬 WA</button>
                    
                    <!-- Botón Borrar Orden (Oculto para rol Técnico por RBAC) -->
                    <button class="btn btn-secondary delete-order-btn ${!perms.canDeleteOrder ? 'btn-restricted-hidden' : ''}" data-code="${o.code}" style="padding: 4px 8px; font-size: 0.75rem; border-color:#ef4444; color:#ef4444;">🗑️ Borrar</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Cargar Orden
    tbody.querySelectorAll('.load-order-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.getAttribute('data-code');
            const o = ordenesList.find(item => item.code === code);
            if (o) {
                if (document.getElementById('ordClient')) document.getElementById('ordClient').value = o.client;
                if (document.getElementById('ordPhone')) document.getElementById('ordPhone').value = o.phone || '';
                if (document.getElementById('ordDeviceType')) document.getElementById('ordDeviceType').value = o.deviceType || 'Celular';
                if (document.getElementById('ordBrandModel')) document.getElementById('ordBrandModel').value = o.brandModel;
                if (document.getElementById('ordImei')) document.getElementById('ordImei').value = o.imei || '';
                if (document.getElementById('ordPhysicalState')) document.getElementById('ordPhysicalState').value = o.physicalState || 'Rayones leves';
                if (document.getElementById('ordAccessories')) document.getElementById('ordAccessories').value = o.accessories || '';
                if (document.getElementById('ordIssues')) document.getElementById('ordIssues').value = o.issues;
                if (document.getElementById('ordStatus')) document.getElementById('ordStatus').value = o.status;
                if (document.getElementById('ordPatternString')) document.getElementById('ordPatternString').value = o.pattern || '';
                if (document.getElementById('ordPinCode')) document.getElementById('ordPinCode').value = o.pin || '';
                if (document.getElementById('ordLaborCost')) document.getElementById('ordLaborCost').value = o.laborCost || 0;
                if (document.getElementById('ordPartsCost')) document.getElementById('ordPartsCost').value = o.partsCost || 0;
                if (document.getElementById('ordDiscount')) document.getElementById('ordDiscount').value = o.discount || 0;
                if (document.getElementById('ordSurcharge')) document.getElementById('ordSurcharge').value = o.surcharge || 0;
                if (document.getElementById('currentOrdCode')) document.getElementById('currentOrdCode').textContent = o.code;

                // Cambiar a la pestaña principal activa
                const firstTab = document.querySelector('#moduleTabsNav .module-tab');
                if (firstTab) firstTab.click();

                showToast(`Orden ${o.code} cargada en formulario.`);
            }
        });
    });

    // Enviar WhatsApp
    tbody.querySelectorAll('.wa-order-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.getAttribute('data-code');
            const o = ordenesList.find(item => item.code === code);
            if (o && o.phone) {
                const cleanPhone = o.phone.replace(/[^0-9]/g, '');
                const msg = `Hola *${o.client}*, tu equipo *${o.brandModel}* (Orden *${o.code}*) está en estado: *${o.status.toUpperCase()}*. Total: $${(o.total || 0).toFixed(2)}. ¡Saludos, Drakotec!`;
                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
            }
        });
    });

    // Borrar Orden (Auditado)
    tbody.querySelectorAll('.delete-order-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!perms.canDeleteOrder) {
                showToast("🔒 Permiso Denegado: Solo el Administrador puede eliminar órdenes de taller.", "danger");
                return;
            }
            const code = btn.getAttribute('data-code');
            if (confirm(`¿Estás seguro de eliminar permanentemente la orden ${code}? Esta acción es irreversible.`)) {
                ordenesList = ordenesList.filter(o => o.code !== code);
                
                try {
                    await fetch(`${API_URL}/api/ordenes/${code}`, { method: 'DELETE' });
                } catch (err) {
                    console.error("Error al eliminar orden del servidor:", err);
                }

                broadcastChannel.postMessage({ type: 'order_updated' });
                localStorage.setItem('drakotec_last_order_update', Date.now().toString());
                
                showToast(`Orden ${code} eliminada por Administrador.`, "danger");
                renderSavedOrders();
                renderTechOrders();
            }
        });
    });
}

// Variables globales para el módulo POS
let posCart = [];
let movimientosList = [];

// Cargar e integrar Movimientos Contables en el Panel de Administración
async function fetchMovimientos() {
    try {
        const res = await fetch(`${API_URL}/api/movimientos`);
        if (res.ok) {
            movimientosList = await res.json();
            renderMovimientosTabla();
            renderAccountingSummary();
        }
    } catch (err) {
        console.error("Error al cargar movimientos contables:", err);
    }
}

// Renderizar Resumen de Contabilidad y Caja (Pestaña Admin)
function renderAccountingSummary() {
    const totalIngresos = movimientosList
        .filter(m => m.tipo === 'INGRESO')
        .reduce((acc, curr) => acc + (curr.monto || 0), 0);

    const totalGastos = movimientosList
        .filter(m => m.tipo === 'GASTO')
        .reduce((acc, curr) => acc + (curr.monto || 0), 0);

    const totalPendientes = ordenesList
        .filter(o => o.status !== 'entregado')
        .reduce((acc, curr) => acc + (curr.total || 0), 0);

    const saldoNeto = totalIngresos - totalGastos;

    if (document.getElementById('cajaIngresos')) document.getElementById('cajaIngresos').textContent = `$${totalIngresos.toFixed(2)}`;
    if (document.getElementById('cajaGastos')) document.getElementById('cajaGastos').textContent = `$${totalGastos.toFixed(2)}`;
    if (document.getElementById('cajaPendientes')) document.getElementById('cajaPendientes').textContent = `$${totalPendientes.toFixed(2)}`;
    if (document.getElementById('cajaSaldo')) document.getElementById('cajaSaldo').textContent = `$${saldoNeto.toFixed(2)}`;
}

// Renderizar Tabla Histórica de Movimientos de Caja
function renderMovimientosTabla() {
    const tbody = document.getElementById('tablaMovimientosBody');
    if (!tbody) return;

    const filtro = document.getElementById('filtroTipoMovimiento')?.value || 'TODOS';
    const filtrados = movimientosList.filter(m => filtro === 'TODOS' || m.tipo === filtro);

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">No hay movimientos registrados.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    filtrados.forEach(m => {
        const fechaStr = new Date(m.createdAt).toLocaleString();
        const tr = document.createElement('tr');
        const esIngreso = m.tipo === 'INGRESO';

        tr.innerHTML = `
            <td style="font-size: 0.8rem;">${fechaStr}</td>
            <td><span class="status-badge ${esIngreso ? 'listo' : 'expirado'}">${m.tipo}</span></td>
            <td><small>${m.categoria}</small></td>
            <td style="font-size: 0.85rem;">${m.descripcion}</td>
            <td><small>${m.metodoPago}</small></td>
            <td><strong>${m.comprobanteNum || 'S/C'}</strong></td>
            <td style="font-weight: bold; color: ${esIngreso ? '#34d399' : '#ef4444'};">${esIngreso ? '+' : '-'}$${m.monto.toFixed(2)}</td>
            <td>
                <div style="display: flex; gap: 4px;">
                    <button type="button" class="btn-action edit-mov-btn" data-id="${m._id}" title="Editar Movimiento" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; cursor: pointer;">✏️</button>
                    <button type="button" class="btn-action delete-mov-btn" data-id="${m._id}" title="Eliminar Movimiento" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; cursor: pointer;">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Escuchadores de Editar
    tbody.querySelectorAll('.edit-mov-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const m = movimientosList.find(item => item._id === id);
            if (m) {
                document.getElementById('editMovId').value = m._id;
                document.getElementById('editMovMonto').value = m.monto;
                document.getElementById('editMovCategoria').value = m.categoria || 'VENTA_PRESENCIAL';
                document.getElementById('editMovDescripcion').value = m.descripcion;
                document.getElementById('editMovMetodoPago').value = m.metodoPago || 'EFECTIVO';
                document.getElementById('modalEditarMovimiento').style.display = 'flex';
            }
        });
    });

    // Escuchadores de Eliminar
    tbody.querySelectorAll('.delete-mov-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (confirm("¿Estás seguro de eliminar este movimiento contable? Esta acción afectará el balance en caja.")) {
                try {
                    const res = await fetch(`${API_URL}/api/movimientos/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        showToast("🗑️ Movimiento eliminado correctamente.");
                        await fetchMovimientos();
                    } else {
                        showToast("❌ Error al eliminar movimiento.", "danger");
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        });
    });
}

// Inicializar Módulo POS (Venta Presencial)
function initPOSModule() {
    const btnAbrirPOS = document.getElementById('btnAbrirPOS');
    const modalPOS = document.getElementById('modalPOS');
    const btnCerrarPOS = document.getElementById('btnCerrarPOS');
    const btnRegistrarGasto = document.getElementById('btnRegistrarGasto');
    const modalGasto = document.getElementById('modalGasto');
    const btnCerrarGasto = document.getElementById('btnCerrarGasto');
    const modalEditarMovimiento = document.getElementById('modalEditarMovimiento');
    const btnCerrarEditarMov = document.getElementById('btnCerrarEditarMov');

    // Botón Venta Presencial
    if (btnAbrirPOS && modalPOS) {
        btnAbrirPOS.addEventListener('click', (e) => {
            e.preventDefault();
            posCart = [];
            renderPOSCart();
            poblacionSelectPOSProductos();
            modalPOS.style.display = 'flex';
        });
    }


    if (btnCerrarPOS && modalPOS) {
        btnCerrarPOS.onclick = () => {
            modalPOS.style.display = 'none';
        };
    }

    btnRegistrarGasto?.addEventListener('click', () => {
        if (modalGasto) modalGasto.style.display = 'flex';
    });

    btnCerrarGasto?.addEventListener('click', () => {
        if (modalGasto) modalGasto.style.display = 'none';
    });

    btnCerrarEditarMov?.addEventListener('click', () => {
        if (modalEditarMovimiento) modalEditarMovimiento.style.display = 'none';
    });

    // Formulario de Editar Movimiento Submit
    document.getElementById('formEditarMovimiento')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editMovId').value;
        const monto = parseFloat(document.getElementById('editMovMonto').value);
        const categoria = document.getElementById('editMovCategoria').value;
        const descripcion = document.getElementById('editMovDescripcion').value.trim();
        const metodoPago = document.getElementById('editMovMetodoPago').value;

        try {
            const res = await fetch(`${API_URL}/api/movimientos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monto, categoria, descripcion, metodoPago })
            });

            if (res.ok) {
                showToast("✏️ Movimiento actualizado correctamente.");
                modalEditarMovimiento.style.display = 'none';
                await fetchMovimientos();
            } else {
                showToast("❌ Error al actualizar el movimiento.", "danger");
            }
        } catch (err) {
            console.error(err);
        }
    });

// ==========================================
// FUNCIONES GLOBALES DE CONTABILIDAD Y CAJA (Exportar Excel & Cierre Diario)
// ==========================================

function abrirCierreCaja() {
    const modalCierre = document.getElementById('modalCierreCaja');
    if (!modalCierre) {
        console.error("Modal modalCierreCaja no encontrado");
        return;
    }

    const totalIngresos = (movimientosList || []).filter(m => m.tipo === 'INGRESO').reduce((sum, m) => sum + (m.monto || 0), 0);
    const totalGastos = (movimientosList || []).filter(m => m.tipo === 'GASTO').reduce((sum, m) => sum + (m.monto || 0), 0);
    const saldoNeto = totalIngresos - totalGastos;

    if (document.getElementById('cierreFecha')) document.getElementById('cierreFecha').textContent = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
    if (document.getElementById('cierreIngresos')) document.getElementById('cierreIngresos').textContent = `$${totalIngresos.toFixed(2)}`;
    if (document.getElementById('cierreGastos')) document.getElementById('cierreGastos').textContent = `$${totalGastos.toFixed(2)}`;
    if (document.getElementById('cierreSaldo')) document.getElementById('cierreSaldo').textContent = `$${saldoNeto.toFixed(2)}`;

    modalCierre.style.display = 'flex';
}

function exportarReporteExcelCSV() {
    if (!movimientosList || movimientosList.length === 0) {
        if (typeof showToast === 'function') showToast("⚠️ No hay movimientos para exportar.", "danger");
        else alert("No hay movimientos para exportar.");
        return;
    }

    let csvRows = [];
    csvRows.push(["ID Movimiento", "Fecha y Hora", "Tipo", "Categoría", "Descripción / Concepto", "Método de Pago", "Comprobante", "Monto ($)"].join(";"));

    movimientosList.forEach(m => {
        const fechaStr = new Date(m.createdAt).toLocaleString().replace(/,/g, '');
        const desc = `"${(m.descripcion || '').replace(/"/g, '""')}"`;
        const montoFormateado = (m.monto || 0).toFixed(2).replace('.', ',');
        csvRows.push([m._id, fechaStr, m.tipo, m.categoria || 'GENERAL', desc, m.metodoPago, m.comprobanteNum || 'S/C', montoFormateado].join(";"));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Contable_Drakotec_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof showToast === 'function') showToast("📊 Reporte descargado. Compatible con Excel y LibreOffice.");
}

// Asignación explícita a window para garantizar acceso desde onclick en HTML
window.abrirCierreCaja = abrirCierreCaja;
window.exportarReporteExcelCSV = exportarReporteExcelCSV;




    btnCerrarGasto?.addEventListener('click', () => {
        if (modalGasto) modalGasto.style.display = 'none';
    });

    // Agregar producto seleccionado al carrito POS
    document.getElementById('btnPosAgregarProd')?.addEventListener('click', () => {
        const select = document.getElementById('posSelectProducto');
        const cantInput = document.getElementById('posCantProducto');
        const prodId = parseInt(select.value);
        const cant = parseInt(cantInput.value) || 1;

        if (!prodId) {
            showToast("⚠️ Seleccione un producto válido.");
            return;
        }

        const producto = productosList.find(p => p.id === prodId);
        if (!producto) return;


        if (producto.stock < cant) {
            showToast(`⚠️ Stock insuficiente. Solo quedan ${producto.stock} unidades de ${producto.name}`);
            return;
        }

        const itemExistente = posCart.find(i => i.id === prodId);
        if (itemExistente) {
            itemExistente.quantity += cant;
        } else {
            posCart.push({
                id: producto.id,
                name: producto.name,
                price: producto.price,
                quantity: cant
            });
        }

        renderPOSCart();
    });

    // Cargar Reserva en POS
    document.getElementById('btnPosCargarReserva')?.addEventListener('click', async () => {
        const codeInput = document.getElementById('posReservaCodeInput').value.trim();
        if (!codeInput) return;

        try {
            const res = await fetch(`${API_URL}/api/reservas`);
            if (res.ok) {
                const reservas = await res.json();
                const resv = reservas.find(r => r.code.toUpperCase() === codeInput.toUpperCase());
                if (!resv) {
                    showToast("❌ Reserva no encontrada.");
                    return;
                }
                if (resv.status !== 'activa') {
                    showToast(`⚠️ La reserva ya está ${resv.status}.`);
                    return;
                }

                // Cargar datos en el POS
                document.getElementById('posClienteNombre').value = resv.clientName;
                posCart = resv.items.map(i => ({
                    id: i.productId,
                    name: i.name,
                    price: i.price,
                    quantity: i.quantity
                }));
                posCart._reservaCode = resv.code;
                renderPOSCart();
                showToast(`✅ Reserva ${resv.code} cargada al POS con éxito.`);
            }
        } catch (err) {
            console.error(err);
        }
    });

    // Enviar Formulario Venta Presencial
    document.getElementById('posFormVenta')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (posCart.length === 0) {
            showToast("⚠️ Añada al menos un producto antes de finalizar.");
            return;
        }

        const clienteNombre = document.getElementById('posClienteNombre').value.trim();
        const clienteDoc = document.getElementById('posClienteDoc').value.trim();
        const metodoPago = document.getElementById('posMetodoPago').value;
        const tipoComprobante = document.getElementById('posTipoComprobante').value;
        const total = posCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        try {
            const res = await fetch(`${API_URL}/api/ventas-presenciales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: posCart,
                    metodoPago,
                    tipoComprobante,
                    cliente: { nombre: clienteNombre, docIdentidad: clienteDoc },
                    total,
                    reservaCode: posCart._reservaCode || null
                })
            });

            const data = await res.json();
            if (res.ok) {
                showToast(`🎉 ${data.message}`);
                modalPOS.style.display = 'none';

                // Mostrar Factura/Ticket Imprimible
                mostrarFacturaEmitida({
                    num: data.comprobanteNum,
                    fecha: new Date().toLocaleDateString(),
                    cliente: clienteNombre,
                    doc: clienteDoc || 'S/N',
                    metodo: metodoPago,
                    items: posCart,
                    total: total
                });

                // Recargar productos y movimientos
                await fetchProductos(true);
                await fetchMovimientos();
            } else {
                showToast(`❌ Error: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
            showToast("❌ Error al conectar con el servidor.");
        }
    });

    // Formulario Registrar Gasto Manual
    document.getElementById('formRegistrarGasto')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const monto = parseFloat(document.getElementById('gastoMonto').value);
        const categoria = document.getElementById('gastoCategoria').value;
        const descripcion = document.getElementById('gastoDescripcion').value.trim();
        const metodoPago = document.getElementById('gastoMetodoPago').value;

        try {
            const res = await fetch(`${API_URL}/api/movimientos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: 'GASTO',
                    categoria,
                    monto,
                    metodoPago,
                    descripcion
                })
            });

            if (res.ok) {
                showToast("💸 Egreso de caja registrado correctamente.");
                modalGasto.style.display = 'none';
                document.getElementById('formRegistrarGasto').reset();
                await fetchMovimientos();
            }
        } catch (err) {
            console.error(err);
        }
    });

    // Listener para filtro de movimientos
    document.getElementById('filtroTipoMovimiento')?.addEventListener('change', renderMovimientosTabla);
    document.getElementById('btnCerrarFactura')?.addEventListener('click', () => {
        document.getElementById('modalFactura').style.display = 'none';
    });
}

function poblacionSelectPOSProductos() {
    const select = document.getElementById('posSelectProducto');
    if (!select) return;

    select.innerHTML = '<option value="">-- Seleccionar Producto --</option>';
    productosList.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} - $${p.price.toFixed(2)} (Stock: ${p.stock})`;
        select.appendChild(opt);
    });
}


function renderPOSCart() {
    const tbody = document.querySelector('#posTablaItems tbody');
    const totalEl = document.getElementById('posTotalMonto');
    if (!tbody) return;

    let total = 0;
    if (posCart.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">Sin productos agregados</td></tr>`;
        if (totalEl) totalEl.textContent = '0.00';
        return;
    }

    tbody.innerHTML = '';
    posCart.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${subtotal.toFixed(2)}</td>
            <td><button type="button" onclick="eliminarItemPOS(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer;">&times;</button></td>
        `;
        tbody.appendChild(tr);
    });

    if (totalEl) totalEl.textContent = total.toFixed(2);
}

function eliminarItemPOS(index) {
    posCart.splice(index, 1);
    renderPOSCart();
}

function mostrarFacturaEmitida(datos) {
    const modalFactura = document.getElementById('modalFactura');
    if (!modalFactura) return;

    document.getElementById('facNum').textContent = datos.num;
    document.getElementById('facFecha').textContent = datos.fecha;
    document.getElementById('facCliente').textContent = datos.cliente;
    document.getElementById('facDoc').textContent = datos.doc;
    document.getElementById('facMetodo').textContent = datos.metodo;
    document.getElementById('facTotalMonto').textContent = datos.total.toFixed(2);

    const tbody = document.getElementById('facItemsBody');
    tbody.innerHTML = '';

    datos.items.forEach(i => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i.quantity}x ${i.name}</td>
            <td style="text-align: right;">$${(i.price * i.quantity).toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });

    modalFactura.style.display = 'flex';
}


function renderTechOrders() {
    const tbody = document.getElementById('techOrdersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const sorted = [...ordenesList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    sorted.forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${o.code}</strong></td>
            <td>${o.client}</td>
            <td>${o.brandModel}</td>
            <td title="${o.accessories ? 'Accesorios: ' + o.accessories : ''}">${o.issues}</td>
            <td>
                <select class="form-select state-changer" data-code="${o.code}">
                    <option value="recibido" ${o.status === 'recibido' ? 'selected' : ''}>Recibido</option>
                    <option value="diagnostico" ${o.status === 'diagnostico' ? 'selected' : ''}>Diagnóstico</option>
                    <option value="reparacion" ${o.status === 'reparacion' ? 'selected' : ''}>Reparación</option>
                    <option value="listo" ${o.status === 'listo' ? 'selected' : ''}>Listo para entrega</option>
                    <option value="entregado" ${o.status === 'entregado' ? 'selected' : ''}>Entregado</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.state-changer').forEach(select => {
        select.addEventListener('change', async () => {
            const code = select.getAttribute('data-code');
            const newStatus = select.value;

            const ord = ordenesList.find(item => item.code === code);
            if (ord) ord.status = newStatus;

            try {
                await fetch(`${API_URL}/api/ordenes/${code}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
            } catch (err) {}

            showToast(`Estado de orden ${code} actualizado a: ${newStatus}`);
            renderSavedOrders();
        });
    });
}

function renderAdminProducts() {
    const tbody = document.getElementById('adminProductsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    productosList.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${p.price.toLocaleString('es-BO')} Bs.</td>
            <td><span class="${p.stock === 0 ? 'gradient-text' : ''}" style="font-weight:700;">${p.stock}</span></td>
            <td>
                <button class="btn-edit-inline edit-product-btn" data-id="${p.id}">Editar</button>
                <button class="btn-delete-inline delete-product-btn" data-id="${p.id}" style="margin-left: 6px;">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            const p = productosList.find(item => item.id === id);
            
            if (p) {
                document.getElementById('prodId').value = p.id;
                document.getElementById('prodName').value = p.name;
                document.getElementById('prodPrice').value = p.price;
                document.getElementById('prodStock').value = p.stock;
                document.getElementById('prodCategory').value = p.category;
                document.getElementById('prodSpecs').value = p.specs;
                
                document.getElementById('productFormTitle').textContent = "Editar Producto ID: " + p.id;
                document.getElementById('prodSubmitBtn').textContent = "Guardar Cambios";
                document.getElementById('cancelEditBtn').style.display = 'inline-flex';
                document.getElementById('imageRequiredNotice').textContent = "Opcional. Sube nuevas imágenes para reemplazar las actuales.";

                const prodImageInput = document.getElementById('prodImage');
                if (prodImageInput) {
                    prodImageInput.removeAttribute('required');
                }

                const previewContainer = document.getElementById('editImagesPreview');
                if (previewContainer) {
                    previewContainer.innerHTML = '';
                    const imgs = p.images && p.images.length > 0 ? p.images : [p.imagePath];
                    imgs.forEach(img => {
                        const imgEl = document.createElement('img');
                        imgEl.src = img;
                        imgEl.style.width = '60px';
                        imgEl.style.height = '60px';
                        imgEl.style.objectFit = 'contain';
                        imgEl.style.border = '1px solid var(--border-glass)';
                        imgEl.style.borderRadius = '4px';
                        imgEl.style.background = 'rgba(255,255,255,0.05)';
                        previewContainer.appendChild(imgEl);
                    });
                }
                
                document.getElementById('productForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    });

    document.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.getAttribute('data-id'));
            const p = productosList.find(item => item.id === id);
            
            if (!p) return;

            if (confirm(`¿Estás seguro de que deseas eliminar el producto "${p.name}"?`)) {
                try {
                    const res = await fetch(`${API_URL}/api/productos/${id}`, {
                        method: 'DELETE'
                    });

                    if (res.ok) {
                        showToast(`Producto "${p.name}" eliminado con éxito.`);
                        await fetchProductos(true);
                    } else {
                        const errData = await res.json();
                        showToast(errData.error || "Error al eliminar el producto.", "danger");
                    }
                } catch (err) {
                    console.error("Error al eliminar producto:", err);
                    showToast("Error de conexión al eliminar el producto.", "danger");
                }
            }
        });
    });
}

async function renderReservationsAdmin() {
    const tbody = document.getElementById('adminReservationsTableBody');
    const logsContainer = document.getElementById('whatsappNotificationsLog');
    if (!tbody || !logsContainer) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando reservas...</td></tr>';
    logsContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Cargando historial...</p>';

    // 1. Obtener y pintar reservas (con manejo de errores independiente)
    try {
        const res = await fetch(`${API_URL}/api/reservas`);
        if (res.ok) {
            const reservas = await res.json();
            tbody.innerHTML = '';
            if (reservas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No hay reservas registradas.</td></tr>';
            } else {
                reservas.forEach(r => {
                    const tr = document.createElement('tr');
                    const itemsText = r.items.map(i => `${i.name} (${i.quantity}x)`).join('<br>');
                    const expiresDate = new Date(r.expiresAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
                    
                    let statusBadge = '';
                    if (r.status === 'activa') {
                        statusBadge = '<span class="status-badge status-progress" style="background:rgba(217, 119, 6, 0.1);color:#d97706;border-color:rgba(217, 119, 6, 0.2);">Activa</span>';
                    } else if (r.status === 'liberada') {
                        statusBadge = '<span class="status-badge" style="background:rgba(239, 68, 68, 0.1);color:#ef4444;border-color:rgba(239, 68, 68, 0.2);">Liberada</span>';
                    } else if (r.status === 'completada') {
                        statusBadge = '<span class="status-badge" style="background:rgba(16, 185, 129, 0.1);color:#10b981;border-color:rgba(16, 185, 129, 0.2);">Completada</span>';
                    }

                    let actionButtons = '-';
                    if (r.status === 'activa') {
                        actionButtons = `
                            <button class="btn-edit-inline complete-reservation-btn" data-code="${r.code}" style="background:rgba(16, 185, 129, 0.1);color:#10b981;border-color:rgba(16, 185, 129, 0.2);">Vendido</button>
                            <button class="btn-delete-inline release-reservation-btn" data-code="${r.code}" style="margin-left:5px;">Liberar</button>
                        `;
                    }

                    tr.innerHTML = `
                        <td style="font-family:monospace;font-weight:700;">${r.code}</td>
                        <td>
                            <strong>${r.clientName}</strong><br>
                            <span style="font-size:0.8rem;color:var(--text-muted);">${r.clientPhone}</span>
                        </td>
                        <td style="font-size:0.85rem;">${itemsText}</td>
                        <td style="font-size:0.8rem;">
                            <strong>${expiresDate}</strong>
                        </td>
                        <td>${statusBadge}</td>
                        <td>${actionButtons}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Sin reservas activas registradas.</td></tr>';
        }
    } catch (err) {
        console.warn("Módulo de reservas usando fallback:", err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Sin reservas activas registradas.</td></tr>';
    }

    // 2. Obtener y pintar notificaciones de WhatsApp
    try {
        const res2 = await fetch(`${API_URL}/api/notificaciones`);
        if (res2.ok) {
            const notifs = await res2.json();
            logsContainer.innerHTML = '';
            if (notifs.length === 0) {
                logsContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:0.9rem;padding:20px 0;">No hay notificaciones automáticas registradas.</p>';
            } else {
                notifs.forEach(n => {
                    const date = new Date(n.sentAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
                    const div = document.createElement('div');
                    div.style.background = 'rgba(255,255,255,0.03)';
                    div.style.border = '1px solid var(--border-glass)';
                    div.style.borderRadius = '8px';
                    div.style.padding = '10px';
                    div.style.fontSize = '0.85rem';

                    div.innerHTML = `
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="color:#10b981;font-weight:700;display:inline-flex;align-items:center;gap:4px;">🟢 WhatsApp Automatizado</span>
                            <span style="font-size:0.75rem;color:var(--text-muted);">${date}</span>
                        </div>
                        <div style="margin-bottom:4px;">
                            <strong>Cliente:</strong> ${n.recipientName} (${n.recipientPhone})
                        </div>
                        <div style="font-style:italic;background:rgba(0,0,0,0.2);padding:6px;border-radius:4px;color:var(--text-secondary);margin-top:4px;">
                            "${n.message}"
                        </div>
                    `;
                    logsContainer.appendChild(div);
                });
            }
        } else {
            logsContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:0.9rem;padding:20px 0;">Sin notificaciones automáticas activas.</p>';
        }
    } catch (err) {
        logsContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:0.9rem;padding:20px 0;">Historial de notificaciones no disponible.</p>';
    }

    // 3. Asignar manejadores a botones de reservas (si existen)
    tbody.querySelectorAll('.complete-reservation-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const code = btn.getAttribute('data-code');
            if (confirm(`¿Marcar la reserva ${code} como completada (venta realizada)?`)) {
                try {
                    const res = await fetch(`${API_URL}/api/reservas/${code}/completar`, { method: 'POST' });
                    if (res.ok) {
                        showToast(`Reserva ${code} marcada como completada.`);
                        renderReservationsAdmin();
                    } else {
                        const errData = await res.json();
                        showToast(errData.error || "Error al completar la reserva.", "danger");
                    }
                } catch (err) {
                    showToast("Error de conexión.", "danger");
                }
            }
        });
    });

    tbody.querySelectorAll('.release-reservation-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const code = btn.getAttribute('data-code');
            if (confirm(`¿Estás seguro de liberar la reserva ${code}? Esto devolverá los productos al stock del inventario.`)) {
                try {
                    const res = await fetch(`${API_URL}/api/reservas/${code}/liberar`, { method: 'POST' });
                    if (res.ok) {
                        showToast(`Reserva ${code} liberada con éxito y stock restaurado.`);
                        broadcastChannel.postMessage({ type: 'product_updated' });
                        renderReservationsAdmin();
                    } else {
                        const errData = await res.json();
                        showToast(errData.error || "Error al liberar la reserva.", "danger");
                    }
                } catch (err) {
                    showToast("Error de conexión.", "danger");
                }
            }
        });
    });

    // 4. Renderizar SIEMPRE el módulo de Chat en Vivo Messenger Admin
    renderAdminChatModule();

    // Escuchador botón recargar chats
    document.getElementById('btnRefreshLiveChatAdmin')?.addEventListener('click', () => {
        renderAdminChatModule();
        showToast("Sala de Chat actualizada.");
    });
}

// ==========================================
// TOAST NOTIFICATIONS (TOAST GLOBAL)
// ==========================================
function showToast(message, type = "success") {
    const toast = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMessage');
    const toastIcon = toast.querySelector('.toast-icon');

    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    
    if (type === "success") {
        toast.style.borderLeftColor = 'var(--success)';
        toastIcon.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
    } else if (type === "danger") {
        toast.style.borderLeftColor = 'var(--danger)';
        toastIcon.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
    }

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

function initContactForms() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameEl = document.getElementById('contactName');
            const emailEl = document.getElementById('contactEmail');
            const messageEl = document.getElementById('contactMessage');

            const name = nameEl ? nameEl.value.trim() : 'Cliente';
            const email = emailEl ? emailEl.value.trim() : '';
            const message = messageEl ? messageEl.value.trim() : '';

            const now = new Date();
            const dateStr = now.toLocaleDateString('es-ES', { dateStyle: 'short' }) + ' ' + now.toLocaleTimeString('es-ES', { timeStyle: 'short' });

            const newMsg = {
                id: `MSG-${Date.now().toString().slice(-4)}`,
                date: dateStr,
                name: name,
                email: email,
                phone: '',
                message: message,
                status: 'Pendiente'
            };

            const list = getContactMessages();
            list.unshift(newMsg);
            saveContactMessages(list);

            if (typeof broadcastChannel !== 'undefined') {
                broadcastChannel.postMessage({ type: 'contact_message_received' });
            }

            showToast(`¡Gracias, ${name}! Tu mensaje ha sido enviado a la administración.`);
            contactForm.reset();
        });
    }
}

// ==========================================
// CONFIGURACIÓN DE CONTACTO Y ACTUALIZACIÓN EN TIEMPO REAL
// ==========================================
const broadcastChannel = new BroadcastChannel('drakotec_updates');

// Cargar y aplicar configuración global de contacto
function loadAndApplyStoreSettings() {
    const defaultSettings = {
        storeName: 'Drakotec Taller de Reparación',
        storePhone: '+58 412 1234567',
        storeEmail: 'contacto@drakotec.com',
        storeLocation: 'Av. Tecnológica 1024, Edificio Silicon, Local 3B'
    };
    const settings = JSON.parse(localStorage.getItem('drakotec_settings')) || defaultSettings;
    applyStoreSettings(settings);
}

// Aplicar configuración a los elementos de la interfaz en tiempo real
function applyStoreSettings(settings) {
    if (!settings) return;

    // Actualizar campos del formulario en configuración si existen
    const cfgStoreName = document.getElementById('cfgStoreName');
    const cfgStorePhone = document.getElementById('cfgStorePhone');
    const cfgStoreEmail = document.getElementById('cfgStoreEmail');
    const cfgStoreLocation = document.getElementById('cfgStoreLocation');

    if (cfgStoreName) cfgStoreName.value = settings.storeName;
    if (cfgStorePhone) cfgStorePhone.value = settings.storePhone;
    if (cfgStoreEmail) cfgStoreEmail.value = settings.storeEmail;
    if (cfgStoreLocation) cfgStoreLocation.value = settings.storeLocation;

    // Actualizar elementos públicos en la página de Contacto (contacto.html)
    const contactAddressText = document.getElementById('contactAddressText');
    const contactPhoneText = document.getElementById('contactPhoneText');
    const contactEmailText = document.getElementById('contactEmailText');

    if (contactAddressText) contactAddressText.textContent = settings.storeLocation;
    if (contactPhoneText) contactPhoneText.textContent = settings.storePhone;
    if (contactEmailText) contactEmailText.textContent = settings.storeEmail;

    // Actualizar en el pie de página (Footer) si hay algún teléfono o email
    document.querySelectorAll('footer p, footer .footer-brand p').forEach(el => {
        if (el.textContent.includes('Tel:') || el.textContent.includes('adquisición') || el.textContent.includes('socio')) {
            el.innerHTML = `Tu socio tecnológico en adquisición de dispositivos premium y restauración experta.<br>Tel: ${settings.storePhone} | ${settings.storeEmail}`;
        }
    });
}

// Inicializar el escuchador del formulario de configuración (Solo Admin)
function initSettingsFormListener() {
    const settingsForm = document.getElementById('settingsForm');
    const cotizadorConfigForm = document.getElementById('cotizadorConfigForm');

    // Cargar valores actuales en inputs
    loadAndApplyStoreSettings();
    loadCotizadorConfigInputs();
    renderUsersTable();
    initUserManagementModal();

    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const settings = {
                storeName: document.getElementById('cfgStoreName').value.trim(),
                storePhone: document.getElementById('cfgStorePhone').value.trim(),
                storeEmail: document.getElementById('cfgStoreEmail').value.trim(),
                storeLocation: document.getElementById('cfgStoreLocation').value.trim(),
            };

            localStorage.setItem('drakotec_settings', JSON.stringify(settings));
            applyStoreSettings(settings);

            // Notificar en tiempo real a otras pestañas/ventanas abiertas
            broadcastChannel.postMessage({ type: 'settings_updated', settings });
            
            showToast("✅ Configuración de contacto guardada y actualizada en tiempo real.");
        });
    }

    if (cotizadorConfigForm) {
        const btnAddBrandBtn = document.getElementById('btnAddBrandBtn');
        if (btnAddBrandBtn) {
            btnAddBrandBtn.addEventListener('click', () => {
                const brandName = prompt("Nombre de la nueva marca (Ej: Huawei, Xiaomi, etc.):");
                if (brandName && brandName.trim()) {
                    const key = brandName.trim().toLowerCase().replace(/\s+/g, '_');
                    if (!REPAIR_MODELS[key]) {
                        REPAIR_MODELS[key] = [
                            { name: `${brandName.trim()} Modelo 1`, priceMultiplier: 1.0 }
                        ];
                        renderVisualBrandsManager();
                    } else {
                        showToast("La marca ya existe.", "danger");
                    }
                }
            });
        }

        cotizadorConfigForm.addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const issues = { ...REPAIR_ISSUES };
                issues.screen.basePrice = parseFloat(document.getElementById('cfgIssueScreen').value) || 100;
                issues.battery.basePrice = parseFloat(document.getElementById('cfgIssueBattery').value) || 45;
                issues.port.basePrice = parseFloat(document.getElementById('cfgIssuePort').value) || 35;
                issues.camera.basePrice = parseFloat(document.getElementById('cfgIssueCamera').value) || 65;
                issues.diagnostic.basePrice = parseFloat(document.getElementById('cfgIssueDiag').value) || 25;

                const updatedModels = readVisualBrandsState();

                REPAIR_ISSUES = issues;
                REPAIR_MODELS = updatedModels;

                localStorage.setItem('drakotec_repair_issues', JSON.stringify(REPAIR_ISSUES));
                localStorage.setItem('drakotec_repair_models', JSON.stringify(REPAIR_MODELS));

                broadcastChannel.postMessage({ type: 'cotizador_updated', issues: REPAIR_ISSUES, models: REPAIR_MODELS });
                showToast("⚡ Configuración de Cotizador Exprés guardada exitosamente.");
            } catch (err) {
                console.error(err);
                showToast("❌ Error al guardar la configuración del cotizador.", "danger");
            }
        });
    }
}

function loadCotizadorConfigInputs() {
    if (!document.getElementById('cfgIssueScreen')) return;
    document.getElementById('cfgIssueScreen').value = REPAIR_ISSUES.screen?.basePrice || 100;
    document.getElementById('cfgIssueBattery').value = REPAIR_ISSUES.battery?.basePrice || 45;
    document.getElementById('cfgIssuePort').value = REPAIR_ISSUES.port?.basePrice || 35;
    document.getElementById('cfgIssueCamera').value = REPAIR_ISSUES.camera?.basePrice || 65;
    document.getElementById('cfgIssueDiag').value = REPAIR_ISSUES.diagnostic?.basePrice || 25;
    
    renderVisualBrandsManager();
}

function renderVisualBrandsManager() {
    const container = document.getElementById('brandsVisualContainer');
    if (!container) return;

    container.innerHTML = '';

    Object.keys(REPAIR_MODELS).forEach(brandKey => {
        const brandCard = document.createElement('div');
        brandCard.className = 'brand-config-card';
        brandCard.style.cssText = 'background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px;';
        
        const models = REPAIR_MODELS[brandKey] || [];
        const brandTitle = brandKey.toUpperCase();

        let modelsHtml = '';
        models.forEach((m, idx) => {
            modelsHtml += `
                <div class="model-row" style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;" data-brand="${brandKey}">
                    <input type="text" class="form-input model-name-input" value="${m.name}" placeholder="Nombre del Modelo" style="flex: 2; font-size: 0.85rem;">
                    <select class="form-select model-mult-select" style="flex: 1.5; font-size: 0.85rem;">
                        <option value="0.7" ${m.priceMultiplier === 0.7 ? 'selected' : ''}>Económico (70%)</option>
                        <option value="0.85" ${m.priceMultiplier === 0.85 ? 'selected' : ''}>Gama Baja (85%)</option>
                        <option value="1.0" ${m.priceMultiplier === 1.0 ? 'selected' : ''}>Gama Media Estándar (100%)</option>
                        <option value="1.2" ${m.priceMultiplier === 1.2 ? 'selected' : ''}>Gama Alta (120%)</option>
                        <option value="1.4" ${m.priceMultiplier === 1.4 ? 'selected' : ''}>Gama Premium / Ultra (140%)</option>
                    </select>
                    <button type="button" class="btn btn-secondary remove-model-btn" style="padding: 4px 8px; font-size: 0.75rem; color: #ef4444; border-color: #ef4444;">&times;</button>
                </div>
            `;
        });

        brandCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px;">
                <strong style="color: #60a5fa; font-size: 0.95rem;">🏷️ Marca: ${brandTitle}</strong>
                <div style="display: flex; gap: 6px;">
                    <button type="button" class="btn btn-secondary add-model-btn" data-brand="${brandKey}" style="font-size: 0.75rem; padding: 2px 8px; color: #34d399; border-color: #34d399;">+ Añadir Modelo</button>
                    <button type="button" class="btn btn-secondary remove-brand-btn" data-brand="${brandKey}" style="font-size: 0.75rem; padding: 2px 8px; color: #ef4444; border-color: #ef4444;">Eliminar Marca</button>
                </div>
            </div>
            <div class="models-list-box">
                ${modelsHtml}
            </div>
        `;

        container.appendChild(brandCard);
    });

    // Eventos para añadir/eliminar modelo/marca
    container.querySelectorAll('.add-model-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bKey = btn.getAttribute('data-brand');
            if (REPAIR_MODELS[bKey]) {
                REPAIR_MODELS[bKey].push({ name: 'Nuevo Modelo', priceMultiplier: 1.0 });
                renderVisualBrandsManager();
            }
        });
    });

    container.querySelectorAll('.remove-brand-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bKey = btn.getAttribute('data-brand');
            if (confirm(`¿Eliminar la marca ${bKey.toUpperCase()} y todos sus modelos?`)) {
                delete REPAIR_MODELS[bKey];
                renderVisualBrandsManager();
            }
        });
    });

    container.querySelectorAll('.remove-model-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('.model-row');
            if (row) row.remove();
        });
    });
}

function readVisualBrandsState() {
    const container = document.getElementById('brandsVisualContainer');
    if (!container) return REPAIR_MODELS;

    const newModelsState = {};

    container.querySelectorAll('.brand-config-card').forEach(card => {
        const brandTitleEl = card.querySelector('strong');
        if (!brandTitleEl) return;
        const brandKey = brandTitleEl.textContent.replace('🏷️ Marca: ', '').trim().toLowerCase();

        const modelsArr = [];
        card.querySelectorAll('.model-row').forEach(row => {
            const nameInput = row.querySelector('.model-name-input');
            const multSelect = row.querySelector('.model-mult-select');
            if (nameInput && multSelect && nameInput.value.trim()) {
                modelsArr.push({
                    name: nameInput.value.trim(),
                    priceMultiplier: parseFloat(multSelect.value) || 1.0
                });
            }
        });

        if (modelsArr.length > 0) {
            newModelsState[brandKey] = modelsArr;
        }
    });

    return newModelsState;
}

// ==========================================
// MÓDULO GESTIÓN DE USUARIOS Y ROLES (ADMINS Y TÉCNICOS)
// ==========================================

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    const users = getDrakotecUsers();

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 12px;">No hay roles registrados.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    users.forEach((u, index) => {
        const tr = document.createElement('tr');
        const isUserAdmin = u.role === 'admin';
        const roleBadge = isUserAdmin 
            ? `<span class="status-badge listo" style="font-size:0.75rem;">👑 Administrador</span>`
            : `<span class="status-badge reparacion" style="font-size:0.75rem;">🛠️ Técnico</span>`;

        tr.innerHTML = `
            <td>
                <strong>${u.name || u.username}</strong>
                <br><span style="font-size: 0.75rem; color: var(--text-muted);">@${u.username}</span>
            </td>
            <td>${roleBadge}</td>
            <td>
                <input type="password" id="userPassInput_${index}" class="form-input" value="${u.pass || ''}" placeholder="Nueva contraseña" style="padding: 6px 10px; font-size: 0.85rem; max-width: 160px;">
            </td>
            <td style="text-align: center;">
                <button type="button" class="btn btn-primary" onclick="guardarPasswordRol(${index})" style="padding: 6px 14px; font-size: 0.8rem; font-weight: bold; white-space: nowrap;">💾 Guardar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function guardarPasswordRol(index) {
    const passInput = document.getElementById(`userPassInput_${index}`);
    if (!passInput) return;

    const newPass = passInput.value.trim();
    if (!newPass) {
        if (typeof showToast === 'function') showToast("La contraseña no puede estar vacía.", "danger");
        else alert("La contraseña no puede estar vacía.");
        return;
    }

    const usersList = getDrakotecUsers();
    if (usersList[index]) {
        usersList[index].pass = newPass;
        saveDrakotecUsers(usersList);
        if (typeof showToast === 'function') {
            showToast(`✅ Contraseña de ${usersList[index].name || usersList[index].username} actualizada con éxito.`);
        } else {
            alert(`Contraseña actualizada para ${usersList[index].name || usersList[index].username}`);
        }
    }
}

// Exportar función global para el botón de guardar en la tabla
window.guardarPasswordRol = guardarPasswordRol;

function initUserManagementModal() {
    renderUsersTable();
}

// Escuchar actualizaciones en tiempo real desde BroadcastChannel
broadcastChannel.addEventListener('message', async (event) => {
    if (event.data.type === 'settings_updated') {
        applyStoreSettings(event.data.settings);
    } else if (event.data.type === 'cotizador_updated') {
        REPAIR_ISSUES = event.data.issues;
        REPAIR_MODELS = event.data.models;
    } else if (event.data.type === 'order_updated') {
        await fetchOrdenes();
        renderSavedOrders();
        renderTechOrders();
    } else if (event.data.type === 'product_updated') {
        const path = window.location.pathname.toLowerCase();
        if (path.endsWith('tienda.html') || path.endsWith('/tienda')) {
            await fetchProductos(true);
        } else if (path.endsWith('admin.html') || path.endsWith('/admin')) {
            await fetchProductos(true);
        }
    } else if (event.data.type === 'live_chat_updated') {
        const path = window.location.pathname.toLowerCase();
        if (path.endsWith('admin.html') || path.endsWith('/admin')) {
            renderAdminChatModule();
            updateAdminUnreadBadge();
        }
        if (document.getElementById('customerChatContainer')) {
            renderCustomerChatModule();
        }
    }
});

// Escuchar actualización vía localStorage para máxima compatibilidad entre pestañas
window.addEventListener('storage', async (event) => {
    if (event.key === 'drakotec_last_order_update') {
        await fetchOrdenes();
        renderSavedOrders();
        renderTechOrders();
    } else if (event.key === 'drakotec_live_chats') {
        updateAdminUnreadBadge();
        const path = window.location.pathname.toLowerCase();
        if (path.endsWith('admin.html') || path.endsWith('/admin')) {
            renderAdminChatModule();
        }
        if (document.getElementById('customerChatContainer')) {
            renderCustomerChatModule();
        }
    }
});

// Comprobar y disolver reservas vencidas (mayores a 48h)
async function checkExpiredReservations() {
    // El servidor maneja el vencimiento y liberación de stock automáticamente cada 30 segundos
}

// ==========================================
// MÓDULO DE SALA DE CHAT MESSENGER EN TIEMPO REAL (CLIENTES <-> ADMIN)
// ==========================================
const DEFAULT_LIVE_CHATS = {
    "carlos.mendoza@gmail.com": {
        id: "carlos.mendoza@gmail.com",
        clientName: "Carlos Mendoza",
        clientEmail: "carlos.mendoza@gmail.com",
        clientPhone: "+58 414 9876543",
        unreadAdmin: 1,
        unreadClient: 0,
        lastTime: "18:35",
        messages: [
            { sender: "client", text: "Buenas tardes, ¿tienen disponibilidad de pantalla original para Samsung S24 Ultra?", time: "18:30" },
            { sender: "admin", text: "¡Hola Carlos! Sí, disponemos del módulo de pantalla original con instalación en 2 horas.", time: "18:32" },
            { sender: "client", text: "Excelente, ¿qué costo tiene y dan garantía?", time: "18:35" }
        ]
    },
    "mariana.torres@hotmail.com": {
        id: "mariana.torres@hotmail.com",
        clientName: "Mariana Torres",
        clientEmail: "mariana.torres@hotmail.com",
        clientPhone: "+58 412 5551234",
        unreadAdmin: 0,
        unreadClient: 0,
        lastTime: "15:15",
        messages: [
            { sender: "client", text: "Hola, quisiera saber si tienen disponible el iPhone 15 Pro Max de 256GB en color Titanio.", time: "15:10" },
            { sender: "admin", text: "¡Hola Mariana! Sí, lo tenemos en tienda disponible para retiro inmediato o reserva.", time: "15:15" }
        ]
    }
};

function getLiveChats() {
    return JSON.parse(localStorage.getItem('drakotec_live_chats')) || DEFAULT_LIVE_CHATS;
}

function saveLiveChats(chats) {
    localStorage.setItem('drakotec_live_chats', JSON.stringify(chats));
    updateAdminUnreadBadge();
}

function getCustomerSession() {
    return JSON.parse(localStorage.getItem('drakotec_chat_customer_session')) || null;
}

function saveCustomerSession(session) {
    localStorage.setItem('drakotec_chat_customer_session', JSON.stringify(session));
}

// --- INTERFAZ DEL CLIENTE (CONTACTO.HTML / CUALQUIER PÁGINA) ---
function initContactForms() {
    renderCustomerChatModule();
}

function renderCustomerChatModule() {
    const container = document.getElementById('customerChatContainer');
    if (!container) return;

    const session = getCustomerSession();

    if (!session) {
        // Formulario de Registro / Identificación Inicial
        container.innerHTML = `
            <h3>💬 Chat de Atención en Vivo</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">Regístrate una sola vez para enviar tus dudas y chatear con soporte en vivo.</p>
            <form id="customerRegisterForm" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group" style="margin:0;">
                    <label for="chatRegName">Nombre Completo *</label>
                    <input type="text" id="chatRegName" class="form-input" required placeholder="Ej: Juan Pérez">
                </div>
                <div class="form-group" style="margin:0;">
                    <label for="chatRegEmail">Correo Electrónico (Tu ID de Chat) *</label>
                    <input type="email" id="chatRegEmail" class="form-input" required placeholder="ejemplo@correo.com">
                </div>
                <div class="form-group" style="margin:0;">
                    <label for="chatRegPhone">Teléfono / WhatsApp (Opcional)</label>
                    <input type="text" id="chatRegPhone" class="form-input" placeholder="Ej: +58 414 1234567">
                </div>
                <div class="form-group" style="margin:0;">
                    <label for="chatRegMsg">Tu Consulta Inicial *</label>
                    <textarea id="chatRegMsg" class="form-input" rows="3" required placeholder="Escribe tu duda sobre un producto o reparación..."></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; font-weight: bold; margin-top: 6px;">🚀 Iniciar Chat en Vivo</button>
            </form>
        `;

        const regForm = document.getElementById('customerRegisterForm');
        if (regForm) {
            regForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('chatRegName').value.trim();
                const email = document.getElementById('chatRegEmail').value.trim().toLowerCase();
                const phone = document.getElementById('chatRegPhone').value.trim();
                const msgText = document.getElementById('chatRegMsg').value.trim();

                if (!name || !email || !msgText) return;

                const newSession = { name, email, phone };
                saveCustomerSession(newSession);

                const chats = getLiveChats();
                const now = new Date();
                const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                if (!chats[email]) {
                    chats[email] = {
                        id: email,
                        clientName: name,
                        clientEmail: email,
                        clientPhone: phone,
                        unreadAdmin: 1,
                        unreadClient: 0,
                        lastTime: timeStr,
                        messages: []
                    };
                }

                chats[email].messages.push({
                    sender: "client",
                    text: msgText,
                    time: timeStr
                });
                chats[email].unreadAdmin += 1;
                chats[email].lastTime = timeStr;

                saveLiveChats(chats);

                if (typeof broadcastChannel !== 'undefined') {
                    broadcastChannel.postMessage({ type: 'live_chat_updated' });
                }

                showToast(`¡Bienvenido ${name}! Tu chat ha sido iniciado.`);
                renderCustomerChatModule();
            });
        }

    } else {
        // Ventana de Chat Activo del Cliente
        const chats = getLiveChats();
        const customerChat = chats[session.email] || { messages: [] };

        // Marcar mensajes como leídos por el cliente
        if (customerChat.unreadClient > 0) {
            customerChat.unreadClient = 0;
            chats[session.email] = customerChat;
            saveLiveChats(chats);
        }

        let messagesHtml = '';
        if (customerChat.messages.length === 0) {
            messagesHtml = `<p style="text-align: center; color: var(--text-muted); margin: auto;">No hay mensajes aún. Escribe tu primera duda abajo.</p>`;
        } else {
            customerChat.messages.forEach(m => {
                const isClient = m.sender === 'client';
                messagesHtml += `
                    <div style="display: flex; flex-direction: column; align-items: ${isClient ? 'flex-end' : 'flex-start'}; margin-bottom: 8px;">
                        <div style="background: ${isClient ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.08)'}; color: white; padding: 8px 14px; border-radius: ${isClient ? '14px 14px 2px 14px' : '14px 14px 14px 2px'}; max-width: 80%; font-size: 0.88rem; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                            <span style="font-size:0.75rem; font-weight:700; display:block; color:${isClient ? '#a7f3d0' : '#60a5fa'}; margin-bottom:2px;">
                                ${isClient ? 'Tú' : 'Soporte Drakotec'}
                            </span>
                            ${m.text}
                        </div>
                        <span style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">${m.time}</span>
                    </div>
                `;
            });
        }

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-glass); padding-bottom: 8px; margin-bottom: 10px;">
                <div>
                    <h3 style="margin:0; font-size: 1.05rem; color: var(--primary-color);">💬 Chat en Vivo</h3>
                    <span style="font-size: 0.78rem; color: #34d399;">👤 Sesión: <strong>${session.name}</strong> (${session.email})</span>
                </div>
                <button type="button" class="btn btn-secondary" id="btnCustomerLogoutChat" style="font-size: 0.75rem; padding: 3px 8px;">🔒 Cambiar Usuario</button>
            </div>

            <div id="customerChatBoxScroll" style="flex: 1; min-height: 240px; max-height: 280px; overflow-y: auto; background: rgba(0,0,0,0.25); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; margin-bottom: 10px;">
                ${messagesHtml}
            </div>

            <form id="customerSendMsgForm" style="display: flex; gap: 8px;">
                <input type="text" id="customerMsgInput" class="form-input" required placeholder="Escribe tu mensaje o duda..." style="flex: 1; font-size: 0.88rem;">
                <button type="submit" class="btn btn-primary" style="padding: 8px 16px; font-weight: bold;">Enviar</button>
            </form>
        `;

        const scrollBox = document.getElementById('customerChatBoxScroll');
        if (scrollBox) scrollBox.scrollTop = scrollBox.scrollHeight;

        document.getElementById('btnCustomerLogoutChat')?.addEventListener('click', () => {
            localStorage.removeItem('drakotec_chat_customer_session');
            showToast("Sesión de chat cerrada.");
            renderCustomerChatModule();
        });

        const sendForm = document.getElementById('customerSendMsgForm');
        if (sendForm) {
            sendForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('customerMsgInput');
                const text = input ? input.value.trim() : '';
                if (!text) return;

                const chats = getLiveChats();
                const now = new Date();
                const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                if (!chats[session.email]) {
                    chats[session.email] = {
                        id: session.email,
                        clientName: session.name,
                        clientEmail: session.email,
                        clientPhone: session.phone || '',
                        unreadAdmin: 0,
                        unreadClient: 0,
                        lastTime: timeStr,
                        messages: []
                    };
                }

                chats[session.email].messages.push({
                    sender: "client",
                    text: text,
                    time: timeStr
                });
                chats[session.email].unreadAdmin = (chats[session.email].unreadAdmin || 0) + 1;
                chats[session.email].lastTime = timeStr;

                saveLiveChats(chats);

                if (typeof broadcastChannel !== 'undefined') {
                    broadcastChannel.postMessage({ type: 'live_chat_updated' });
                }

                input.value = '';
                renderCustomerChatModule();
            });
        }
    }
}

// --- INTERFAZ DEL ADMINISTRADOR (ADMIN.HTML - SALA MULTICHAT) ---
let activeAdminChatId = null;

function renderAdminChatModule() {
    const listContainer = document.getElementById('adminChatListContainer');
    const windowBox = document.getElementById('adminChatWindow');
    if (!listContainer || !windowBox) return;

    const chats = getLiveChats();
    const chatKeys = Object.keys(chats);

    // 1. Renderizar Lista Izquierda de Clientes
    listContainer.innerHTML = '';
    if (chatKeys.length === 0) {
        listContainer.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 10px;">No hay chats iniciados.</p>`;
    } else {
        // Seleccionar primer chat si no hay ninguno activo
        if (!activeAdminChatId || !chats[activeAdminChatId]) {
            activeAdminChatId = chatKeys[0];
        }

        chatKeys.forEach(key => {
            const chat = chats[key];
            const isSelected = key === activeAdminChatId;
            const lastMsg = chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].text : 'Sin mensajes';
            const hasUnread = chat.unreadAdmin > 0;

            const card = document.createElement('div');
            card.style.cssText = `
                padding: 10px;
                border-radius: 8px;
                cursor: pointer;
                background: ${isSelected ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.03)'};
                border: 1px solid ${isSelected ? '#8b5cf6' : 'rgba(255,255,255,0.06)'};
                transition: all 0.2s ease;
            `;

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="font-size: 0.85rem; color: ${isSelected ? '#c084fc' : 'var(--text-color)'};">${chat.clientName}</strong>
                    <span style="font-size: 0.7rem; color: var(--text-muted);">${chat.lastTime || ''}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.78rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">${lastMsg}</span>
                    ${hasUnread ? `<span class="status-badge" style="background: #ef4444; color: white; padding: 1px 6px; font-size: 0.7rem;">${chat.unreadAdmin}</span>` : ''}
                </div>
            `;

            card.addEventListener('click', () => {
                activeAdminChatId = key;
                chats[key].unreadAdmin = 0;
                saveLiveChats(chats);
                renderAdminChatModule();
            });

            listContainer.appendChild(card);
        });
    }

    // 2. Renderizar Ventana Derecha de Chat Activo
    if (!activeAdminChatId || !chats[activeAdminChatId]) {
        windowBox.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); margin: auto; padding: 20px;">
                <p style="font-size: 1.1rem; font-weight: 600; color: var(--text-color); margin-bottom: 6px;">💬 Selecciona un cliente de la lista</p>
                <span style="font-size: 0.85rem;">Podrás ver sus dudas registradas y responderle en vivo en tiempo real.</span>
            </div>
        `;
        return;
    }

    const currentChat = chats[activeAdminChatId];
    const cleanPhone = (currentChat.clientPhone || '').replace(/\D/g, '');
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

    let threadHtml = '';
    if (!currentChat.messages || currentChat.messages.length === 0) {
        threadHtml = `<p style="text-align: center; color: var(--text-muted); margin: auto;">Sin mensajes en esta conversación.</p>`;
    } else {
        currentChat.messages.forEach(m => {
            const isAdmin = m.sender === 'admin';
            threadHtml += `
                <div style="display: flex; flex-direction: column; align-items: ${isAdmin ? 'flex-end' : 'flex-start'}; margin-bottom: 8px;">
                    <div style="background: ${isAdmin ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(255,255,255,0.08)'}; color: white; padding: 8px 14px; border-radius: ${isAdmin ? '14px 14px 2px 14px' : '14px 14px 14px 2px'}; max-width: 80%; font-size: 0.88rem; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        <span style="font-size:0.75rem; font-weight:700; display:block; color:${isAdmin ? '#e9d5ff' : '#60a5fa'}; margin-bottom:2px;">
                            ${isAdmin ? 'Soporte (Tú)' : currentChat.clientName}
                        </span>
                        ${m.text}
                    </div>
                    <span style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">${m.time}</span>
                </div>
            `;
        });
    }

    windowBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; margin-bottom: 10px;">
            <div>
                <strong style="font-size: 0.95rem; color: var(--primary-color);">👤 ${currentChat.clientName}</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 8px;">(${currentChat.clientEmail})</span>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                ${waUrl ? `<a href="${waUrl}" target="_blank" class="btn btn-secondary" style="font-size: 0.75rem; padding: 3px 8px; color: #34d399; border-color: #34d399; text-decoration: none;">📱 WhatsApp Web</a>` : ''}
                <button type="button" class="btn btn-secondary" onclick="deleteLiveChat('${activeAdminChatId}')" style="font-size: 0.75rem; padding: 3px 8px; color: #ef4444; border-color: #ef4444; cursor: pointer;" title="Eliminar este Chat">🗑️ Borrar Chat</button>
            </div>
        </div>

        <div id="adminChatThreadScroll" style="flex: 1; min-height: 280px; max-height: 300px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; margin-bottom: 10px;">
            ${threadHtml}
        </div>

        <form id="adminSendReplyForm" style="display: flex; gap: 8px;">
            <input type="text" id="adminReplyInput" class="form-input" required placeholder="Escribe tu respuesta para ${currentChat.clientName}..." style="flex: 1; font-size: 0.88rem;">
            <button type="submit" class="btn btn-primary" style="padding: 8px 18px; font-weight: bold; background: linear-gradient(135deg, #7c3aed, #6366f1);">Enviar Respuesta</button>
        </form>
    `;

    updateAdminUnreadBadge();

    const scrollBox = document.getElementById('adminChatThreadScroll');
    if (scrollBox) scrollBox.scrollTop = scrollBox.scrollHeight;

    const replyForm = document.getElementById('adminSendReplyForm');
    if (replyForm) {
        replyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('adminReplyInput');
            const text = input ? input.value.trim() : '';
            if (!text) return;

            const chats = getLiveChats();
            if (chats[activeAdminChatId]) {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                chats[activeAdminChatId].messages.push({
                    sender: "admin",
                    text: text,
                    time: timeStr
                });
                chats[activeAdminChatId].unreadClient = (chats[activeAdminChatId].unreadClient || 0) + 1;
                chats[activeAdminChatId].lastTime = timeStr;

                saveLiveChats(chats);

                if (typeof broadcastChannel !== 'undefined') {
                    broadcastChannel.postMessage({ type: 'live_chat_updated' });
                }

                input.value = '';
                renderAdminChatModule();
            }
        });
    }
}

function updateAdminUnreadBadge() {
    const badge = document.getElementById('unreadContactBadge');
    if (!badge) return;

    const chats = getLiveChats();
    const totalUnread = Object.values(chats).reduce((acc, chat) => acc + (chat.unreadAdmin || 0), 0);

    if (totalUnread > 0) {
        badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

function deleteLiveChat(chatId) {
    const chats = getLiveChats();
    const targetChat = chats[chatId];
    const clientName = targetChat ? targetChat.clientName : chatId;

    if (confirm(`¿Estás seguro de eliminar todo el historial de chat de ${clientName}?`)) {
        delete chats[chatId];
        saveLiveChats(chats);

        const remainingKeys = Object.keys(chats);
        activeAdminChatId = remainingKeys.length > 0 ? remainingKeys[0] : null;

        if (typeof broadcastChannel !== 'undefined') {
            broadcastChannel.postMessage({ type: 'live_chat_updated' });
        }

        if (typeof showToast === 'function') {
            showToast(`Chat de ${clientName} eliminado con éxito.`);
        }

        renderAdminChatModule();
        updateAdminUnreadBadge();
    }
}

window.deleteLiveChat = deleteLiveChat;

