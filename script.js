// Global state
let allData = {};
let currentTab = 'Doxy Visits';
let currentData = [];
let filteredData = [];
let sortColumn = null;
let sortDirection = 'asc';
let activeFilters = {};

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
    
    // Generate and render analytics
    renderAnalytics(tabName, currentData);
    
    // Generate and render charts
    renderCharts(tabName, currentData);
    
    // Render table
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

// Generate and render analytics
function renderAnalytics(tabName, data) {
    const analyticsSection = document.getElementById('analyticsSection');
    
    if (!data || data.length === 0) {
        analyticsSection.classList.remove('visible');
        return;
    }
    
    // Get columns
    const columns = Object.keys(data[0] || {});
    
    // Identify week columns and numeric columns
    const weekColumns = columns.filter(col => 
        col.includes('Week') || 
        col.match(/\d+\/\d+/) || 
        col.includes('11/30') || 
        col.includes('12/6') || 
        col.includes('12/13') || 
        col.includes('12/14') || 
        col.includes('12/21') ||
        col.includes('12/28')
    );
    
    let analyticsHTML = '';
    
    // Generate analytics based on tab type
    if (tabName === 'Doxy Visits') {
        analyticsHTML = generateDoxyVisitsAnalytics(data, columns);
    } else if (tabName.includes('Oncehub') || tabName.includes('OnceHub')) {
        analyticsHTML = generateOncehubAnalytics(data, columns, tabName);
    } else if (tabName === 'Gusto Hours ') {
        analyticsHTML = generateGustoHoursAnalytics(data, columns);
    } else if (tabName === 'Doxy - Over 20 minutes') {
        analyticsHTML = generateDoxy20MinAnalytics(data, columns);
    } else if (tabName.includes('Program')) {
        analyticsHTML = generateProgramAnalytics(data, columns, tabName);
    } else {
        analyticsHTML = generateGenericAnalytics(data, columns, weekColumns);
    }
    
    if (analyticsHTML) {
        analyticsSection.innerHTML = analyticsHTML;
        analyticsSection.classList.add('visible');
    } else {
        analyticsSection.classList.remove('visible');
    }
}

