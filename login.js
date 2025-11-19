// Simple authentication system
const DEMO_CREDENTIALS = {
	username: 'admin',
	password: 'admin123'
};

document.getElementById('login-form').addEventListener('submit', (e) => {
	e.preventDefault();
	
	const username = document.getElementById('username').value;
	const password = document.getElementById('password').value;
	const errorMsg = document.getElementById('error-msg');
	const successMsg = document.getElementById('success-msg');
	
	errorMsg.style.display = 'none';
	successMsg.style.display = 'none';
	
	if (username === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password) {
		// Set session/token in localStorage
		localStorage.setItem('adminToken', 'session_' + Date.now());
		localStorage.setItem('adminUsername', username);
		
		successMsg.textContent = '✓ Login berhasil! Redirect...';
		successMsg.style.display = 'block';
		
		setTimeout(() => {
			window.location.href = 'products.html';
		}, 1000);
	} else {
		errorMsg.textContent = '✗ Username atau password salah!';
		errorMsg.style.display = 'block';
	}
});

// Check if already logged in
window.addEventListener('load', () => {
	if (localStorage.getItem('adminToken')) {
		window.location.href = 'products.html';
	}
});
