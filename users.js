// Simple users management with mock data
const users = [
    {id:1,name:'Budi',email:'budi@example.com',phone:'081234567890',joined:'2025-01-10', orders:['ORD001','ORD003']},
    {id:2,name:'Siti',email:'siti@example.com',phone:'082345678901',joined:'2025-02-22', orders:['ORD002']},
];

function renderUsers(){
    const tbody = document.getElementById('users-table');
    tbody.innerHTML = '';
    users.forEach((u,i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i+1}</td>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${u.phone}</td>
            <td>${u.joined}</td>
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

function viewOrders(userId){
    const u = users.find(x => x.id === userId);
    if(!u) return;
    alert('Pesanan user ' + u.name + ':\n' + (u.orders.length ? u.orders.join('\n') : 'Tidak ada pesanan'));
}

function deleteUser(userId){
    const idx = users.findIndex(x => x.id === userId);
    if(idx === -1) return;
    if(!confirm('Hapus user ini?')) return;
    users.splice(idx,1);
    renderUsers();
    showAlert('User dihapus', 'success');
}

function showAlert(message, type='info'){
    const wrap = document.getElementById('users-alert');
    wrap.innerHTML = `<div class="alert alert-${type} alert-dismissible" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
}

document.addEventListener('DOMContentLoaded', function(){
    renderUsers();
});