// Analytics for Doxy Visits
function generateDoxyVisitsAnalytics(data, columns) {
    const weekCols = columns.filter(col => col.match(/\d+\/\d+/) || col.includes('-'));
    
    if (weekCols.length < 2) return '';
    
    // Calculate totals for each week
    const weekTotals = {};
    weekCols.forEach(col => {
        weekTotals[col] = data.reduce((sum, row) => {
            const val = parseFloat(row[col]);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
    });
    
    // Get latest two weeks for comparison
    const weeks = Object.keys(weekTotals);
    const latestWeek = weeks[weeks.length - 1];
    const previousWeek = weeks[weeks.length - 2];
    
    const latestTotal = weekTotals[latestWeek];
    const previousTotal = weekTotals[previousWeek];
    const change = latestTotal - previousTotal;
    const percentChange = previousTotal !== 0 ? ((change / previousTotal) * 100).toFixed(1) : 0;
    
    // Find top performers
    const providerCol = columns.find(col => col.toLowerCase().includes('provider'));
    const topPerformers = data
        .filter(row => row[providerCol] && row[latestWeek])
        .map(row => ({
            name: row[providerCol],
            value: parseFloat(row[latestWeek]) || 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    
    // Calculate average
    const avgVisits = (latestTotal / data.length).toFixed(1);
    
    return `
        <div class="analytics-summary">
            <h3>📊 Doxy Visits Analysis</h3>
            <p>Week-over-week performance metrics for provider visits</p>
        </div>
        
        <div class="analytics-grid">
            <div class="analytics-card ${change >= 0 ? 'positive' : 'negative'}">
                <h3>Total Visits (Latest Week)</h3>
                <div class="analytics-value">${latestTotal.toLocaleString()}</div>
                <div class="analytics-change ${change >= 0 ? 'positive' : 'negative'}">
                    <span class="arrow">${change >= 0 ? '↑' : '↓'}</span>
                    <span>${Math.abs(change).toLocaleString()} visits (${Math.abs(percentChange)}%)</span>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>Previous Week Total</h3>
                <div class="analytics-value">${previousTotal.toLocaleString()}</div>
                <div class="analytics-change neutral">
                    <span>${cleanColumnName(previousWeek)}</span>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>Average Visits per Provider</h3>
                <div class="analytics-value">${avgVisits}</div>
                <div class="analytics-change neutral">
                    <span>Based on ${data.length} providers</span>
                </div>
            </div>
        </div>
        
        <div class="top-performers">
            <h3>🏆 Top 5 Performers (${cleanColumnName(latestWeek)})</h3>
            ${topPerformers.map((performer, idx) => `
                <div class="performer-item">
                    <span class="performer-rank">#${idx + 1}</span>
                    <span class="performer-name">${performer.name}</span>
                    <span class="performer-value">${performer.value.toLocaleString()}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// Analytics for OnceHub data
function generateOncehubAnalytics(data, columns, tabName) {
    const weekCols = columns.filter(col => 
        col.includes('Week of') || col.match(/\d+\/\d+/)
    );
    
    // Find numeric columns
    const numericCols = columns.filter(col => {
        return data.some(row => {
            const val = row[col];
            return !isNaN(parseFloat(val)) && isFinite(val);
        });
    });
    
    if (numericCols.length === 0) return '';
    
    // Calculate total visits/numbers
    const latestNumericCol = numericCols[numericCols.length - 1];
    const total = data.reduce((sum, row) => {
        const val = parseFloat(row[latestNumericCol]);
        return sum + (isNaN(val) ? 0 : val);
    }, 0);
    
    // Count unique providers
    const providerCol = columns.find(col => 
        col.toLowerCase().includes('provider') || col === 'Unnamed: 0'
    );
    const uniqueProviders = new Set(
        data.filter(row => row[providerCol]).map(row => row[providerCol])
    ).size;
    
    const avgPerProvider = (total / Math.max(uniqueProviders, 1)).toFixed(1);
    
    return `
        <div class="analytics-summary">
            <h3>📊 ${tabName} Analysis</h3>
            <p>Overview of OnceHub scheduling and visit metrics</p>
        </div>
        
        <div class="analytics-grid">
            <div class="analytics-card positive">
                <h3>Total Count</h3>
                <div class="analytics-value">${total.toLocaleString()}</div>
                <div class="analytics-change neutral">
                    <span>Across all records</span>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>Unique Providers</h3>
                <div class="analytics-value">${uniqueProviders}</div>
                <div class="analytics-change neutral">
                    <span>Active providers tracked</span>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>Average per Provider</h3>
                <div class="analytics-value">${avgPerProvider}</div>
                <div class="analytics-change neutral">
                    <span>Mean distribution</span>
                </div>
            </div>
        </div>
    `;
}

// Analytics for Gusto Hours
function generateGustoHoursAnalytics(data, columns) {
    const weekCols = columns.filter(col => col.match(/\d+\/\d+/));
    
    if (weekCols.length === 0) return '';
    
    const latestWeek = weekCols[weekCols.length - 1];
    const totalHours = data.reduce((sum, row) => {
        const val = parseFloat(row[latestWeek]);
        return sum + (isNaN(val) ? 0 : val);
    }, 0);
    
    const avgHours = (totalHours / data.length).toFixed(1);
    
    // Find top by hours
    const providerCol = columns[0];
    const topByHours = data
        .filter(row => row[providerCol] && row[latestWeek])
        .map(row => ({
            name: row[providerCol],
            value: parseFloat(row[latestWeek]) || 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    
    return `
        <div class="analytics-summary">
            <h3>⏰ Gusto Hours Analysis</h3>
            <p>Provider hours tracking and workload distribution</p>
        </div>
        
        <div class="analytics-grid">
            <div class="analytics-card positive">
                <h3>Total Hours (${cleanColumnName(latestWeek)})</h3>
                <div class="analytics-value">${totalHours.toFixed(1)}</div>
                <div class="analytics-change neutral">
                    <span>Combined team hours</span>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>Average Hours per Provider</h3>
                <div class="analytics-value">${avgHours}</div>
                <div class="analytics-change neutral">
                    <span>${data.length} providers tracked</span>
                </div>
            </div>
        </div>
        
        <div class="top-performers">
            <h3>⏰ Hours Worked - Top 5</h3>
            ${topByHours.map((performer, idx) => `
                <div class="performer-item">
                    <span class="performer-rank">#${idx + 1}</span>
                    <span class="performer-name">${performer.name}</span>
                    <span class="performer-value">${performer.value} hrs</span>
                </div>
            `).join('')}
        </div>
    `;
}

// Analytics for Doxy Over 20 Minutes
function generateDoxy20MinAnalytics(data, columns) {
    const percentCol = columns.find(col => 
        col.toLowerCase().includes('percent') || col.toLowerCase().includes('%')
    );
    
    if (!percentCol) return '';
    
    // Calculate average percentage
    const validData = data.filter(row => {
        const val = parseFloat(row[percentCol]);
        return !isNaN(val) && val > 0;
    });
    
    const avgPercent = validData.reduce((sum, row) => {
        return sum + parseFloat(row[percentCol] || 0);
    }, 0) / validData.length;
    
    // Find highest and lowest
    const sorted = [...validData].sort((a, b) => 
        parseFloat(b[percentCol]) - parseFloat(a[percentCol])
    );
    
    const providerCol = columns.find(col => col.toLowerCase().includes('provider') || col === 'Unnamed: 0');
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];
    
    return `
        <div class="analytics-summary">
            <h3>⏱️ Visit Duration Analysis</h3>
            <p>Percentage of visits exceeding 20 minutes - quality time indicator</p>
        </div>
        
        <div class="analytics-grid">
            <div class="analytics-card">
                <h3>Average % Over 20 Min</h3>
                <div class="analytics-value">${avgPercent.toFixed(1)}%</div>
                <div class="analytics-change neutral">
                    <span>Across ${validData.length} providers</span>
                </div>
            </div>
            
            <div class="analytics-card positive">
                <h3>Highest Rate</h3>
                <div class="analytics-value">${parseFloat(highest[percentCol]).toFixed(1)}%</div>
                <div class="analytics-change neutral">
                    <span>${highest[providerCol]}</span>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>Lowest Rate</h3>
                <div class="analytics-value">${parseFloat(lowest[percentCol]).toFixed(1)}%</div>
                <div class="analytics-change neutral">
                    <span>${lowest[providerCol]}</span>
                </div>
            </div>
        </div>
    `;
}

// Analytics for Program data
function generateProgramAnalytics(data, columns, tabName) {
    // Find program and visit type columns
    const programCol = columns.find(col => col.toLowerCase().includes('program'));
    const visitCol = columns.find(col => col.toLowerCase().includes('visit'));
    
    if (!programCol && !visitCol) return '';
    
    // Count by program
    const programCounts = {};
    const visitCounts = {};
    
    data.forEach(row => {
        if (row[programCol]) {
            programCounts[row[programCol]] = (programCounts[row[programCol]] || 0) + 1;
        }
        if (row[visitCol]) {
            visitCounts[row[visitCol]] = (visitCounts[row[visitCol]] || 0) + 1;
        }
    });
    
    const totalRecords = data.length;
    const uniquePrograms = Object.keys(programCounts).length;
    
    return `
        <div class="analytics-summary">
            <h3>📋 ${tabName} Analysis</h3>
            <p>Program distribution and visit type breakdown</p>
        </div>
        
        <div class="analytics-grid">
            <div class="analytics-card positive">
                <h3>Total Records</h3>
                <div class="analytics-value">${totalRecords}</div>
                <div class="analytics-change neutral">
                    <span>All entries tracked</span>
                </div>
            </div>
            
            ${uniquePrograms > 0 ? `
            <div class="analytics-card">
                <h3>Programs Tracked</h3>
                <div class="analytics-value">${uniquePrograms}</div>
                <div class="analytics-change neutral">
                    <span>${Object.keys(programCounts).join(', ')}</span>
                </div>
            </div>
            ` : ''}
            
            ${Object.keys(visitCounts).length > 0 ? `
            <div class="analytics-card">
                <h3>Visit Types</h3>
                <div class="analytics-value">${Object.keys(visitCounts).length}</div>
                <div class="analytics-change neutral">
                    <span>${Object.keys(visitCounts).join(', ')}</span>
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

// Generic analytics fallback
function generateGenericAnalytics(data, columns, weekColumns) {
    if (weekColumns.length === 0) return '';
    
    return `
        <div class="analytics-summary">
            <h3>📊 Data Overview</h3>
            <p>Summary statistics for current view</p>
        </div>
        
        <div class="analytics-grid">
            <div class="analytics-card">
                <h3>Total Records</h3>
                <div class="analytics-value">${data.length}</div>
                <div class="analytics-change neutral">
                    <span>${columns.length} columns tracked</span>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>Time Periods</h3>
                <div class="analytics-value">${weekColumns.length}</div>
                <div class="analytics-change neutral">
                    <span>Weeks of data available</span>
                </div>
            </div>
        </div>
    `;
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

// Render charts
let currentCharts = [];

function renderCharts(tabName, data) {
    const chartsSection = document.getElementById('chartsSection');
    
    // Clear existing charts
    currentCharts.forEach(chart => chart.destroy());
    currentCharts = [];
    
    if (!data || data.length === 0) {
        chartsSection.classList.remove('visible');
        return;
    }
    
    const columns = Object.keys(data[0] || {});
    
    // Generate charts based on tab type
    let chartsHTML = '';
    
    if (tabName === 'Doxy Visits') {
        chartsHTML = generateDoxyVisitsCharts(data, columns);
    } else if (tabName === 'Gusto Hours ') {
        chartsHTML = generateGustoHoursCharts(data, columns);
    } else if (tabName === 'Doxy - Over 20 minutes') {
        chartsHTML = generateDoxy20MinCharts(data, columns);
    } else if (tabName.includes('Program')) {
        chartsHTML = generateProgramCharts(data, columns);
    }
    
    if (chartsHTML) {
        chartsSection.innerHTML = `<div class="charts-grid">${chartsHTML}</div>`;
        chartsSection.classList.add('visible');
        
        // Initialize charts after DOM update
        setTimeout(() => initializeCharts(tabName, data, columns), 100);
    } else {
        chartsSection.classList.remove('visible');
    }
}

function generateDoxyVisitsCharts(data, columns) {
    return `
        <div class="chart-card">
            <h3>📈 Visits Trend</h3>
            <canvas id="visitsTrendChart"></canvas>
        </div>
        <div class="chart-card">
            <h3>👥 Top 10 Providers</h3>
            <canvas id="topProvidersChart"></canvas>
        </div>
    `;
}

function generateGustoHoursCharts(data, columns) {
    return `
        <div class="chart-card">
            <h3>⏰ Hours Distribution</h3>
            <canvas id="hoursDistChart"></canvas>
        </div>
    `;
}

function generateDoxy20MinCharts(data, columns) {
    return `
        <div class="chart-card">
            <h3>⏱️ Visit Duration Distribution</h3>
            <canvas id="durationChart"></canvas>
        </div>
    `;
}

function generateProgramCharts(data, columns) {
    return `
        <div class="chart-card">
            <h3>📊 Program Distribution</h3>
            <canvas id="programDistChart"></canvas>
        </div>
    `;
}

function initializeCharts(tabName, data, columns) {
    if (tabName === 'Doxy Visits') {
        initDoxyVisitsCharts(data, columns);
    } else if (tabName === 'Gusto Hours ') {
        initGustoHoursCharts(data, columns);
    } else if (tabName === 'Doxy - Over 20 minutes') {
        initDoxy20MinCharts(data, columns);
    } else if (tabName.includes('Program')) {
        initProgramCharts(data, columns);
    }
}

function initDoxyVisitsCharts(data, columns) {
    // Visits Trend Chart
    const weekCols = columns.filter(col => col.match(/\d+\/\d+/) || col.includes('-'));
    if (weekCols.length > 0 && document.getElementById('visitsTrendChart')) {
        const weekTotals = weekCols.map(col => {
            return data.reduce((sum, row) => {
                const val = parseFloat(row[col]);
                return sum + (isNaN(val) ? 0 : val);
            }, 0);
        });
        
        const ctx = document.getElementById('visitsTrendChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weekCols.map(col => cleanColumnName(col)),
                datasets: [{
                    label: 'Total Visits',
                    data: weekTotals,
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: 'rgb(99, 102, 241)',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
        currentCharts.push(chart);
    }
    
    // Top Providers Chart
    const providerCol = columns.find(col => col.toLowerCase().includes('provider'));
    const latestWeek = weekCols[weekCols.length - 1];
    
    if (providerCol && latestWeek && document.getElementById('topProvidersChart')) {
        const topProviders = data
            .filter(row => row[providerCol] && row[latestWeek])
            .map(row => ({
                name: row[providerCol],
                value: parseFloat(row[latestWeek]) || 0
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        
        const ctx = document.getElementById('topProvidersChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topProviders.map(p => p.name),
                datasets: [{
                    label: 'Visits',
                    data: topProviders.map(p => p.value),
                    backgroundColor: topProviders.map((_, i) => 
                        `rgba(${99 + i * 15}, ${102 - i * 5}, 241, ${0.8 - i * 0.05})`
                    ),
                    borderRadius: 8,
                    borderWidth: 0
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    y: {
                        grid: { display: false }
                    }
                }
            }
        });
        currentCharts.push(chart);
    }
}

function initGustoHoursCharts(data, columns) {
    const weekCols = columns.filter(col => col.match(/\d+\/\d+/));
    const latestWeek = weekCols[weekCols.length - 1];
    
    if (latestWeek && document.getElementById('hoursDistChart')) {
        const providerCol = columns[0];
        const hoursData = data
            .filter(row => row[providerCol] && row[latestWeek])
            .map(row => ({
                name: row[providerCol],
                value: parseFloat(row[latestWeek]) || 0
            }))
            .sort((a, b) => b.value - a.value);
        
        const ctx = document.getElementById('hoursDistChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: hoursData.map(p => p.name),
                datasets: [{
                    data: hoursData.map(p => p.value),
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(34, 197, 94, 0.8)'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { padding: 15, font: { size: 11 } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                return ` ${context.label}: ${context.parsed} hrs`;
                            }
                        }
                    }
                }
            }
        });
        currentCharts.push(chart);
    }
}

function initDoxy20MinCharts(data, columns) {
    const percentCol = columns.find(col => 
        col.toLowerCase().includes('percent') || col.toLowerCase().includes('%')
    );
    
    if (percentCol && document.getElementById('durationChart')) {
        const providerCol = columns.find(col => col.toLowerCase().includes('provider') || col === 'Unnamed: 0');
        const validData = data
            .filter(row => {
                const val = parseFloat(row[percentCol]);
                return !isNaN(val) && val > 0 && row[providerCol];
            })
            .map(row => ({
                name: row[providerCol],
                value: parseFloat(row[percentCol])
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        
        const ctx = document.getElementById('durationChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: validData.map(p => p.name),
                datasets: [{
                    label: '% Over 20 Minutes',
                    data: validData.map(p => p.value),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderRadius: 8,
                    borderWidth: 0
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: (context) => ` ${context.parsed.x.toFixed(1)}%`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    y: {
                        grid: { display: false }
                    }
                }
            }
        });
        currentCharts.push(chart);
    }
}

function initProgramCharts(data, columns) {
    const programCol = columns.find(col => col.toLowerCase().includes('program'));
    
    if (programCol && document.getElementById('programDistChart')) {
        const programCounts = {};
        data.forEach(row => {
            if (row[programCol]) {
                programCounts[row[programCol]] = (programCounts[row[programCol]] || 0) + 1;
            }
        });
        
        const ctx = document.getElementById('programDistChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(programCounts),
                datasets: [{
                    data: Object.values(programCounts),
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)'
                    ],
                    borderWidth: 3,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20, font: { size: 13, weight: 'bold' } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12
                    }
                }
            }
        });
        currentCharts.push(chart);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

