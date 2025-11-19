const productModal = new bootstrap.Modal(document.getElementById('productModal'));
const productForm = document.getElementById('product-form');
const productsTable = document.getElementById('products-table');
const alertContainer = document.getElementById('alert-container');
let products = [];

// Normalize category values (map jewelry/jewelery -> accecories)
function normalizeCategory(cat) {
	if (!cat) return cat;
	const c = String(cat).trim().toLowerCase();
	if (c === 'jewelry' || c === 'jewelery' || c === 'jewel') return 'accecories';
	return cat;
}
// Check authentication on load
function checkAuth() {
	const token = localStorage.getItem('adminToken');
	if (!token) {
		window.location.href = 'login.html';
		return;
	}
}

// Load all products
async function loadProducts() {
	try {
		const response = await fetch('api/api.php?action=get_products');
		if (!response.ok) throw new Error('Gagal mengambil produk');
		products = await response.json();
		// normalize categories in-memory for consistent display
		products = products.map(p => ({ ...p, category: normalizeCategory(p.category) }));
		loadCategories();
		renderProducts();
	} catch (error) {
		showAlert('error', 'Gagal memuat produk: ' + error.message);
		productsTable.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Gagal memuat produk</td></tr>';
	}
}

// Load categories from products
function loadCategories() {
	const categorySelect = document.getElementById('product-category');
	if (!categorySelect) return;

	// Build a display map: value -> label. Prefer product.category_name if provided by API.
	const catMap = {};
	products.forEach(p => {
		const key = p.category;
		let label = p.category_name || key;
		// If category looks like a numeric id, show a friendly label
		if ((typeof key === 'number') || (/^\d+$/.test(String(key)))) {
			label = p.category_name || `Kategori ${key}`;
		}
		// normalize capitalization
		if (typeof label === 'string') label = label.charAt(0).toUpperCase() + label.slice(1);
		catMap[String(key)] = label;
	});

	// Keep the placeholder option and preserve current selection
	const currentValue = categorySelect.value;
	categorySelect.innerHTML = '<option value="">-- Pilih Kategori --</option>';

	// Sort by label for nicer ordering
	Object.keys(catMap).sort((a,b) => catMap[a].localeCompare(catMap[b])).forEach(k => {
		const option = document.createElement('option');
		option.value = k;
		option.textContent = catMap[k];
		categorySelect.appendChild(option);
	});

	if (currentValue) {
		categorySelect.value = currentValue;
	}
}

// Render products table
function renderProducts() {
	if (products.length === 0) {
		productsTable.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Belum ada produk</td></tr>';
		return;
	}

	// helper to get display label for category
	const getCategoryLabel = (p) => {
		if (p.category_name) return p.category_name;
		if ((typeof p.category === 'number') || (/^\d+$/.test(String(p.category)))) return 'Kategori ' + p.category;
		return p.category;
	};

	productsTable.innerHTML = products.map(product => `
		<tr>
			<td>#${product.id}</td>
			<td><img src="${product.image}" alt="${product.title}" class="product-img-thumb" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22%3E%3Crect fill=%22%23e5e7eb%22 width=%2250%22 height=%2250%22/%3E%3C/svg%3E'"></td>
			<td><strong>${product.title}</strong></td>
			<td><span class="badge bg-info text-dark">${getCategoryLabel(product)}</span></td>
			<td><strong>Rp ${formatPrice(product.price)}</strong></td>
			<td>
				<button class="btn btn-sm btn-warning me-2" onclick="editProduct(${product.id})"><i class="bi bi-pencil"></i> Edit</button>
				<button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})"><i class="bi bi-trash"></i> Hapus</button>
			</td>
		</tr>
	`).join('');
}

// Format price
function formatPrice(price) {
	return new Intl.NumberFormat('id-ID', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(price);
}

// Add product
productForm.addEventListener('submit', async (e) => {
	e.preventDefault();
	const productId = document.getElementById('product-id').value;
	const data = {
		title: document.getElementById('product-title').value,
		price: parseFloat(document.getElementById('product-price').value),
		category: normalizeCategory(document.getElementById('product-category').value),
		image: document.getElementById('product-image').value,
		description: document.getElementById('product-description').value
	};

	try {
		let response;
		if (productId) {
			data.id = productId;
			response = await fetch('api/api.php?action=update_product', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify(data)
			});
		} else {
			response = await fetch('api/api.php?action=add_product', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify(data)
			});
		}

		if (!response.ok) throw new Error('Gagal menyimpan produk');
		const result = await response.json();
		
		if (result.success || result.id) {
			showAlert('success', productId ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan');
			productForm.reset();
			document.getElementById('product-id').value = '';
			document.getElementById('modal-title').textContent = 'Tambah Produk';
			document.getElementById('btn-submit-text').textContent = 'Simpan';
			productModal.hide();
			loadProducts();
		} else {
			showAlert('error', result.message || 'Gagal menyimpan produk');
		}
	} catch (error) {
		showAlert('error', 'Error: ' + error.message);
	}
});

// Edit product
function editProduct(id) {
	const product = products.find(p => p.id == id);
	if (!product) return;

	document.getElementById('product-id').value = product.id;
	document.getElementById('product-title').value = product.title;
	document.getElementById('product-price').value = product.price;
	// ensure select shows normalized value
	const catSelect = document.getElementById('product-category');
	if (catSelect) {
		// If API provided category_name and stored category is numeric id, prefer id value but show readable label.
		catSelect.value = String(product.category || '')
	}
	document.getElementById('product-image').value = product.image;
	document.getElementById('product-description').value = product.description;
	document.getElementById('modal-title').textContent = 'Edit Produk';
	document.getElementById('btn-submit-text').textContent = 'Update';
	productModal.show();
}

// Delete product
async function deleteProduct(id) {
	if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;

	try {
		const response = await fetch('api/api.php?action=delete_product', {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({id})
		});

		if (!response.ok) throw new Error('Gagal menghapus produk');
		const result = await response.json();

		if (result.success) {
			showAlert('success', 'Produk berhasil dihapus');
			loadProducts();
		} else {
			showAlert('error', result.message || 'Gagal menghapus produk');
		}
	} catch (error) {
		showAlert('error', 'Error: ' + error.message);
	}
}

// Show alert
function showAlert(type, message) {
	const alertHTML = `
		<div class="alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show" role="alert">
			<i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>${message}
			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
		</div>
	`;
	alertContainer.innerHTML = alertHTML;
	setTimeout(() => alertContainer.innerHTML = '', 5000);
}

// Logout
document.getElementById('logout-btn').addEventListener('click', (e) => {
	e.preventDefault();
	localStorage.removeItem('adminToken');
	localStorage.removeItem('adminUsername');
	window.location.href = 'login.html';
});

// Reset form when modal is closed
document.getElementById('productModal').addEventListener('hidden.bs.modal', () => {
	productForm.reset();
	document.getElementById('product-id').value = '';
	document.getElementById('product-category').value = '';
	document.getElementById('modal-title').textContent = 'Tambah Produk';
	document.getElementById('btn-submit-text').textContent = 'Simpan';
});

// Initialize
checkAuth();
loadProducts();
