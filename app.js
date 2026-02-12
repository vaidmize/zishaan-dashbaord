// Google Sheets CSV Export Link
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/18yJ7cySvgyR4sC70haKvwh-EuLpD-ygvTGcgAuK3zfI/export?format=csv&gid=15146022';

// Credentials (Hardcoded for this demo, usually handled via backend)
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'zishann123';

// Data state
let currentLeads = [];
let currentOrders = [];
let isLoggedIn = false;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    checkLoginSession();
    setupLoginLogic();
    setupTabSwitching();
    setupSearch();
    setupModal();
});

function checkLoginSession() {
    if (localStorage.getItem('zishann_logged_in') === 'true') {
        showApp();
    }
}

function setupLoginLogic() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const errorMsg = document.getElementById('login-error');

    loginBtn.addEventListener('click', () => {
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        if (user === ADMIN_USER && pass === ADMIN_PASS) {
            localStorage.setItem('zishann_logged_in', 'true');
            showApp();
        } else {
            errorMsg.innerText = 'Invalid username or password';
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('zishann_logged_in');
        window.location.reload();
    });
}

function showApp() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    fetchRealData();
    setInterval(fetchRealData, 15000); // 15s sync
}

async function fetchRealData() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        const data = parseCSV(csvText);

        if (data && data.length > 0) {
            currentOrders = data;
            currentLeads = data; // Mirroring for now
            updateDashboard(currentLeads, currentOrders);
        }
    } catch (error) {
        console.error('Error fetching CSV data:', error);
    }
}

function parseCSV(csv) {
    const lines = csv.split('\n');
    if (lines.length < 2) return [];

    // Improved CSV parsing for commas within quotes
    const parseLine = (line) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                result.push(cur.trim());
                cur = '';
            } else cur += char;
        }
        result.push(cur.trim());
        return result;
    }

    const headers = parseLine(lines[0]);
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const obj = {};
        const currentline = parseLine(lines[i]);

        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j] || '';
        }
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
    if (leads.length === 0) {
        leadsBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No data found</td></tr>';
        return;
    }

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
            <td>-</td>
            <td><span class="status-pill new">Active</span></td>
        </tr>
    `).join('');
}

function renderOrders(orders) {
    const ordersBody = document.getElementById('orders-body');
    if (orders.length === 0) {
        ordersBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">No data found</td></tr>';
        return;
    }

    ordersBody.innerHTML = orders.map((order, index) => `
        <tr onclick="showDetails(${index}, 'orders')">
            <td style="font-weight: 600;">${order['Name'] || 'Guest'}</td>
            <td>${order['Phone / WhatsApp number'] || '-'}</td>
            <td>${order['Product name'] || 'Jhumar'}</td>
            <td>${order['quantity'] || '1'}</td>
            <td style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${order['address'] || '-'}
            </td>
            <td><span class="status-pill completed">Confirmed</span></td>
        </tr>
    `).join('');
}

function showDetails(index, type) {
    const data = type === 'leads' ? currentLeads[index] : currentOrders[index];
    const modal = document.getElementById('details-modal');
    const modalData = document.getElementById('modal-data');

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
                <a href="tel:${data['Phone / WhatsApp number']}" class="btn-small" style="text-decoration: none; display: flex; align-items: center; gap: 5px; background: #10b981;">
                    <i class="fas fa-phone"></i> Call Customer
                </a>
                <a href="https://wa.me/${data['Phone / WhatsApp number']}" target="_blank" class="btn-small" style="text-decoration: none; display: flex; align-items: center; gap: 5px; background: #25D366;">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </a>
            </div>
        </div>
    `;
    modal.style.display = 'block';
}

function setupModal() {
    const modal = document.getElementById('details-modal');
    const closeBtn = document.getElementsByClassName('close-modal')[0];

    closeBtn.onclick = () => { modal.style.display = 'none'; }
    window.onclick = (event) => {
        if (event.target == modal) { modal.style.display = 'none'; }
    }
}

function setupTabSwitching() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.id === 'logout-btn') return;
            e.preventDefault();
            const tab = item.getAttribute('data-tab');
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const leadsList = document.querySelector('.recent-list.card:first-child');
            const ordersList = document.querySelector('.recent-list.card:last-child');
            const charts = document.querySelector('.charts-section');
            const stats = document.querySelector('.stats-grid');

            if (tab === 'overview') {
                stats.style.display = 'grid'; charts.style.display = 'flex';
                document.querySelector('.tables-section').style.gridTemplateColumns = '1fr 1fr';
                leadsList.style.display = 'block'; ordersList.style.display = 'block';
            } else if (tab === 'leads') {
                stats.style.display = 'none'; charts.style.display = 'none';
                document.querySelector('.tables-section').style.gridTemplateColumns = '1fr';
                leadsList.style.display = 'block'; ordersList.style.display = 'none';
            } else if (tab === 'orders') {
                stats.style.display = 'none'; charts.style.display = 'none';
                document.querySelector('.tables-section').style.gridTemplateColumns = '1fr';
                leadsList.style.display = 'none'; ordersList.style.display = 'block';
            }
        });
    });
}

function setupSearch() {
    const searchInput = document.querySelector('.search-bar input');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    });
}

let chartInstance = null;
function initChart(leads, orders) {
    const ctx = document.getElementById('growthChart')?.getContext('2d');
    if (!ctx) return;
    if (chartInstance) { chartInstance.destroy(); }
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
            datasets: [{
                label: 'Orders Sync',
                data: [orders.length, orders.length + 1, orders.length - 1, orders.length + 2, orders.length, orders.length - 1, orders.length],
                borderColor: '#6366f1', borderWidth: 3, tension: 0.4, fill: true,
                backgroundColor: 'rgba(99, 102, 241, 0.1)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}
