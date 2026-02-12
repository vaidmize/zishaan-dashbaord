// Google Sheets CSV Export Link
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/18yJ7cySvgyR4sC70haKvwh-EuLpD-ygvTGcgAuK3zfI/export?format=csv&gid=15146022';

// Data state
let currentLeads = [];
let currentOrders = [];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Show empty state initially
    updateDashboard([], []);

    // Fetch real data immediately
    fetchRealData();

    // Auto-refresh every 15 seconds to get latest Google Sheet data
    setInterval(fetchRealData, 15000);

    setupTabSwitching();
    setupSearch();
});

async function fetchRealData() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        const data = parseCSV(csvText);

        // Map CSV data to dashboard (Treating everything as orders for this specific sheet)
        if (data && data.length > 0) {
            currentOrders = data;
            currentLeads = data; // Mirroring for demo since it's one sheet
            updateDashboard(currentLeads, currentOrders);
        }
    } catch (error) {
        console.error('Error fetching CSV data:', error);
    }
}

// Simple CSV to JSON Parser
function parseCSV(csv) {
    const lines = csv.split('\n');
    const result = [];
    const headers = lines[0].split(',');

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const obj = {};
        const currentline = lines[i].split(',');

        for (let j = 0; j < headers.length; j++) {
            obj[headers[j].trim()] = currentline[j] ? currentline[j].trim() : '';
        }
        result.push(obj);
    }
    return result;
}

function updateDashboard(leads, orders) {
    // Update Stats
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
        leadsBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No leads found</td></tr>';
        return;
    }

    leadsBody.innerHTML = leads.slice(0, 15).map(lead => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="https://ui-avatars.com/api/?name=${lead['Name'] || 'User'}&background=random" style="width: 32px; border-radius: 50%;">
                    <span>${lead['Name'] || 'No Name'}</span>
                </div>
            </td>
            <td>${lead['Phone / WhatsApp number'] || lead['Number'] || '-'}</td>
            <td>Website</td>
            <td>New User</td>
            <td><span class="status-pill new">Active</span></td>
        </tr>
    `).join('');
}

function renderOrders(orders) {
    const ordersBody = document.getElementById('orders-body');
    if (orders.length === 0) {
        ordersBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">No orders found</td></tr>';
        return;
    }

    ordersBody.innerHTML = orders.slice(0, 15).map(order => `
        <tr>
            <td style="font-weight: 600;">${order['Name'] || 'Guest'}</td>
            <td>${order['Phone / WhatsApp number'] || order['Number'] || '-'}</td>
            <td>${order['Product name'] || order['item'] || 'Jhumar'}</td>
            <td>${order['quantity'] || '1'}</td>
            <td style="max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${order['address']}">
                ${order['address'] || '-'}
            </td>
            <td><span class="status-pill completed">Confirmed</span></td>
        </tr>
    `).join('');
}

function setupTabSwitching() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.getAttribute('data-tab');

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const leadsList = document.querySelector('.recent-list.card:first-child');
            const ordersList = document.querySelector('.recent-list.card:last-child');
            const charts = document.querySelector('.charts-section');
            const stats = document.querySelector('.stats-grid');

            if (tab === 'overview') {
                stats.style.display = 'grid';
                charts.style.display = 'flex';
                document.querySelector('.tables-section').style.gridTemplateColumns = '1fr 1fr';
                leadsList.style.display = 'block';
                ordersList.style.display = 'block';
            } else if (tab === 'leads') {
                stats.style.display = 'none';
                charts.style.display = 'none';
                document.querySelector('.tables-section').style.gridTemplateColumns = '1fr';
                leadsList.style.display = 'block';
                ordersList.style.display = 'none';
            } else if (tab === 'orders') {
                stats.style.display = 'none';
                charts.style.display = 'none';
                document.querySelector('.tables-section').style.gridTemplateColumns = '1fr';
                leadsList.style.display = 'none';
                ordersList.style.display = 'block';
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
    const ctx = document.getElementById('growthChart').getContext('2d');
    if (chartInstance) { chartInstance.destroy(); }

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
            datasets: [{
                label: 'Leads',
                data: [leads.length, (leads.length * 0.8), (leads.length * 1.2), (leads.length * 0.9), (leads.length * 1.5), (leads.length * 0.7), leads.length],
                borderColor: '#6366f1',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                backgroundColor: gradient,
                pointBackgroundColor: '#6366f1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}
