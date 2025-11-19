// Users management — fetch users from backend and render
let usersData = [];

function renderUsers(){
    const tbody = document.getElementById('users-table');
    tbody.innerHTML = '';
    if (!usersData || usersData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Tidak ada user.</td></tr>';
        return;
    }

    usersData.forEach((u,i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i+1}</td>
            <td>${escapeHtml(u.name || '')}</td>
            <td>${escapeHtml(u.email || '')}</td>
            <td>${escapeHtml(u.phone || '')}</td>
            <td>${u.joined ? escapeHtml(u.joined) : '-'}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewOrders(${u.id})">Lihat Pesanan</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id})">Hapus</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, tag => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"
    }[tag]));
}

function viewOrders(userId){
    // This example backend does not include order listing for users yet.
    // For now show a placeholder message.
    const u = usersData.find(x => x.id === userId);
    if(!u) return;
    alert('Fitur lihat pesanan untuk user ' + (u.name || userId) + ' belum diimplementasikan di server.');
}

function deleteUser(userId){
    // Deleting users requires a backend endpoint. Show info for now.
    if(!confirm('Hapus user ini? (perlu endpoint server)')) return;
    showAlert('Penghapusan sementara tidak didukung. Implementasikan endpoint server untuk menghapus user.', 'warning');
}

function showAlert(message, type='info'){
    const wrap = document.getElementById('users-alert');
    wrap.innerHTML = `<div class="alert alert-${type} alert-dismissible" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
}

function fetchUsers(){
    fetch('api/api.php?action=get_users')
        .then(async r => {
            const text = await r.text();
            // Try to parse JSON, but if server returned HTML (error page) handle gracefully
            try {
                const data = JSON.parse(text);
                if (!Array.isArray(data)) {
                    usersData = [];
                } else {
                    usersData = data;
                }
                renderUsers();
            } catch (err) {
                console.error('Failed to parse JSON from /api/api.php?action=get_users', err);
                console.error('Server response (first 10k chars):', text.substring(0, 10000));
                showAlert('Gagal memuat data user dari server. Periksa console (Network / response) untuk detail.', 'danger');
            }
        })
        .catch(err => {
            console.error('Network or fetch error while loading users:', err);
            showAlert('Gagal memuat data user dari server (network).', 'danger');
        });
}

document.addEventListener('DOMContentLoaded', function(){
    fetchUsers();
});
