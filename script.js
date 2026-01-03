// Global state
let allData = {};
let currentTab = 'Doxy Visits';
let currentData = [];
let filteredData = [];
let sortColumn = null;
let sortDirection = 'asc';

// Initialize the app
async function init() {
    try {
        // Load data
        const response = await fetch('data.json');
        allData = await response.json();
        
        // Set last update time
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
        
        // Setup event listeners
        setupTabListeners();
        setupSearchListener();
        
        // Load first tab
        loadTab(currentTab);
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('tableWrapper').innerHTML = 
            '<p class="no-results">Error loading data. Please check the console.</p>';
    }
}

// Setup tab click listeners
function setupTabListeners() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Load new tab
            currentTab = button.dataset.tab;
            loadTab(currentTab);
            
            // Reset search
            document.getElementById('searchInput').value = '';
        });
    });
}

// Setup search listener
function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterData(searchTerm);
        renderTable(filteredData);
    });
}

// Load tab data
function loadTab(tabName) {
    currentData = allData[tabName] || [];
    filteredData = [...currentData];
    sortColumn = null;
    sortDirection = 'asc';
    renderTable(filteredData);
}

// Filter data based on search
function filterData(searchTerm) {
    if (!searchTerm) {
        filteredData = [...currentData];
        return;
    }
    
    filteredData = currentData.filter(row => {
        return Object.values(row).some(value => {
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(searchTerm);
        });
    });
}

// Sort data
function sortData(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    filteredData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        // Handle null/undefined
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        // Try to parse as number
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // String comparison
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (sortDirection === 'asc') {
            return aStr.localeCompare(bStr);
        } else {
            return bStr.localeCompare(aStr);
        }
    });
    
    renderTable(filteredData);
}

// Render table
function renderTable(data) {
    const tableWrapper = document.getElementById('tableWrapper');
    
    // Update row count
    document.getElementById('rowCount').textContent = 
        `Showing ${data.length} of ${currentData.length} rows`;
    
    if (!data || data.length === 0) {
        tableWrapper.innerHTML = '<p class="no-results">No data available for this tab.</p>';
        return;
    }
    
    // Get all unique columns from the data
    const columns = [...new Set(data.flatMap(row => Object.keys(row)))];
    
    // Filter out completely empty columns
    const meaningfulColumns = columns.filter(col => {
        return data.some(row => {
            const val = row[col];
            return val !== null && val !== undefined && val !== '';
        });
    });
    
    // Create table HTML
    let html = '<table><thead><tr>';
    
    meaningfulColumns.forEach(col => {
        const sortClass = sortColumn === col ? `sort-${sortDirection}` : '';
        const displayName = cleanColumnName(col);
        html += `<th class="${sortClass}" onclick="sortData('${col.replace(/'/g, "\\'")}')">${displayName}</th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    // Add data rows
    data.forEach(row => {
        html += '<tr>';
        meaningfulColumns.forEach(col => {
            let value = row[col];
            
            // Handle null/undefined
            if (value === null || value === undefined || value === '') {
                value = '';
            } else {
                value = String(value);
            }
            
            // Check if it's a number
            const isNumber = !isNaN(parseFloat(value)) && isFinite(value) && value !== '';
            const cellClass = isNumber ? 'number' : '';
            
            html += `<td class="${cellClass}">${escapeHtml(value)}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    tableWrapper.innerHTML = html;
}

// Clean column names for display
function cleanColumnName(name) {
    // Convert to string and clean up
    name = String(name);
    
    // If it starts with "Unnamed:", try to make it more readable
    if (name.startsWith('Unnamed:')) {
        return '';
    }
    
    // If it's a datetime string like "2025-12-13 00:00:00"
    if (name.match(/^\d{4}-\d{2}-\d{2}/)) {
        return name.split(' ')[0];
    }
    
    return name;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

