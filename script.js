
const SELLER_WHATSAPP_NUMBER = '6281335235999'; // Contoh nomor
const API_URL = 'api/api.php?action=get_products';
let allProducts = [];
let currentCategory = 'semua';

// Normalize category values (map jewelry/jewelery -> accecories)
function normalizeCategory(cat) {
    if (!cat) return cat;
    const c = String(cat).trim().toLowerCase();
    if (c === 'jewelry' || c === 'jewelery' || c === 'jewel') return 'accecories';
    return cat;
}
function formatPrice(value) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

async function fetchProducts() {
    showPageLoader(true);
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('Gagal mengambil produk');
        allProducts = await res.json();
        // normalize categories for consistent filter labels
        allProducts = allProducts.map(p => ({ ...p, category: normalizeCategory(p.category) }));
        renderCategories();
        filterByCategory('semua');
    } catch (err) {
        document.getElementById('product-list').innerHTML = `<p class="error">${err.message}</p>`;
    } finally {
        showPageLoader(false);
    }
}

function getCategories() {
    // Build mapping of value -> label (use category_name if available)
    const map = {};
    allProducts.forEach(p => {
        const key = String(p.category);
        let label = p.category_name || p.category;
        if ((typeof p.category === 'number') || (/^\d+$/.test(String(p.category)))) {
            label = p.category_name || `Kategori ${p.category}`;
        }
        if (typeof label === 'string') label = label.charAt(0).toUpperCase() + label.slice(1);
        map[key] = label;
    });
    const keys = Object.keys(map).sort((a,b) => map[a].localeCompare(map[b]));
    return ['semua', ...keys];
}

function renderCategories() {
    const filterContainer = document.getElementById('category-filter');
    if (!filterContainer) return;
    
    const categories = getCategories();
    // We need labels for keys: build label map again
    const labelMap = {};
    allProducts.forEach(p => {
        const key = String(p.category);
        labelMap[key] = p.category_name || labelMap[key] || ( (/^\d+$/.test(String(p.category))) ? `Kategori ${p.category}` : p.category );
    });

    filterContainer.innerHTML = categories.map(cat => {
        if (cat === 'semua') return `<button class="category-btn active" data-category="semua">Semua</button>`;
        const label = (labelMap[cat] || cat);
        const display = (typeof label === 'string') ? (label.charAt(0).toUpperCase() + label.slice(1)) : label;
        return `<button class="category-btn" data-category="${cat}">${display}</button>`;
    }).join('');

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');
            filterByCategory(category);
        });
    });
}

function filterByCategory(category) {
    currentCategory = category;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        if (btn.getAttribute('data-category') === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Filter and render products
    let filtered = allProducts;
    if (category !== 'semua') {
        filtered = allProducts.filter(p => p.category === category);
    }
    renderProducts(filtered);
}

function renderProducts(products) {
    const container = document.getElementById('product-list');
    if (!container) return;
    container.innerHTML = '';

    if (products.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Tidak ada produk dalam kategori ini</p>';
        return;
    }

    products.forEach(product => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-2 mb-4';
        col.innerHTML = `
            <article class="product-card h-100">
                <a href="product-detail.html?id=${product.id}" style="text-decoration:none;color:inherit;display:block;height:100%">
                    <div class="product-media">
                        <img src="${product.image || 'img/no-image.png'}" alt="${escapeHtml(product.title)}" class="product-image" />
                    </div>
                    <div class="product-body">
                        <h3 class="product-title">${escapeHtml(product.title)}</h3>
                        <p class="product-price">${formatPrice(product.price)}</p>
                        <p class="product-desc">${escapeHtml((product.description || '').substring(0, 120))}</p>
                        <div class="product-actions">
                            <button class="add-to-cart-btn" data-product-id="${product.id}">Tambah</button>
                        </div>
                    </div>
                </a>
            </article>
        `;
        container.appendChild(col);
    });
    attachAddToCartHandlers();
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getCart() {
    try {
        return JSON.parse(localStorage.getItem('cart') || '[]');
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
}

function addToCart(productId) {
    const cart = getCart();
    const found = cart.find(i => i.id === productId);
    if (found) found.qty += 1;
    else cart.push({ id: productId, qty: 1 });
    saveCart(cart);
}

function attachAddToCartHandlers() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.getAttribute('data-product-id')) || 0;
            if (id) {
                addToCart(id);
                btn.textContent = '✓ Ditambahkan';
                setTimeout(() => btn.textContent = 'Tambah', 1200);
            }
        });
    });
}

function updateCartBadge() {
    const count = getCart().reduce((s, i) => s + i.qty, 0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = count;
}

function showPageLoader(visible) {
    const loader = document.getElementById('page-loader');
    if (!loader) return;
    loader.style.display = visible ? 'flex' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    // Load footer partial if container exists
    const footerContainer = document.getElementById('site-footer');
    if (footerContainer) {
        fetch('footer.html')
            .then(r => r.text())
            .then(html => footerContainer.innerHTML = html)
            .catch(() => {});
    }
    fetchProducts();
});


