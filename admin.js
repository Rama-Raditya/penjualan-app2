document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('add-product-form');
    const feedbackDiv = document.getElementById('form-feedback');
    const submitBtn = document.getElementById('submit-btn');
    const submitText = document.getElementById('submit-text');
    const submitSpinner = document.getElementById('submit-spinner');

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Mencegah form melakukan submit standar

        // Tampilkan status loading
        submitBtn.disabled = true;
        submitText.textContent = 'Menyimpan...';
        submitSpinner.classList.remove('hidden');
        feedbackDiv.textContent = '';
        feedbackDiv.className = 'text-sm';

        // Kumpulkan data dari form
        const formData = new FormData(form);
        const productData = Object.fromEntries(formData.entries());

        // Konversi harga ke tipe number
        productData.price = parseFloat(productData.price);

        try {
            const response = await fetch('api/api.php?action=add_product', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData),
            });

            const result = await response.json();

            if (response.ok) {
                feedbackDiv.textContent = result.success || 'Produk berhasil ditambahkan!';
                feedbackDiv.classList.add('text-green-600');
                form.reset(); // Kosongkan form setelah berhasil
            } else {
                throw new Error(result.error || 'Terjadi kesalahan yang tidak diketahui.');
            }
        } catch (error) {
            feedbackDiv.textContent = `Error: ${error.message}`;
            feedbackDiv.classList.add('text-red-600');
        } finally {
            // Kembalikan tombol ke state normal
            submitBtn.disabled = false;
            submitText.textContent = 'Tambah Produk';
            submitSpinner.classList.add('hidden');
        }
    });
});
