// Global state
let allData = {};
let currentTab = 'Doxy Visits';
let currentData = [];
let filteredData = [];
let sortColumn = null;
let sortDirection = 'asc';
let activeFilters = {};

// Goal Configuration
const goals = {
    weeklyVisitsPerProvider: 50,  // Target visits per provider per week
    programMinimum: 3,             // Minimum number of programs
    providerUtilization: 0.8       // 80% utilization target
};

// Anomaly thresholds
const anomalyThresholds = {
    zeroVisitsWarning: true,       // Flag providers with zero visits
    largeDropPercent: 50,          // Flag drops > 50%
    largeIncreasePercent: 100      // Flag increases > 100%
};

// Initialize the app
async function init() {
    console.log('Initializing dashboard...');
    
    // Show loading message
    const tableWrapper = document.getElementById('tableWrapper');
    if (tableWrapper) {
        tableWrapper.innerHTML = '<p class="loading">Loading data...</p>';
    }
    
    try {
        // Load data from JSON file (simpler and more reliable)
        console.log('Fetching data.json...');
        
        // Add timeout to fetch
        const fetchWithTimeout = (url, timeout = 10000) => {
            return Promise.race([
                fetch(url),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Fetch timeout')), timeout)
                )
            ]);
        };
        
        const response = await fetchWithTimeout('data.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('Response received, parsing JSON...');
        allData = await response.json();
        console.log('Data loaded successfully!');
        console.log('Tabs available:', Object.keys(allData));
        console.log('First tab data rows:', allData[Object.keys(allData)[0]]?.length);
        
        if (!allData || Object.keys(allData).length === 0) {
            throw new Error('No data found in data.json');
        }
        
        // Set last update time
        const lastUpdateEl = document.getElementById('lastUpdate');
        if (lastUpdateEl) {
            const now = new Date();
            const dateOptions = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
            };
            const timeOptions = { 
                hour: '2-digit', 
                minute: '2-digit' 
            };
            lastUpdateEl.textContent = now.toLocaleDateString('en-US', dateOptions) + ' at ' + now.toLocaleTimeString('en-US', timeOptions);
        }
        
        // Setup event listeners
        setupTabListeners();
        setupSearchListener();
        
        // Load first tab
        console.log('Loading first tab:', currentTab);
        loadTab(currentTab);
        
        console.log('Dashboard initialized successfully');
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        const tableWrapper = document.getElementById('tableWrapper');
        if (tableWrapper) {
            tableWrapper.innerHTML = `
                <div class="no-results">
                    <h3>⚠️ Error Loading Data</h3>
                    <p>${error.message}</p>
                    <p>Please check the browser console for details.</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">
                        🔄 Reload Page
                    </button>
                </div>
            `;
        }
    }
}

// Wait for XLSX library to load
function waitForXLSX() {
    return new Promise((resolve) => {
        if (window.XLSX) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.XLSX) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 5000);
        }
    });
}

