let allProducts = [];
const WHATSAPP_NUMBER = '6283131130557'; // Ganti dengan nomor WhatsApp toko Anda

// Load all products on init
async function loadAllProducts() {
	try {
		const response = await fetch('api/api.php?action=get_products');
		if (!response.ok) throw new Error('Gagal mengambil produk');
		allProducts = await response.json();
	} catch (error) {
		console.error('Error:', error);
	}
}

// Display cart
function displayCart() {
	const cart = JSON.parse(localStorage.getItem('cart')) || [];
	updateCartBadge();

	if (cart.length === 0) {
		document.getElementById('empty-cart').style.display = 'block';
		document.getElementById('checkout-content').style.display = 'none';
		return;
	}

	document.getElementById('empty-cart').style.display = 'none';
	document.getElementById('checkout-content').style.display = 'grid';

	const cartHTML = cart.map(item => {
		const product = allProducts.find(p => p.id === item.id);
		if (!product) return '';

		return `
			<div class="product-item">
				<img src="${product.image}" alt="${product.title}" class="product-img" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23e5e7eb%22 width=%2280%22 height=%2280%22/%3E%3C/svg%3E'">
				<div class="product-details">
					<div class="product-title">${product.title}</div>
					<div class="product-qty">Jumlah: ${item.qty} × Rp ${formatPrice(product.price)} = <strong>Rp ${formatPrice(product.price * item.qty)}</strong></div>
					<a href="javascript:removeFromCart(${item.id})" class="remove-btn"><i class="bi bi-trash me-1"></i>Hapus</a>
				</div>
			</div>
		`;
	}).join('');

	document.getElementById('cart-items').innerHTML = cartHTML;
	updateSummary();
}

// Remove from cart
function removeFromCart(productId) {
	let cart = JSON.parse(localStorage.getItem('cart')) || [];
	cart = cart.filter(item => item.id !== productId);
	localStorage.setItem('cart', JSON.stringify(cart));
	displayCart();
}

// Format price
function formatPrice(price) {
	return new Intl.NumberFormat('id-ID', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(price);
}

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

// Calculate totals
function calculateTotals() {
	const cart = JSON.parse(localStorage.getItem('cart')) || [];
	const shipping = parseFloat(document.querySelector('input[name="shipping"]:checked').value) || 0;

	let subtotal = 0;
	cart.forEach(item => {
		const product = allProducts.find(p => p.id === item.id);
		if (product) {
			subtotal += product.price * item.qty;
		}
	});

	const tax = Math.round(subtotal * 0.1);
	const total = subtotal + shipping + tax;

	return { subtotal, shipping, tax, total };
}

// Update summary
function updateSummary() {
	const { subtotal, shipping, tax, total } = calculateTotals();

	document.getElementById('summary-subtotal').textContent = 'Rp ' + formatPrice(subtotal);
	document.getElementById('summary-shipping').textContent = 'Rp ' + formatPrice(shipping);
	document.getElementById('summary-tax').textContent = 'Rp ' + formatPrice(tax);
	document.getElementById('summary-total').textContent = formatPrice(total);
}

// Shipping change listener
document.querySelectorAll('input[name="shipping"]').forEach(radio => {
	radio.addEventListener('change', updateSummary);
});

// Generate WhatsApp message
function generateWhatsAppMessage() {
	const name = document.getElementById('customer-name').value.trim();
	const phone = document.getElementById('customer-phone').value.trim();
	const address = document.getElementById('customer-address').value.trim();
	const notes = document.getElementById('customer-notes').value.trim();

	if (!name || !phone || !address) {
		alert('Harap lengkapi semua data pengiriman (Nama, Telepon, Alamat)');
		return null;
	}

	const cart = JSON.parse(localStorage.getItem('cart')) || [];
	if (cart.length === 0) {
		alert('Keranjang Anda kosong');
		return null;
	}

	const { subtotal, shipping, tax, total } = calculateTotals();
	const shipping_method = document.querySelector('input[name="shipping"]:checked').parentElement.textContent.trim();

	let message = '🛍️ *PESANAN BARU*\n\n';
	message += '👤 *Data Pelanggan*\n';
	message += `Nama: ${name}\n`;
	message += `Telepon: ${phone}\n`;
	message += `Alamat: ${address}\n`;
	if (notes) message += `Catatan: ${notes}\n`;
	message += '\n';

	message += '📦 *Detail Produk*\n';
	cart.forEach((item, index) => {
		const product = allProducts.find(p => p.id === item.id);
		if (product) {
			message += `${index + 1}. ${product.title}\n`;
			message += `   Qty: ${item.qty} × Rp ${formatPrice(product.price)}\n`;
			message += `   Subtotal: Rp ${formatPrice(product.price * item.qty)}\n`;
		}
	});
	message += '\n';

	message += '💰 *Ringkasan Pembayaran*\n';
	message += `Subtotal: Rp ${formatPrice(subtotal)}\n`;
	message += `Pengiriman: ${shipping_method} - Rp ${formatPrice(shipping)}\n`;
	message += `PPN (10%): Rp ${formatPrice(tax)}\n`;
	message += `*TOTAL: Rp ${formatPrice(total)}*\n`;

	return message;
}

// Send to WhatsApp and save order
function sendToWhatsApp() {
	const message = generateWhatsAppMessage();
	if (!message) return;

	const encodedMessage = encodeURIComponent(message);
	const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
	
	// Save order to localStorage before sending
	const name = document.getElementById('customer-name').value.trim();
	const phone = document.getElementById('customer-phone').value.trim();
	const address = document.getElementById('customer-address').value.trim();
	const notes = document.getElementById('customer-notes').value.trim();
	const cart = JSON.parse(localStorage.getItem('cart')) || [];
	const { subtotal, shipping, tax, total } = calculateTotals();
	const shipping_method = document.querySelector('input[name="shipping"]:checked').value;

	const orderSummary = {
		customer: { name, phone, address, notes },
		items: cart.map(item => {
			const product = allProducts.find(p => p.id === item.id);
			return {
				id: item.id,
				title: product.title,
				price: product.price,
				qty: item.qty,
				subtotal: product.price * item.qty
			};
		}),
		totals: { subtotal, shipping, tax, total },
		shipping_method,
		date: new Date().toLocaleString('id-ID'),
		order_id: 'ORD-' + Date.now(),
		status: 'pending'
	};

	const orders = JSON.parse(localStorage.getItem('orders')) || [];
	orders.push(orderSummary);
	localStorage.setItem('orders', JSON.stringify(orders));

	// Clear cart
	localStorage.removeItem('cart');
	updateCartBadge();

	// Open WhatsApp
	window.open(whatsappURL, '_blank');

	setTimeout(() => {
		window.location.href = 'index.html';
	}, 2000);
}

// Place order button - now sends to WhatsApp
document.getElementById('place-order-btn').addEventListener('click', sendToWhatsApp);


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
Promise.all([loadAllProducts(), loadFooter()]).then(() => {
	displayCart();
});
