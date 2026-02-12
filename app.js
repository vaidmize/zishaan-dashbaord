// Google Sheets CSV Export Link
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/18yJ7cySvgyR4sC70haKvwh-EuLpD-ygvTGcgAuK3zfI/export?format=csv&gid=15146022';

// Credentials
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'zishann123';

// Data state
let currentLeads = [];
let currentOrders = [];
let lastOrderCount = 0;
let notifications = [];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    checkLoginSession();
    setupLoginLogic();
    setupTabSwitching();
    setupSearch();
    setupModal();
    setupNotifications();
    setupSettings();
});

function setupNotifications() {
    const trigger = document.getElementById('notification-trigger');
    const dropdown = document.getElementById('notif-dropdown');
    const clearBtn = document.getElementById('clear-notif');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        dropdown.classList.remove('active');
    });

    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifications = [];
        updateNotifUI();
    });
}

function updateNotifUI() {
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');

    if (notifications.length > 0) {
        badge.innerText = notifications.length;
        badge.style.display = 'block';
        list.innerHTML = notifications.map((n, index) => `
            <div class="notif-item" onclick="handleNotifClick(${index})">
                <p><strong>${n.title}</strong></p>
                <p>${n.msg}</p>
                <small>${n.time} • Click to View</small>
            </div>
        `).join('');
    } else {
        badge.style.display = 'none';
        list.innerHTML = '<p class="empty-notif">No new orders</p>';
    }
}

function handleNotifClick(notifIndex) {
    const notif = notifications[notifIndex];
    if (notif && notif.orderIndex !== undefined) {
        showDetails(notif.orderIndex, 'orders');
        notifications.splice(notifIndex, 1);
        updateNotifUI();
    }
}

function checkNewOrders(newOrders) {
    if (lastOrderCount > 0 && newOrders.length > lastOrderCount) {
        const diff = newOrders.length - lastOrderCount;
        for (let i = 0; i < diff; i++) {
            const order = newOrders[i];
            notifications.unshift({
                title: 'New Order Received!',
                msg: `${order['Name'] || 'A customer'} ordered ${order['Product name'] || 'a product'}`,
                time: new Date().toLocaleTimeString(),
                orderIndex: i
            });
        }
    }
    lastOrderCount = newOrders.length;
    updateNotifUI();
}

function setupSettings() {
    const crmUrlInput = document.getElementById('crm-url');
    const syncBtn = document.getElementById('sync-crm-btn');
    const statusText = document.getElementById('sync-status');

    // Load saved CRM URL
    const savedUrl = localStorage.getItem('crm_webhook_url');
    if (savedUrl) crmUrlInput.value = savedUrl;

    syncBtn?.addEventListener('click', async () => {
        const url = crmUrlInput.value.trim();
        if (!url) {
            statusText.innerText = 'Please enter a CRM Webhook URL';
            statusText.className = 'status-text error';
            return;
        }

        // Save URL for future Use
        localStorage.setItem('crm_webhook_url', url);

        statusText.innerText = 'Syncing data to CRM...';
        statusText.className = 'status-text';
        syncBtn.disabled = true;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'Zishann Dashboard',
                    timestamp: new Date().toISOString(),
                    leads: currentLeads,
                    orders: currentOrders
                })
            });

            if (response.ok) {
                statusText.innerText = '✅ Data synced successfully to CRM!';
                statusText.className = 'status-text success';
            } else {
                throw new Error('Sync failed');
            }
        } catch (error) {
            statusText.innerText = '❌ Error syncing to CRM. Check URL and connection.';
            statusText.className = 'status-text error';
        } finally {
            syncBtn.disabled = false;
        }
    });
}

function checkLoginSession() {
    if (localStorage.getItem('zishann_logged_in') === 'true') {
        showApp();
    }
}

function setupLoginLogic() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const errorMsg = document.getElementById('login-error');

    loginBtn?.addEventListener('click', () => {
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        if (user === ADMIN_USER && pass === ADMIN_PASS) {
            localStorage.setItem('zishann_logged_in', 'true');
            showApp();
        } else {
            errorMsg.innerText = 'Invalid username or password';
        }
    });

    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('zishann_logged_in');
        window.location.reload();
    });
}

function showApp() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    fetchRealData();
    setInterval(fetchRealData, 15000);
}

async function fetchRealData() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        const data = parseCSV(csvText);
        if (data && data.length > 0) {
            currentOrders = data;
            currentLeads = data;
            updateDashboard(currentLeads, currentOrders);
            checkNewOrders(currentOrders);
        }
    } catch (error) {
        console.error('Error fetching CSV data:', error);
    }
}

function parseCSV(csv) {
    const lines = csv.split('\n');
    if (lines.length < 2) return [];
    const parseLine = (line) => {
        const result = []; let cur = ''; let inQuotes = false;
        for (let char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { result.push(cur.trim()); cur = ''; }
            else cur += char;
        }
        result.push(cur.trim()); return result;
    }
    const headers = parseLine(lines[0]);
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const obj = {}; const currentline = parseLine(lines[i]);
        for (let j = 0; j < headers.length; j++) { obj[headers[j]] = currentline[j] || ''; }
        result.push(obj);
    }
    return result;
}

function updateDashboard(leads, orders) {
    document.getElementById('count-leads').innerText = leads.length;
    document.getElementById('count-orders').innerText = orders.length;
    const conversion = leads.length > 0 ? ((orders.length / leads.length) * 100).toFixed(1) : 0;
    document.getElementById('conversion-rate').innerText = `${conversion}%`;
    renderLeads(leads);
    renderOrders(orders);
    initChart(leads, orders);
}

