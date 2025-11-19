let allProducts = [];

// Normalize category values (map jewelry/jewelery -> accecories)
function normalizeCategory(cat) {
	if (!cat) return cat;
	const c = String(cat).trim().toLowerCase();
	if (c === 'jewelry' || c === 'jewelery' || c === 'jewel') return 'accecories';
	return cat;
}
// Get product ID from URL
const urlParams = new URLSearchParams(window.location.search);
const productId = parseInt(urlParams.get('id'));

if (!productId) {
	window.location.href = 'index.html';
}

// Load all products
async function loadAllProducts() {
	try {
		const response = await fetch('api/api.php?action=get_products');
		if (!response.ok) throw new Error('Gagal mengambil produk');
		allProducts = await response.json();
		// normalize categories for consistent display and related-product matching
		allProducts = allProducts.map(p => ({ ...p, category: normalizeCategory(p.category) }));
		displayProduct();
		displayRelatedProducts();
		loadFooter();
	} catch (error) {
		console.error('Error:', error);
		document.querySelector('main').innerHTML = '<div class="alert alert-danger">Gagal memuat produk</div>';
	}
}

// Display product detail
function displayProduct() {
	const product = allProducts.find(p => p.id === productId);
	
	if (!product) {
		window.location.href = 'index.html';
		return;
	}

	document.title = product.title + ' - Toko Saya';
	document.getElementById('breadcrumb-product').textContent = product.title;
	document.getElementById('product-id').textContent = product.id;
	document.getElementById('product-title').textContent = product.title;
	document.getElementById('product-price').textContent = formatPrice(product.price);
	document.getElementById('product-category').textContent = product.category_name || ( (typeof product.category === 'number' || /^\d+$/.test(String(product.category))) ? 'Kategori ' + product.category : product.category );
	document.getElementById('product-description').textContent = product.description;
	document.getElementById('product-image').src = product.image;
	document.getElementById('product-image').alt = product.title;
	document.getElementById('spec-category').textContent = product.category_name || ( (typeof product.category === 'number' || /^\d+$/.test(String(product.category))) ? 'Kategori ' + product.category : product.category );
	document.getElementById('spec-price').textContent = formatPrice(product.price);
}

// Display related products
function displayRelatedProducts() {
	const product = allProducts.find(p => p.id === productId);
	if (!product) return;

	const related = allProducts
		.filter(p => p.category === product.category && p.id !== productId)
		.slice(0, 4);

	if (related.length === 0) {
		document.getElementById('related-products').innerHTML = '<div class="col-12 text-center text-muted py-4">Tidak ada produk terkait</div>';
		return;
	}

	document.getElementById('related-products').innerHTML = related.map(p => `
		<div class="col-md-6 col-lg-3 mb-4">
			<div class="card related-card h-100 border-0 shadow-sm">
				<img src="${p.image}" class="card-img-top" alt="${p.title}" style="height:200px;object-fit:cover">
				<div class="card-body d-flex flex-column">
					<h5 class="card-title" style="font-size:0.95rem">${p.title}</h5>
					<p class="text-muted small flex-grow-1">${p.description.substring(0, 80)}...</p>
					<p class="price-main mb-3">Rp ${formatPrice(p.price)}</p>
					<a href="product-detail.html?id=${p.id}" class="btn btn-sm btn-outline-primary">
						<i class="bi bi-eye me-1"></i>Lihat Detail
					</a>
				</div>
			</div>
		</div>
	`).join('');
}

// Format price
function formatPrice(price) {
	return new Intl.NumberFormat('id-ID', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(price);
}

// Add to cart
document.getElementById('add-to-cart-btn').addEventListener('click', () => {
	const product = allProducts.find(p => p.id === productId);
	const quantity = parseInt(document.getElementById('quantity').value);
	
	if (quantity < 1 || !product) return;

	let cart = JSON.parse(localStorage.getItem('cart')) || [];
	const existingItem = cart.find(item => item.id === productId);

	if (existingItem) {
		existingItem.qty += quantity;
	} else {
		cart.push({ id: productId, qty: quantity });
	}

	localStorage.setItem('cart', JSON.stringify(cart));
	updateCartBadge();

	// Show success message
	const btn = document.getElementById('add-to-cart-btn');
	const originalText = btn.innerHTML;
	btn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Ditambahkan ke Keranjang!';
	btn.disabled = true;
	setTimeout(() => {
		btn.innerHTML = originalText;
		btn.disabled = false;
	}, 2000);
});

// Update cart badge
function updateCartBadge() {
	const cart = JSON.parse(localStorage.getItem('cart')) || [];
	const total = cart.reduce((sum, item) => sum + item.qty, 0);
	const badge = document.getElementById('cart-count');
	if (total > 0) {
		badge.textContent = total;
		badge.style.display = 'inline-block';
	} else {
		badge.style.display = 'none';
	}
}

// Load footer
async function loadFooter() {
	try {
		const response = await fetch('footer.html');
		document.getElementById('site-footer').innerHTML = await response.text();
	} catch (error) {
		console.error('Error loading footer:', error);
	}
}

// Initialize
updateCartBadge();
loadAllProducts();