// Load data directly from Excel file
async function loadExcelFile() {
    try {
        // Wait for XLSX library to be available
        await waitForXLSX();
        
        // Check if XLSX library is loaded
        if (!window.XLSX) {
            console.warn('XLSX library not available, falling back to JSON');
            throw new Error('Excel library not loaded');
        }
        
        console.log('Fetching Excel file...');
        
        // Fetch the Excel file
        const response = await fetch('Oncehub_Doxy Report (in use) (3).xlsx');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        console.log('Excel file loaded, size:', arrayBuffer.byteLength);
        
        // Parse Excel file
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        console.log('Workbook parsed, sheets:', workbook.SheetNames);
        
        // Convert each sheet to JSON
        allData = {};
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                raw: false,
                defval: null,
                header: 1 // Get as array first
            });
            
            // Convert array format to object format with headers
            if (jsonData.length > 0) {
                const headers = jsonData[0];
                const data = jsonData.slice(1).map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header || `Unnamed: ${index}`] = row[index] !== undefined ? row[index] : null;
                    });
                    return obj;
                });
                allData[sheetName] = data;
                console.log(`Sheet "${sheetName}": ${data.length} rows`);
            }
        });
        
        console.log('Excel data loaded successfully:', Object.keys(allData));
        
        if (Object.keys(allData).length === 0) {
            throw new Error('No data found in Excel file');
        }
        
    } catch (error) {
        console.error('Error loading Excel file:', error);
        // Fallback to data.json
        console.log('Attempting to load from data.json as fallback...');
        try {
            const response = await fetch('data.json');
            allData = await response.json();
            console.log('Fallback data.json loaded successfully');
        } catch (jsonError) {
            console.error('Failed to load fallback data.json:', jsonError);
            throw jsonError;
        }
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
    console.log(`loadTab called for: "${tabName}"`);
    console.log('allData keys:', Object.keys(allData));
    console.log('Tab exists in allData:', tabName in allData);
    
    currentData = allData[tabName] || [];
    
    // Filter out "Total" rows and header rows
    currentData = currentData.filter(row => {
        const firstValue = Object.values(row)[0];
        return firstValue !== 'Total' && 
               firstValue !== 'TOTAL' && 
               firstValue !== 'Provider' &&
               firstValue !== 'Provider Name' &&
               !String(firstValue).toLowerCase().includes('grand total');
    });
    
    console.log(`currentData length: ${currentData.length}`);
    
    if (currentData.length > 0) {
        console.log('First row sample:', currentData[0]);
    } else {
        console.warn(`No data found for tab: ${tabName}`);
    }
    
    filteredData = [...currentData];
    sortColumn = null;
    sortDirection = 'asc';
    
    console.log('Rendering analytics...');
    // Generate and render analytics
    renderAnalytics(tabName, currentData);
    
    console.log('Rendering charts...');
    // Generate and render charts
    renderCharts(tabName, currentData);
    
    console.log('Updating summary cards...');
    // Update summary cards
    const columns = currentData.length > 0 ? Object.keys(currentData[0]) : [];
    updateSummaryCards(currentData, columns, tabName);
    
    // Reset quick filter to 'all'
    currentQuickFilter = 'all';
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter') === 'all') {
            btn.classList.add('active');
        }
    });
    
    console.log('Rendering table...');
    // Render table
    renderTable(filteredData);
    console.log('loadTab completed');
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
    
    // Find providers with trend data (current week vs previous week)
    const providerCol = columns.find(col => col.toLowerCase().includes('provider'));
    const providersWithTrends = data
        .filter(row => row[providerCol] && row[latestWeek] && row[previousWeek])
        .map(row => {
            const current = parseFloat(row[latestWeek]) || 0;
            const previous = parseFloat(row[previousWeek]) || 0;
            const trend = current - previous;
            const trendPercent = previous !== 0 ? ((trend / previous) * 100).toFixed(1) : 0;
            return {
                name: row[providerCol],
                current: current,
                previous: previous,
                trend: trend,
                trendPercent: trendPercent
            };
        });
    
    // Top performers by current week
    const topPerformers = [...providersWithTrends]
        .sort((a, b) => b.current - a.current)
        .slice(0, 5);
    
    // Biggest improvements
    const biggestGains = [...providersWithTrends]
        .filter(p => p.trend > 0)
        .sort((a, b) => b.trend - a.trend)
        .slice(0, 5);
    
    // Biggest declines
    const biggestDeclines = [...providersWithTrends]
        .filter(p => p.trend < 0)
        .sort((a, b) => a.trend - b.trend)
        .slice(0, 5);
    
    // Calculate average
    const avgVisits = (latestTotal / data.length).toFixed(1);
    
    // Count providers trending up vs down
    const trendingUp = providersWithTrends.filter(p => p.trend > 0).length;
    const trendingDown = providersWithTrends.filter(p => p.trend < 0).length;
    const unchanged = providersWithTrends.filter(p => p.trend === 0).length;
    
    return `
        <div class="analytics-summary">
            <h3>📊 Doxy Visits Analysis - Week over Week Trends</h3>
            <p><strong>${trendingUp}</strong> providers trending ↑ up | <strong>${trendingDown}</strong> trending ↓ down | <strong>${unchanged}</strong> unchanged</p>
        </div>
        
        <div class="analytics-grid">
            <div class="analytics-card ${change >= 0 ? 'positive' : 'negative'}">
                <h3>Total Visits (Latest Week)</h3>
                <div class="analytics-value">${latestTotal.toLocaleString()}</div>
                <div class="analytics-change ${change >= 0 ? 'positive' : 'negative'}">
                    <span class="arrow">${change >= 0 ? '↑' : '↓'}</span>
                    <span>${Math.abs(change).toLocaleString()} visits (${Math.abs(percentChange)}%) vs last week</span>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>Previous Week</h3>
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
            <h3>🏆 Top 5 Performers (Current Week)</h3>
            ${topPerformers.map((performer, idx) => `
                <div class="performer-item">
                    <span class="performer-rank">#${idx + 1}</span>
                    <span class="performer-name">${performer.name}</span>
                    <span class="performer-value">${performer.current.toLocaleString()}</span>
                    <span class="performer-trend ${performer.trend >= 0 ? 'up' : 'down'}">
                        ${performer.trend >= 0 ? '↑' : '↓'} ${Math.abs(performer.trend)} (${Math.abs(performer.trendPercent)}%)
                    </span>
                </div>
            `).join('')}
        </div>
        
        ${biggestGains.length > 0 ? `
        <div class="top-performers">
            <h3>📈 Biggest Increases Week-over-Week</h3>
            ${biggestGains.map((performer, idx) => `
                <div class="performer-item">
                    <span class="performer-rank">#${idx + 1}</span>
                    <span class="performer-name">${performer.name}</span>
                    <span class="performer-value">${performer.current.toLocaleString()}</span>
                    <span class="performer-trend up">
                        ↑ ${performer.trend} (+${performer.trendPercent}%)
                    </span>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${biggestDeclines.length > 0 ? `
        <div class="top-performers">
            <h3>📉 Biggest Decreases Week-over-Week</h3>
            ${biggestDeclines.map((performer, idx) => `
                <div class="performer-item">
                    <span class="performer-rank">#${idx + 1}</span>
                    <span class="performer-name">${performer.name}</span>
                    <span class="performer-value">${performer.current.toLocaleString()}</span>
                    <span class="performer-trend down">
                        ↓ ${Math.abs(performer.trend)} (${performer.trendPercent}%)
                    </span>
                </div>
            `).join('')}
        </div>
        ` : ''}
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
    console.log('renderTable called with data length:', data ? data.length : 'null');
    
    const tableWrapper = document.getElementById('tableWrapper');
    console.log('tableWrapper element found:', !!tableWrapper);
    
    if (!tableWrapper) {
        console.error('tableWrapper element not found!');
        return;
    }
    
    // Update row count
    const rowCountEl = document.getElementById('rowCount');
    if (rowCountEl) {
        rowCountEl.textContent = `Showing ${data ? data.length : 0} of ${currentData.length} rows`;
    }
    
    if (!data || data.length === 0) {
        console.warn('No data to render');
        tableWrapper.innerHTML = '<p class="no-results">No data available for this tab.</p>';
        return;
    }
    
    console.log('Data has rows, proceeding to render table...');
    
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
    
    // Detect week columns for trend analysis
    const weekCols = meaningfulColumns.filter(col => {
        const colStr = String(col);
        return colStr.match(/week of \d+\/\d+/i) || (colStr.match(/\d+\/\d+/) && !colStr.toLowerCase().includes('unnamed'));
    });
    
    const currentWeekCol = weekCols.length > 0 ? weekCols[weekCols.length - 1] : null;
    const prevWeekCol = weekCols.length > 1 ? weekCols[weekCols.length - 2] : null;
    
    // Add data rows with enhanced visual indicators
    data.forEach(row => {
        const currentWeekValue = currentWeekCol ? parseFloat(row[currentWeekCol]) : null;
        const prevWeekValue = prevWeekCol ? parseFloat(row[prevWeekCol]) : null;
        
        // Detect anomalies
        let rowClass = '';
        let anomalyFlag = '';
        
        if (!isNaN(currentWeekValue) && !isNaN(prevWeekValue) && prevWeekValue > 0) {
            const changePercent = ((currentWeekValue - prevWeekValue) / prevWeekValue) * 100;
            
            if (changePercent < -anomalyThresholds.largeDropPercent) {
                rowClass = 'anomaly-warning';
                anomalyFlag = `<span class="anomaly-badge warning" title="Large drop: ${changePercent.toFixed(0)}%">⚠️</span>`;
            } else if (changePercent > anomalyThresholds.largeIncreasePercent) {
                rowClass = 'anomaly-success';
                anomalyFlag = `<span class="anomaly-badge success" title="Large increase: ${changePercent.toFixed(0)}%">🚀</span>`;
            }
        }
        
        if (anomalyThresholds.zeroVisitsWarning && currentWeekValue === 0 && prevWeekValue > 0) {
            rowClass = 'anomaly-alert';
            anomalyFlag = `<span class="anomaly-badge alert" title="Zero visits this week">🔴</span>`;
        }
        
        html += `<tr class="${rowClass}">`;
        meaningfulColumns.forEach((col, index) => {
            let value = row[col];
            
            // Handle null/undefined
            if (value === null || value === undefined || value === '') {
                value = '';
            } else {
                value = String(value);
            }
            
            // Check if it's a number
            const isNumber = !isNaN(parseFloat(value)) && isFinite(value) && value !== '';
            let cellClass = isNumber ? 'number' : '';
            let cellContent = escapeHtml(value);
            
            // Add trend indicators to week columns
            if (col === currentWeekCol && !isNaN(currentWeekValue) && !isNaN(prevWeekValue)) {
                const change = currentWeekValue - prevWeekValue;
                let trendArrow = '';
                
                if (change > 0) {
                    trendArrow = `<span class="trend-arrow up" title="+${change}">↑</span>`;
                    cellClass += ' trend-up';
                } else if (change < 0) {
                    trendArrow = `<span class="trend-arrow down" title="${change}">↓</span>`;
                    cellClass += ' trend-down';
                } else {
                    trendArrow = `<span class="trend-arrow neutral" title="No change">→</span>`;
                }
                
                cellContent = `${cellContent} ${trendArrow}`;
            }
            
            // Add progress bar for current week visits
            if (col === currentWeekCol && !isNaN(currentWeekValue) && currentWeekValue > 0) {
                const goalPercent = Math.min((currentWeekValue / goals.weeklyVisitsPerProvider) * 100, 100);
                const barColor = goalPercent >= 100 ? '#10b981' : goalPercent >= 80 ? '#f59e0b' : '#ef4444';
                cellContent += `<div class="progress-bar"><div class="progress-fill" style="width: ${goalPercent}%; background: ${barColor}"></div></div>`;
            }
            
            // Add anomaly flag to first column
            if (index === 0 && anomalyFlag) {
                cellContent = `${anomalyFlag} ${cellContent}`;
            }
            
            // Make first column (provider name) clickable
            if (index === 0 && value && value !== '') {
                cellContent = `<a href="#" class="provider-link" onclick="openProviderModal('${value.replace(/'/g, "\\'")}'); return false;">${cellContent}</a>`;
            }
            
            html += `<td class="${cellClass}">${cellContent}</td>`;
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
    // Find percentage column - check multiple possible names
    const percentCol = columns.find(col => {
        const colLower = String(col).toLowerCase();
        return colLower.includes('percent') || 
               colLower.includes('%') ||
               colLower.includes('over 20');
    });
    
    console.log('Doxy 20min chart - percentCol:', percentCol);
    console.log('Doxy 20min chart - data rows:', data.length);
    
    if (percentCol && document.getElementById('durationChart')) {
        const providerCol = columns.find(col => {
            const colLower = String(col).toLowerCase();
            return colLower.includes('provider') || col === 'Unnamed: 0';
        });
        
        console.log('Doxy 20min chart - providerCol:', providerCol);
        
        const validData = data
            .filter(row => {
                const val = parseFloat(row[percentCol]);
                const provider = row[providerCol];
                const isValid = !isNaN(val) && val > 0 && provider && provider !== 'Provider';
                return isValid;
            })
            .map(row => ({
                name: row[providerCol],
                value: parseFloat(row[percentCol])
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        
        console.log('Doxy 20min chart - validData length:', validData.length);
        
        if (validData.length === 0) {
            console.warn('No valid data for Doxy 20min chart');
            return;
        }
        
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
    // Find all program columns (there might be multiple in pivot tables)
    let programCols = columns.filter(col => {
        const colLower = String(col).toLowerCase();
        return colLower.includes('program');
    });
    
    // If no explicit "program" columns, check if first row has "Program" values
    // This handles cases like "Unnamed: 1" where the header value is "Program"
    if (programCols.length === 0 && data.length > 0) {
        const firstRow = data[0];
        programCols = columns.filter(col => {
            const value = firstRow[col];
            return value && String(value).toLowerCase() === 'program';
        });
        console.log('Found program columns by header value:', programCols);
    }
    
    // If still no columns, check week columns (for Program Grouped tab)
    if (programCols.length === 0) {
        programCols = columns.filter(col => {
            return /week of \d+\/\d+/i.test(String(col)) || col.match(/\d+\/\d+/);
        });
        console.log('Using week columns as program columns:', programCols);
    }
    
    console.log('Program chart - programCols:', programCols);
    console.log('Program chart - all columns:', columns);
    console.log('Program chart - data rows:', data.length);
    
    if (programCols.length > 0 && document.getElementById('programDistChart')) {
        const programCounts = {};
        
        // Filter out header rows first
        const validData = data.filter(row => {
            const firstCol = row[columns[0]];
            return firstCol && 
                   firstCol !== 'Provider' && 
                   firstCol !== 'provider' &&
                   !String(firstCol).toLowerCase().includes('total');
        });
        
        console.log('Valid data rows:', validData.length);
        
        // Check if the data contains program names (text values like HRT, TRT, GLP)
        // or numeric values (in which case this might not be the right column)
        const sampleValues = validData.slice(0, 10).map(row => row[programCols[0]]);
        console.log('Sample values from first program column:', sampleValues);
        
        // Count programs from all program columns
        validData.forEach(row => {
            programCols.forEach(programCol => {
                const program = row[programCol];
                // Skip header values, null/undefined, and numeric values
                if (program && 
                    program !== 'Program' && 
                    program !== 'program' &&
                    typeof program === 'string' &&
                    String(program).trim() !== '' &&
                    isNaN(program)) {  // Skip numeric values
                    programCounts[program] = (programCounts[program] || 0) + 1;
                }
            });
        });
        
        console.log('Program counts:', programCounts);
        
        if (Object.keys(programCounts).length === 0) {
            console.warn('No valid program data found');
            return;
        }
        
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

// Summary Cards Update
function updateSummaryCards(data, columns, tabName) {
    console.log('Updating summary cards for:', tabName);
    
    // Filter out header and total rows
    const validData = data.filter(row => {
        const firstCol = row[columns[0]];
        return firstCol && 
               firstCol !== 'Provider' && 
               firstCol !== 'provider' &&
               !String(firstCol).toLowerCase().includes('total') &&
               !String(firstCol).toLowerCase().includes('grand total');
    });
    
    // Get week columns
    const weekCols = columns.filter(col => {
        const colStr = String(col);
        return colStr.match(/week of \d+\/\d+/i) || colStr.match(/\d+\/\d+/) && !colStr.toLowerCase().includes('unnamed');
    });
    
    console.log('Week columns found:', weekCols);
    
    // Calculate total visits (for current week)
    let totalVisits = 0;
    let previousVisits = 0;
    
    if (weekCols.length > 0) {
        const currentWeekCol = weekCols[weekCols.length - 1];
        const prevWeekCol = weekCols.length > 1 ? weekCols[weekCols.length - 2] : null;
        
        validData.forEach(row => {
            const val = parseFloat(row[currentWeekCol]);
            if (!isNaN(val)) totalVisits += val;
            
            if (prevWeekCol) {
                const prevVal = parseFloat(row[prevWeekCol]);
                if (!isNaN(prevVal)) previousVisits += prevVal;
            }
        });
    }
    
    // Update Total Visits card
    document.getElementById('totalVisitsValue').textContent = totalVisits.toLocaleString();
    const totalChangeEl = document.getElementById('totalVisitsChange');
    if (previousVisits > 0) {
        const changePercent = ((totalVisits - previousVisits) / previousVisits * 100).toFixed(1);
        const changeValue = totalVisits - previousVisits;
        if (changeValue > 0) {
            totalChangeEl.innerHTML = `<span class="positive">↑ ${changePercent}% (+${changeValue})</span>`;
            totalChangeEl.className = 'card-change positive';
        } else if (changeValue < 0) {
            totalChangeEl.innerHTML = `<span class="negative">↓ ${changePercent}% (${changeValue})</span>`;
            totalChangeEl.className = 'card-change negative';
        } else {
            totalChangeEl.innerHTML = `<span class="neutral">→ No change</span>`;
            totalChangeEl.className = 'card-change neutral';
        }
    } else {
        totalChangeEl.innerHTML = '';
    }
    
    // Find top performer
    const providerCol = columns[0];
    let topProvider = null;
    let topVisits = 0;
    
    if (weekCols.length > 0) {
        const currentWeekCol = weekCols[weekCols.length - 1];
        
        validData.forEach(row => {
            const provider = row[providerCol];
            const visits = parseFloat(row[currentWeekCol]);
            if (provider && !isNaN(visits) && visits > topVisits) {
                topVisits = visits;
                topProvider = provider;
            }
        });
    }
    
    document.getElementById('topPerformerValue').textContent = topProvider || 'N/A';
    document.getElementById('topPerformerVisits').textContent = topVisits > 0 ? `${topVisits} visits` : '';
    
    // Count active programs
    const programCols = columns.filter(col => {
        const colLower = String(col).toLowerCase();
        return colLower.includes('program');
    });
    
    let programs = new Set();
    if (programCols.length > 0) {
        validData.forEach(row => {
            programCols.forEach(col => {
                const program = row[col];
                if (program && typeof program === 'string' && program !== 'Program' && program !== 'program') {
                    programs.add(program);
                }
            });
        });
    } else if (weekCols.length > 0) {
        // Check if week columns contain program names
        weekCols.forEach(col => {
            validData.slice(0, 5).forEach(row => {
                const val = row[col];
                if (val && typeof val === 'string' && isNaN(val)) {
                    programs.add(val);
                }
            });
        });
    }
    
    document.getElementById('activeProgramsValue').textContent = programs.size || 'N/A';
    document.getElementById('programsList').textContent = programs.size > 0 ? Array.from(programs).join(', ') : '';
    
    // Count active providers
    const activeProviders = validData.length;
    document.getElementById('activeProvidersValue').textContent = activeProviders;
}

// Quick Filters
let currentQuickFilter = 'all';

function applyQuickFilter(filterType) {
    console.log('Applying quick filter:', filterType);
    currentQuickFilter = filterType;
    
    // Update button states
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter') === filterType) {
            btn.classList.add('active');
        }
    });
    
    // Apply filter to current data
    const currentTab = document.querySelector('.tab.active');
    if (!currentTab || !currentData) return;
    
    const tabName = currentTab.textContent.trim();
    const columns = currentData.length > 0 ? Object.keys(currentData[0]) : [];
    
    let filteredData = [...currentData];
    
    // Filter out header rows
    filteredData = filteredData.filter(row => {
        const firstCol = row[columns[0]];
        return firstCol && 
               firstCol !== 'Provider' && 
               firstCol !== 'provider' &&
               !String(firstCol).toLowerCase().includes('total');
    });
    
    // Get week columns for analysis
    const weekCols = columns.filter(col => {
        const colStr = String(col);
        return colStr.match(/week of \d+\/\d+/i) || (colStr.match(/\d+\/\d+/) && !colStr.toLowerCase().includes('unnamed'));
    });
    
    if (weekCols.length === 0) {
        renderTable(filteredData);
        return;
    }
    
    const currentWeekCol = weekCols[weekCols.length - 1];
    const prevWeekCol = weekCols.length > 1 ? weekCols[weekCols.length - 2] : null;
    
    switch (filterType) {
        case 'active':
            // Show only providers with visits this week
            filteredData = filteredData.filter(row => {
                const visits = parseFloat(row[currentWeekCol]);
                return !isNaN(visits) && visits > 0;
            });
            break;
            
        case 'top10':
            // Show top 10 performers
            filteredData.sort((a, b) => {
                const aVal = parseFloat(a[currentWeekCol]) || 0;
                const bVal = parseFloat(b[currentWeekCol]) || 0;
                return bVal - aVal;
            });
            filteredData = filteredData.slice(0, 10);
            break;
            
        case 'growth':
            // Show only providers with positive growth
            if (prevWeekCol) {
                filteredData = filteredData.filter(row => {
                    const current = parseFloat(row[currentWeekCol]) || 0;
                    const previous = parseFloat(row[prevWeekCol]) || 0;
                    return current > previous;
                });
            }
            break;
            
        case 'declining':
            // Show only providers with declining visits
            if (prevWeekCol) {
                filteredData = filteredData.filter(row => {
                    const current = parseFloat(row[currentWeekCol]) || 0;
                    const previous = parseFloat(row[prevWeekCol]) || 0;
                    return current < previous && previous > 0;
                });
            }
            break;
            
        case 'all':
        default:
            // Show all data (already filtered)
            break;
    }
    
    renderTable(filteredData);
}

// Comparison Modal Functions
function openComparisonModal() {
    if (!currentData || currentData.length === 0) {
        alert('No data available for comparison');
        return;
    }
    
    const columns = Object.keys(currentData[0] || {});
    const weekCols = columns.filter(col => {
        const colStr = String(col);
        return colStr.match(/week of \d+\/\d+/i) || (colStr.match(/\d+\/\d+/) && !colStr.toLowerCase().includes('unnamed'));
    });
    
    if (weekCols.length < 2) {
        alert('Need at least 2 weeks of data for comparison');
        return;
    }
    
    // Populate week selects
    const week1Select = document.getElementById('week1Select');
    const week2Select = document.getElementById('week2Select');
    
    week1Select.innerHTML = weekCols.map((week, index) => 
        `<option value="${week}" ${index === weekCols.length - 2 ? 'selected' : ''}>${cleanColumnName(week)}</option>`
    ).join('');
    
    week2Select.innerHTML = weekCols.map((week, index) => 
        `<option value="${week}" ${index === weekCols.length - 1 ? 'selected' : ''}>${cleanColumnName(week)}</option>`
    ).join('');
    
    openModal('comparisonModal');
    loadComparison();
}

function loadComparison() {
    const week1 = document.getElementById('week1Select').value;
    const week2 = document.getElementById('week2Select').value;
    
    if (!week1 || !week2 || week1 === week2) {
        alert('Please select two different weeks');
        return;
    }
    
    const providerCol = Object.keys(currentData[0])[0];
    const validData = currentData.filter(row => {
        const provider = row[providerCol];
        return provider && 
               provider !== 'Provider' && 
               !String(provider).toLowerCase().includes('total');
    });
    
    // Build comparison table
    let html = '<h3>Week-over-Week Comparison</h3>';
    html += '<table class="comparison-table"><thead><tr>';
    html += '<th>Provider</th>';
    html += `<th>${cleanColumnName(week1)}</th>`;
    html += `<th>${cleanColumnName(week2)}</th>`;
    html += '<th>Change</th>';
    html += '<th>% Change</th>';
    html += '</tr></thead><tbody>';
    
    validData.forEach(row => {
        const provider = row[providerCol];
        const val1 = parseFloat(row[week1]) || 0;
        const val2 = parseFloat(row[week2]) || 0;
        const change = val2 - val1;
        const percentChange = val1 > 0 ? ((change / val1) * 100).toFixed(1) : '-';
        
        let changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
        let arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
        
        html += `<tr>`;
        html += `<td><a href="#" onclick="openProviderModal('${provider.replace(/'/g, "\\'")}'); return false;">${escapeHtml(provider)}</a></td>`;
        html += `<td class="number">${val1}</td>`;
        html += `<td class="number">${val2}</td>`;
        html += `<td class="number ${changeClass}">${arrow} ${change >= 0 ? '+' : ''}${change}</td>`;
        html += `<td class="number ${changeClass}">${percentChange !== '-' ? `${percentChange}%` : '-'}</td>`;
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    
    document.getElementById('comparisonContent').innerHTML = html;
}

// Provider Detail Modal Functions
function openProviderModal(providerName) {
    if (!currentData || currentData.length === 0) return;
    
    const providerCol = Object.keys(currentData[0])[0];
    const providerData = currentData.find(row => row[providerCol] === providerName);
    
    if (!providerData) {
        alert('Provider not found');
        return;
    }
    
    document.getElementById('providerModalTitle').textContent = `👤 ${providerName}`;
    
    const columns = Object.keys(providerData);
    const weekCols = columns.filter(col => {
        const colStr = String(col);
        return colStr.match(/week of \d+\/\d+/i) || (colStr.match(/\d+\/\d+/) && !colStr.toLowerCase().includes('unnamed'));
    });
    
    let html = '<div class="provider-stats">';
    
    // Summary stats
    if (weekCols.length > 0) {
        const totalVisits = weekCols.reduce((sum, col) => {
            const val = parseFloat(providerData[col]);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
        
        const avgVisits = totalVisits / weekCols.length;
        const currentWeek = parseFloat(providerData[weekCols[weekCols.length - 1]]) || 0;
        const prevWeek = weekCols.length > 1 ? parseFloat(providerData[weekCols[weekCols.length - 2]]) || 0 : 0;
        
        html += `
            <div class="stat-card">
                <div class="stat-label">Total Visits</div>
                <div class="stat-value">${totalVisits}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Average per Week</div>
                <div class="stat-value">${avgVisits.toFixed(1)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Current Week</div>
                <div class="stat-value">${currentWeek}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Previous Week</div>
                <div class="stat-value">${prevWeek}</div>
            </div>
        `;
    }
    
    html += '</div>';
    
    // Weekly breakdown table
    html += '<h3>Weekly Breakdown</h3>';
    html += '<table class="detail-table"><thead><tr><th>Week</th><th>Visits</th><th>Change from Previous</th></tr></thead><tbody>';
    
    weekCols.forEach((week, index) => {
        const visits = parseFloat(providerData[week]) || 0;
        const prevWeekVisits = index > 0 ? parseFloat(providerData[weekCols[index - 1]]) || 0 : 0;
        const change = index > 0 ? visits - prevWeekVisits : '-';
        const changeClass = typeof change === 'number' ? (change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral') : '';
        
        html += `<tr>`;
        html += `<td>${cleanColumnName(week)}</td>`;
        html += `<td class="number">${visits}</td>`;
        html += `<td class="number ${changeClass}">${typeof change === 'number' ? (change >= 0 ? '+' : '') + change : '-'}</td>`;
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    
    // All other details
    html += '<h3>Additional Information</h3>';
    html += '<table class="detail-table"><tbody>';
    
    columns.filter(col => !weekCols.includes(col) && col !== providerCol).forEach(col => {
        const value = providerData[col];
        if (value !== null && value !== undefined && value !== '') {
            html += `<tr><th>${cleanColumnName(col)}</th><td>${escapeHtml(String(value))}</td></tr>`;
        }
    });
    
    html += '</tbody></table>';
    
    document.getElementById('providerContent').innerHTML = html;
    openModal('providerModal');
}

// Helper functions for new features
function toggleAdvancedFilters() {
    const filtersPanel = document.getElementById('advancedFilters');
    if (filtersPanel) {
        filtersPanel.classList.toggle('visible');
        if (filtersPanel.classList.contains('visible')) {
            generateFilterOptions();
        }
    }
}

function generateFilterOptions() {
    const filterOptions = document.getElementById('filterOptions');
    if (!filterOptions || !currentData.length) return;
    
    const columns = Object.keys(currentData[0] || {});
    const html = columns.map(col => {
        const uniqueValues = [...new Set(currentData.map(row => row[col]).filter(v => v != null && v !== ''))];
        
        if (uniqueValues.length < 50 && uniqueValues.length > 1) {
            return `
                <div class="filter-group">
                    <label>${cleanColumnName(col)}</label>
                    <select onchange="applyColumnFilter('${col.replace(/'/g, "\\'")}', this.value)">
                        <option value="">All</option>
                        ${uniqueValues.slice(0, 20).map(v => `<option value="${String(v).replace(/"/g, '&quot;')}">${v}</option>`).join('')}
                    </select>
                </div>
            `;
        }
        return '';
    }).join('');
    
    filterOptions.innerHTML = html || '<p>No filterable columns available</p>';
}

function applyColumnFilter(column, value) {
    if (value === '') {
        delete activeFilters[column];
    } else {
        activeFilters[column] = value;
    }
    
    // Apply all filters
    filteredData = currentData.filter(row => {
        return Object.entries(activeFilters).every(([col, val]) => {
            return String(row[col]) === String(val);
        });
    });
    
    // Also apply search if exists
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filteredData = filteredData.filter(row => {
            return Object.values(row).some(value => {
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(searchTerm);
            });
        });
    }
    
    renderTable(filteredData);
}

function clearAllFilters() {
    activeFilters = {};
    document.querySelectorAll('.filter-group select').forEach(select => {
        select.value = '';
    });
    document.getElementById('searchInput').value = '';
    filteredData = [...currentData];
    renderTable(filteredData);
    showNotification('✅ All filters cleared');
}

function saveFilterPreset() {
    const name = prompt('Enter a name for this filter preset:');
    if (name) {
        SettingsManager.saveFilterPreset(name);
        updateFilterPresetsList();
    }
}

function loadFilterPreset(name) {
    if (name) {
        SettingsManager.loadFilterPreset(name);
    }
}

function updateFilterPresetsList() {
    const select = document.getElementById('filterPresets');
    if (!select) return;
    
    const presets = SettingsManager.settings.filterPresets || {};
    select.innerHTML = '<option value="">Load Preset...</option>' + 
        Object.keys(presets).map(name => 
            `<option value="${name}">${name}</option>`
        ).join('');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

