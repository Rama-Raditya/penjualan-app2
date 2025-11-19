// Simple frontend order management (mocked data)
const orders = [
    {id: 'ORD001', customer: 'Budi', total: 250000, date: '2025-11-10', status: 'pending'},
    {id: 'ORD002', customer: 'Siti', total: 150000, date: '2025-11-11', status: 'processing'},
    {id: 'ORD003', customer: 'Andi', total: 500000, date: '2025-11-12', status: 'shipped'},
];

function formatCurrency(v){ return 'Rp ' + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

function renderOrders(){
    const tbody = document.getElementById('orders-table');
    tbody.innerHTML = '';
    orders.forEach((o, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i+1}</td>
            <td>${o.id}</td>
            <td>${o.customer}</td>
            <td>${formatCurrency(o.total)}</td>
            <td>${o.date}</td>
            <td><span class="badge bg-${badgeClass(o.status)} status-badge">${o.status}</span></td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-primary" onclick="changeStatus('${o.id}','processing')">Proses</button>
                    <button class="btn btn-sm btn-outline-success" onclick="changeStatus('${o.id}','shipped')">Kirim</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="changeStatus('${o.id}','cancelled')">Batal</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function badgeClass(status){
    switch(status){
        case 'pending': return 'secondary';
        case 'processing': return 'warning';
        case 'shipped': return 'success';
        case 'cancelled': return 'danger';
        default: return 'light';
    }
}

function changeStatus(orderId, newStatus){
    const idx = orders.findIndex(o => o.id === orderId);
    if(idx === -1) return;
    orders[idx].status = newStatus;
    renderOrders();
    showAlert('Status pesanan ' + orderId + ' diubah menjadi ' + newStatus, 'success');
    // TODO: call backend API to persist change (POST /api/orders/update)
}

function showAlert(message, type='info'){
    const wrap = document.getElementById('orders-alert');
    wrap.innerHTML = `<div class="alert alert-${type} alert-dismissible" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
}

document.addEventListener('DOMContentLoaded', function(){
    renderOrders();
});