function renderLeads(leads) {
    const leadsBody = document.getElementById('leads-body');
    if (leadsBody) {
        if (leads.length === 0) { leadsBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No data found</td></tr>'; return; }
        leadsBody.innerHTML = leads.map((lead, index) => `
            <tr onclick="showDetails(${index}, 'leads')">
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="https://ui-avatars.com/api/?name=${lead['Name'] || 'User'}&background=random" style="width: 32px; border-radius: 50%;">
                        <span>${lead['Name'] || 'No Name'}</span>
                    </div>
                </td>
                <td>${lead['Phone / WhatsApp number'] || '-'}</td>
                <td>Website</td>
                <td>New</td>
                <td><span class="status-pill new">Active</span></td>
            </tr>
        `).join('');
    }
}

function renderOrders(orders) {
    const ordersBody = document.getElementById('orders-body');
    if (ordersBody) {
        if (orders.length === 0) { ordersBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">No data found</td></tr>'; return; }
        ordersBody.innerHTML = orders.map((order, index) => `
            <tr onclick="showDetails(${index}, 'orders')">
                <td style="font-weight: 600;">${order['Name'] || 'Guest'}</td>
                <td>${order['Phone / WhatsApp number'] || '-'}</td>
                <td>${order['Product name'] || 'Jhumar'}</td>
                <td>${order['quantity'] || '1'}</td>
                <td style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${order['address'] || '-'}</td>
                <td><span class="status-pill completed">Confirmed</span></td>
            </tr>
        `).join('');
    }
}

function showDetails(index, type) {
    const data = type === 'leads' ? currentLeads[index] : currentOrders[index];
    const modal = document.getElementById('details-modal');
    const modalData = document.getElementById('modal-data');
    if (modal && modalData) {
        modalData.innerHTML = `
            <div class="modal-details">
                <h2><i class="fas fa-user-circle"></i> Customer Details</h2>
                <div class="detail-row"><label>Full Name:</label> <span>${data['Name'] || 'N/A'}</span></div>
                <div class="detail-row"><label>Phone/WhatsApp:</label> <span>${data['Phone / WhatsApp number'] || 'N/A'}</span></div>
                <div class="detail-row"><label>Product:</label> <span>${data['Product name'] || 'N/A'}</span></div>
                <div class="detail-row"><label>Quantity:</label> <span>${data['quantity'] || 'N/A'}</span></div>
                <div class="detail-row"><label>Address:</label> <span style="text-align: right; max-width: 60%;">${data['address'] || 'N/A'}</span></div>
                <div class="detail-row"><label>Order Status:</label> <span class="status-pill completed">Confirmed</span></div>
                <div style="margin-top: 2rem; display: flex; gap: 1rem;">
                    <a href="tel:${data['Phone / WhatsApp number']}" class="btn-small" style="text-decoration: none; background: #10b981; color: white; padding: 10px 15px; border-radius: 8px;">Call</a>
                    <a href="https://wa.me/${data['Phone / WhatsApp number']}" target="_blank" style="text-decoration: none; background: #25D366; color: white; padding: 10px 15px; border-radius: 8px;">WhatsApp</a>
                </div>
            </div>
        `;
        modal.style.display = 'block';
    }
}

function setupModal() {
    const modal = document.getElementById('details-modal');
    const closeBtn = document.getElementsByClassName('close-modal')[0];
    if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; }
    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; }
}

function setupTabSwitching() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.id === 'logout-btn') return;
            e.preventDefault();
            const tab = item.getAttribute('data-tab');

            // UI Update
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const overview = document.getElementById('overview');
            const settings = document.getElementById('settings');
            const leadsList = document.getElementById('leads-list-container');
            const ordersList = document.getElementById('orders-list-container');
            const charts = document.querySelector('.charts-section');
            const stats = document.querySelector('.stats-grid');
            const tablesSection = document.querySelector('.tables-section');

            if (tab === 'settings') {
                overview.style.display = 'none';
                settings.style.display = 'block';
            } else {
                overview.style.display = 'block';
                settings.style.display = 'none';

                if (tab === 'overview') {
                    stats.style.display = 'grid';
                    charts.style.display = 'flex';
                    tablesSection.style.gridTemplateColumns = '1fr 1fr';
                    leadsList.style.display = 'block';
                    ordersList.style.display = 'block';
                } else if (tab === 'leads') {
                    stats.style.display = 'none';
                    charts.style.display = 'none';
                    tablesSection.style.gridTemplateColumns = '1fr';
                    leadsList.style.display = 'block';
                    ordersList.style.display = 'none';
                } else if (tab === 'orders') {
                    stats.style.display = 'none';
                    charts.style.display = 'none';
                    tablesSection.style.gridTemplateColumns = '1fr';
                    leadsList.style.display = 'none';
                    ordersList.style.display = 'block';
                }
            }
        });
    });
}

function setupSearch() {
    const searchInput = document.querySelector('.search-bar input');
    searchInput?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('tbody tr').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(query) ? '' : 'none';
        });
    });
}

let chartInstance = null;
function initChart(leads, orders) {
    const ctx = document.getElementById('growthChart')?.getContext('2d');
    if (!ctx) return;
    if (chartInstance) chartInstance.destroy();

    const productCounts = {};
    orders.forEach(o => {
        const p = o['Product name'] || 'Unknown';
        productCounts[p] = (productCounts[p] || 0) + 1;
    });

    const labels = Object.keys(productCounts).slice(0, 7);
    const data = Object.values(productCounts).slice(0, 7);

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length > 0 ? labels : ['No Data'],
            datasets: [{
                label: 'Order Volume by Product',
                data: data.length > 0 ? data : [0],
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: '#6366f1',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
        }
    });
}
