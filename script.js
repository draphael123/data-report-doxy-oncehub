// Global state
let allData = {};
let currentTab = 'Home';
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
    
    // Special handling for Home tab
    if (tabName === 'Home') {
        renderHomePage();
        return;
    }
    
    // Special handling for Weekly Changes tab
    if (tabName === 'Weekly Changes') {
        renderWeeklyChanges();
        return;
    }
    
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
    
    console.log('Updating monthly summary...');
    // Update monthly summary first
    const columns = currentData.length > 0 ? Object.keys(currentData[0]) : [];
    updateMonthlySummary(currentData, columns, tabName);
    
    console.log('Updating summary cards...');
    // Update summary cards
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
    
    console.log('Generating smart insights...');
    // Generate insights
    generateSmartInsights(currentData, columns, tabName);
    
    console.log('Generating weekly averages...');
    // Generate weekly averages
    generateWeeklyAverages(currentData, columns, tabName);
    
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
    
    // Calculate average per provider
    const activeProviders = data.filter(row => row[providerCol] && row[latestWeek] !== null && row[latestWeek] !== undefined);
    const avgVisits = activeProviders.length > 0 ? (latestTotal / activeProviders.length).toFixed(1) : 0;
    const previousAvg = activeProviders.length > 0 ? (previousTotal / activeProviders.length).toFixed(1) : 0;
    const avgChange = avgVisits - previousAvg;
    const avgPercentChange = previousAvg !== 0 ? ((avgChange / previousAvg) * 100).toFixed(1) : 0;
    
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
            <div class="analytics-card ${change >= 0 ? 'positive' : 'negative'}" 
                 title="Total visits for ${cleanColumnName(latestWeek)}\nPrevious week (${cleanColumnName(previousWeek)}): ${previousTotal.toLocaleString()}\nChange: ${change >= 0 ? '+' : ''}${change.toLocaleString()} (${percentChange}%)\nBased on ${activeProviders.length} active providers">
                <h3 title="Combined total from all providers for the most recent week">Total Visits (Latest Week) ℹ️</h3>
                <div class="analytics-value" title="${latestTotal.toLocaleString()} total visits">${latestTotal.toLocaleString()}</div>
                <div class="analytics-change ${change >= 0 ? 'positive' : 'negative'}" 
                     title="${change >= 0 ? 'Increased' : 'Decreased'} by ${Math.abs(change).toLocaleString()} visits (${Math.abs(percentChange)}%) compared to previous week">
                    <span class="arrow">${change >= 0 ? '↑' : '↓'}</span>
                    <span>${Math.abs(change).toLocaleString()} visits (${Math.abs(percentChange)}%) vs last week</span>
                </div>
            </div>
            
            <div class="analytics-card" 
                 title="Average visits per provider for ${cleanColumnName(latestWeek)}\nCalculation: ${latestTotal.toLocaleString()} ÷ ${activeProviders.length} providers = ${avgVisits}\nPrevious week avg: ${previousAvg}\nChange per provider: ${avgChange >= 0 ? '+' : ''}${avgChange} (${avgPercentChange}%)">
                <h3 title="Mean visits per provider - helps normalize performance across team size">Average per Provider ℹ️</h3>
                <div class="analytics-value" title="Average of ${avgVisits} visits per provider">${parseFloat(avgVisits).toLocaleString()}</div>
                <div class="analytics-change ${avgChange >= 0 ? 'positive' : 'negative'}" 
                     title="Average ${avgChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(avgChange)} visits (${Math.abs(avgPercentChange)}%) per provider vs last week">
                    <span class="arrow">${avgChange >= 0 ? '↑' : '↓'}</span>
                    <span>${Math.abs(avgChange).toFixed(1)} visits (${Math.abs(avgPercentChange)}%) vs last week</span>
                </div>
            </div>
            
            <div class="analytics-card" 
                 title="Previous week data for comparison\n${cleanColumnName(previousWeek)}\nTotal visits: ${previousTotal.toLocaleString()}\nAverage per provider: ${previousAvg}\nActive providers: ${activeProviders.length}">
                <h3 title="Comparison baseline - the week before the current week">Previous Week ℹ️</h3>
                <div class="analytics-value" title="${previousTotal.toLocaleString()} total visits in ${cleanColumnName(previousWeek)}">${previousTotal.toLocaleString()}</div>
                <div class="analytics-change neutral" title="Week of ${cleanColumnName(previousWeek)}">
                    <span>${cleanColumnName(previousWeek)}</span>
                </div>
            </div>
            
            <div class="analytics-card" 
                 title="Current week average breakdown\nTotal visits: ${latestTotal.toLocaleString()}\nActive providers: ${data.length}\nAverage per provider: ${avgVisits}\nHighest provider: ${topPerformers[0]?.current || 'N/A'}\nLowest active provider: ${Math.min(...providersWithTrends.map(p => p.current).filter(v => v > 0))}">
                <h3 title="Average visits per provider - another view of provider performance">Average Visits per Provider ℹ️</h3>
                <div class="analytics-value" title="${avgVisits} average visits per provider">${avgVisits}</div>
                <div class="analytics-change neutral" title="Calculated from ${data.length} providers with recorded data">
                    <span>Based on ${data.length} providers</span>
                </div>
            </div>
        </div>
        
        <div class="top-performers">
            <h3 title="Top 5 providers by total visits in ${cleanColumnName(latestWeek)}">🏆 Top 5 Performers (Current Week)</h3>
            ${topPerformers.map((performer, idx) => `
                <div class="performer-item" 
                     title="${performer.name} Performance Details\nCurrent week: ${performer.current} visits\nPrevious week: ${performer.previous} visits\nChange: ${performer.trend >= 0 ? '+' : ''}${performer.trend} (${performer.trendPercent}%)\n${((performer.current / latestTotal) * 100).toFixed(1)}% of total visits\n${(performer.current / avgVisits).toFixed(1)}x the average">
                    <span class="performer-rank" title="Rank ${idx + 1} of ${topPerformers.length}">#${idx + 1}</span>
                    <span class="performer-name" title="Click to see detailed history">${performer.name}</span>
                    <span class="performer-value" title="${performer.current} visits this week">${performer.current.toLocaleString()}</span>
                    <span class="performer-trend ${performer.trend >= 0 ? 'up' : 'down'}" 
                          title="${performer.trend >= 0 ? 'Increased' : 'Decreased'} by ${Math.abs(performer.trend)} visits (${Math.abs(performer.trendPercent)}%) compared to previous week">
                        ${performer.trend >= 0 ? '↑' : '↓'} ${Math.abs(performer.trend)} (${Math.abs(performer.trendPercent)}%)
                    </span>
                </div>
            `).join('')}
        </div>
        
        ${biggestGains.length > 0 ? `
        <div class="top-performers">
            <h3 title="Providers with the largest increase in visits compared to last week">📈 Biggest Increases Week-over-Week</h3>
            ${biggestGains.map((performer, idx) => `
                <div class="performer-item" 
                     title="${performer.name} showed significant improvement\nPrevious week: ${performer.previous} visits\nCurrent week: ${performer.current} visits\nImprovement: +${performer.trend} visits (+${performer.trendPercent}%)\nThis is a ${((performer.trend / performer.previous) * 100).toFixed(0)}% increase">
                    <span class="performer-rank" title="Rank ${idx + 1} for biggest improvement">#${idx + 1}</span>
                    <span class="performer-name">${performer.name}</span>
                    <span class="performer-value" title="${performer.current} visits (up from ${performer.previous})">${performer.current.toLocaleString()}</span>
                    <span class="performer-trend up" title="Increased by ${performer.trend} visits (+${performer.trendPercent}%) from last week">
                        ↑ ${performer.trend} (+${performer.trendPercent}%)
                    </span>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${biggestDeclines.length > 0 ? `
        <div class="top-performers">
            <h3 title="Providers with the largest decrease in visits compared to last week - may need attention">📉 Biggest Decreases Week-over-Week</h3>
            ${biggestDeclines.map((performer, idx) => `
                <div class="performer-item" 
                     title="${performer.name} needs attention\nPrevious week: ${performer.previous} visits\nCurrent week: ${performer.current} visits\nDecline: ${performer.trend} visits (${performer.trendPercent}%)\nThis is a ${Math.abs(((performer.trend / performer.previous) * 100)).toFixed(0)}% decrease">
                    <span class="performer-rank" title="Rank ${idx + 1} for biggest decline">#${idx + 1}</span>
                    <span class="performer-name">${performer.name}</span>
                    <span class="performer-value" title="${performer.current} visits (down from ${performer.previous})">${performer.current.toLocaleString()}</span>
                    <span class="performer-trend down" title="Decreased by ${Math.abs(performer.trend)} visits (${performer.trendPercent}%) from last week">
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
    if (!data || data.length === 0) {
        console.warn('No data provided to generateDoxy20MinAnalytics');
        return '';
    }
    
    // Find provider column - use Unnamed: 0 which contains provider names
    const providerCol = 'Unnamed: 0';
    
    // Find week columns that contain visit data - be flexible with pattern matching
    const weekCols = columns.filter(col => {
        const colStr = String(col).toUpperCase().trim();
        // Match "WEEK OF 11/30" or "Week of 12/6" pattern
        return colStr.includes('WEEK') && colStr.includes('OF') && colStr.match(/\d+\/\d+/);
    });
    
    console.log('Doxy 20+ Analytics - Found week columns:', weekCols);
    
    if (weekCols.length < 2) {
        console.warn('Not enough week columns found:', weekCols);
        return '';
    }
    
    // Get last two weeks for comparison
    const currentWeekCol = weekCols[weekCols.length - 1];
    const prevWeekCol = weekCols[weekCols.length - 2];
    
    console.log('Using columns:', currentWeekCol, 'vs', prevWeekCol);
    
    // Filter valid provider rows (skip headers, totals)
    const validData = data.filter(row => {
        const provider = row[providerCol];
        if (!provider) return false;
        const provStr = String(provider).toLowerCase();
        return provStr !== 'provider' && 
               !provStr.includes('total') && 
               provStr.trim() !== '';
    });
    
    console.log(`Valid providers: ${validData.length} out of ${data.length} rows`);
    
    // Analyze each provider's performance
    const providerAnalysis = validData.map(row => {
        const provider = row[providerCol];
        const currentVisits = parseInt(row[currentWeekCol]) || 0;
        const prevVisits = parseInt(row[prevWeekCol]) || 0;
        const change = currentVisits - prevVisits;
        const changePercent = prevVisits > 0 ? ((change / prevVisits) * 100) : 0;
        
        return {
            provider,
            currentVisits,
            prevVisits,
            change,
            changePercent
        };
    });
    
    // Remove providers with no data at all
    const activeProviders = providerAnalysis.filter(p => p.currentVisits > 0 || p.prevVisits > 0);
    
    console.log(`Active providers with data: ${activeProviders.length}`);
    
    if (activeProviders.length === 0) {
        return `
            <div class="analytics-summary">
                <h3>⏱️ Visits Over 20 Minutes - No Data Available</h3>
                <p>No visit data found for this period.</p>
            </div>
        `;
    }
    
    // Best performers: Fewest visits over 20 min (most efficient)
    const bestPerformers = [...activeProviders]
        .sort((a, b) => a.currentVisits - b.currentVisits)
        .slice(0, 5);
    
    // Needs attention: Most visits over 20 min (least efficient)
    const needsAttention = [...activeProviders]
        .filter(p => p.currentVisits > 0)
        .sort((a, b) => b.currentVisits - a.currentVisits)
        .slice(0, 5);
    
    // Calculate totals and averages
    const totalCurrent = activeProviders.reduce((sum, p) => sum + p.currentVisits, 0);
    const totalPrev = activeProviders.reduce((sum, p) => sum + p.prevVisits, 0);
    const totalChange = totalCurrent - totalPrev;
    const totalChangePercent = totalPrev > 0 ? ((totalChange / totalPrev) * 100) : 0;
    
    const avgCurrent = activeProviders.length > 0 ? (totalCurrent / activeProviders.length).toFixed(1) : 0;
    const avgPrev = activeProviders.length > 0 ? (totalPrev / activeProviders.length).toFixed(1) : 0;
    const avgChange = avgCurrent - avgPrev;
    const avgChangePercent = avgPrev > 0 ? ((avgChange / avgPrev) * 100).toFixed(1) : 0;
    
    console.log(`Final stats - Total: ${totalCurrent}, Avg: ${avgCurrent}, Providers: ${activeProviders.length}`);
    
    return `
        <div class="analytics-summary">
            <h3>⏱️ Visits Over 20 Minutes - Efficiency Tracking</h3>
            <p>Lower numbers indicate more efficient visits. Track week-over-week changes.</p>
        </div>
        
        <div class="analytics-grid">
            <div class="analytics-card ${totalChange < 0 ? 'positive' : totalChange > 0 ? 'negative' : ''}">
                <h3>Total This Week</h3>
                <div class="analytics-value">${totalCurrent}</div>
                <div class="analytics-change ${totalChange < 0 ? 'positive' : totalChange > 0 ? 'negative' : 'neutral'}">
                    <span>${totalChange >= 0 ? '+' : ''}${totalChange} (${totalChangePercent >= 0 ? '+' : ''}${totalChangePercent.toFixed(1)}%)</span>
                    <span>vs last week: ${totalPrev}</span>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>Average per Provider</h3>
                <div class="analytics-value">${parseFloat(avgCurrent).toLocaleString()}</div>
                <div class="analytics-change ${avgChange < 0 ? 'positive' : avgChange > 0 ? 'negative' : 'neutral'}">
                    <span>${avgChange >= 0 ? '+' : ''}${parseFloat(avgChange).toFixed(1)} (${avgChangePercent >= 0 ? '+' : ''}${avgChangePercent}%)</span>
                    <span>vs last week: ${avgPrev}</span>
                </div>
            </div>
        </div>
        
        <div class="performers-grid">
            <div class="top-performers positive">
                <h3>✅ Most Efficient (Fewest Visits > 20 min)</h3>
                <div class="performers-list">
                    ${bestPerformers.length > 0 ? bestPerformers.map((p, index) => `
                        <div class="performer-item">
                            <span class="rank">#${index + 1}</span>
                            <span class="provider-name">${escapeHtml(p.provider)}</span>
                            <span class="performer-stats">
                                <strong>${p.currentVisits}</strong> visits
                                ${p.change !== 0 ? `
                                    <span class="${p.change < 0 ? 'positive' : p.change > 0 ? 'negative' : 'neutral'}">
                                        ${p.change >= 0 ? '+' : ''}${p.change}
                                    </span>
                                ` : ''}
                            </span>
                        </div>
                    `).join('') : '<p style="color: var(--text-secondary); padding: 16px;">No data available for this period.</p>'}
                </div>
            </div>
            
            <div class="top-performers warning">
                <h3>⚠️ Needs Attention (Most Visits > 20 min)</h3>
                <div class="performers-list">
                    ${needsAttention.length > 0 ? needsAttention.map((p, index) => `
                        <div class="performer-item">
                            <span class="rank">#${index + 1}</span>
                            <span class="provider-name">${escapeHtml(p.provider)}</span>
                            <span class="performer-stats">
                                <strong>${p.currentVisits}</strong> visits
                                ${p.change !== 0 ? `
                                    <span class="${p.change < 0 ? 'positive' : p.change > 0 ? 'negative' : 'neutral'}">
                                        ${p.change >= 0 ? '+' : ''}${p.change}
                                    </span>
                                ` : ''}
                            </span>
                        </div>
                    `).join('') : '<p style="color: var(--text-secondary); padding: 16px;">No providers with visits over 20 minutes this week.</p>'}
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
        
        // Check if this is a week column
        const colStr = String(col);
        const isWeekColumn = colStr.match(/week\s+of\s+\d+\/\d+/i) || (colStr.match(/\d+\/\d+/) && colStr.includes('-') && !colStr.toLowerCase().includes('unnamed'));
        
        if (isWeekColumn) {
            // Week column with view button
            html += `<th class="${sortClass}">
                <div class="week-header">
                    <span onclick="sortData('${col.replace(/'/g, "\\'")}')">${displayName}</span>
                    <button class="view-week-btn" onclick="openWeekModal('${col.replace(/'/g, "\\'")}'); event.stopPropagation();" title="View detailed breakdown for this week">
                        📊
                    </button>
                </div>
            </th>`;
        } else {
            // Regular column
            html += `<th class="${sortClass}" onclick="sortData('${col.replace(/'/g, "\\'")}')">${displayName}</th>`;
        }
    });
    
    // Add actions column
    html += '<th class="actions-header">Actions</th>';
    
    html += '</tr></thead><tbody>';
    
    // Detect week columns for trend analysis
    const weekCols = meaningfulColumns.filter(col => {
        const colStr = String(col);
        return colStr.match(/week of \d+\/\d+/i) || (colStr.match(/\d+\/\d+/) && !colStr.toLowerCase().includes('unnamed'));
    });
    
    const currentWeekCol = weekCols.length > 0 ? weekCols[weekCols.length - 1] : null;
    const prevWeekCol = weekCols.length > 1 ? weekCols[weekCols.length - 2] : null;
    
    // Add data rows with enhanced visual indicators
    data.forEach((row, rowIndex) => {
        const currentWeekValue = currentWeekCol ? parseFloat(row[currentWeekCol]) : null;
        const prevWeekValue = prevWeekCol ? parseFloat(row[prevWeekCol]) : null;
        
        // Detect anomalies
        let rowClass = rowIndex % 2 === 0 ? 'row-even' : 'row-odd';
        let anomalyFlag = '';
        
        if (!isNaN(currentWeekValue) && !isNaN(prevWeekValue) && prevWeekValue > 0) {
            const changePercent = ((currentWeekValue - prevWeekValue) / prevWeekValue) * 100;
            
            if (changePercent < -anomalyThresholds.largeDropPercent) {
                rowClass += ' anomaly-warning';
                anomalyFlag = `<span class="anomaly-badge warning" title="Large drop: ${changePercent.toFixed(0)}%">⚠️</span>`;
            } else if (changePercent > anomalyThresholds.largeIncreasePercent) {
                rowClass += ' anomaly-success';
                anomalyFlag = `<span class="anomaly-badge success" title="Large increase: ${changePercent.toFixed(0)}%">🚀</span>`;
            }
        }
        
        if (anomalyThresholds.zeroVisitsWarning && currentWeekValue === 0 && prevWeekValue > 0) {
            rowClass += ' anomaly-alert';
            anomalyFlag = `<span class="anomaly-badge alert" title="Zero visits this week">🔴</span>`;
        }
        
        html += `<tr class="${rowClass}" data-row="${rowIndex}">`;
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
            let cellContent = '';
            
            // Format numbers for better readability
            let cellDataValue = '';
            if (isNumber) {
                const numValue = parseFloat(value);
                cellDataValue = ` data-value="${numValue}"`;
                
                // Heat map coloring for week columns (visits/numbers)
                if (weekCols.includes(col) && numValue > 0) {
                    // Determine heat level based on value ranges
                    if (numValue >= 50) {
                        cellClass += ' heat-excellent';
                    } else if (numValue >= 30) {
                        cellClass += ' heat-good';
                    } else if (numValue >= 15) {
                        cellClass += ' heat-average';
                    } else if (numValue > 0) {
                        cellClass += ' heat-low';
                    }
                }
                
                // Check if it's a percentage (value between 0-100 with decimals or contains %)
                if (value.includes('%') || (numValue >= 0 && numValue <= 100 && value.includes('.'))) {
                    cellContent = numValue.toFixed(1) + (value.includes('%') ? '' : '%');
                    cellClass += ' percentage';
                } else if (numValue === 0) {
                    // Style zeros differently - with context tooltip
                    cellContent = '<span class="zero-badge" title="No activity this period">—</span>';
                    cellClass += ' zero-value';
                } else if (Math.abs(numValue) >= 1000) {
                    // Add comma separators for large numbers
                    cellContent = numValue.toLocaleString('en-US', {maximumFractionDigits: 1});
                } else if (numValue % 1 !== 0) {
                    // Has decimals - limit to 2 decimal places
                    cellContent = numValue.toFixed(2);
                } else {
                    // Whole number
                    cellContent = numValue.toLocaleString('en-US');
                }
                
                // Add unit labels for clarity
                if (weekCols.includes(col) && numValue > 0) {
                    cellContent = `<span class="cell-value">${cellContent}</span><span class="cell-unit">visits</span>`;
                }
            } else if (value === '') {
                // Empty values with helpful message
                cellContent = '<span class="empty-cell" title="No data available">—</span>';
                cellClass += ' empty';
            } else {
                cellContent = escapeHtml(value);
            }
            
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
            
            // Generate comprehensive tooltip for cells
            let cellTooltip = '';
            if (isNumber && weekCols.includes(col)) {
                const numValue = parseFloat(value);
                const providerName = row[meaningfulColumns[0]];
                const weekLabel = cleanColumnName(col);
                
                // Calculate stats for this week column
                const allValuesInCol = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v) && v > 0);
                const colTotal = allValuesInCol.reduce((sum, v) => sum + v, 0);
                const colAverage = allValuesInCol.length > 0 ? colTotal / allValuesInCol.length : 0;
                const colMax = Math.max(...allValuesInCol);
                const colMin = Math.min(...allValuesInCol);
                
                const percentOfTotal = colTotal > 0 ? ((numValue / colTotal) * 100).toFixed(1) : 0;
                const vsAverage = colAverage > 0 ? ((numValue / colAverage) * 100).toFixed(0) : 0;
                
                cellTooltip = `${providerName} - ${weekLabel}\n` +
                    `Visits: ${numValue}\n` +
                    `${percentOfTotal}% of week total (${colTotal})\n` +
                    `${vsAverage}% of average (${colAverage.toFixed(1)})\n` +
                    `Rank: ${allValuesInCol.filter(v => v > numValue).length + 1} of ${allValuesInCol.length}\n` +
                    `Week range: ${colMin} - ${colMax}`;
                
                // Add WoW comparison if available
                if (prevWeekCol && weekCols.indexOf(col) > 0 && weekCols.indexOf(col) === weekCols.indexOf(prevWeekCol) + 1) {
                    const prevValue = parseFloat(row[prevWeekCol]);
                    if (!isNaN(prevValue) && prevValue > 0) {
                        const change = numValue - prevValue;
                        const changePercent = ((change / prevValue) * 100).toFixed(1);
                        cellTooltip += `\n\nWeek-over-Week:\n` +
                            `Previous: ${prevValue}\n` +
                            `Change: ${change > 0 ? '+' : ''}${change} (${changePercent}%)`;
                    }
                }
            } else if (index === 0 && value && value !== '') {
                // Provider name tooltip
                cellTooltip = `${value}\nClick to view detailed performance history and analytics`;
            } else if (!isNumber && value && value !== '') {
                // Text cell tooltip
                cellTooltip = `${cleanColumnName(col)}: ${value}`;
            }
            
            const tooltipAttr = cellTooltip ? ` title="${cellTooltip.replace(/"/g, '&quot;')}"` : '';
            html += `<td class="${cellClass}"${cellDataValue}${tooltipAttr}>${cellContent}</td>`;
        });
        
        // Add actions menu
        const providerName = row[meaningfulColumns[0]];
        html += `
            <td class="actions-cell">
                <div class="actions-menu">
                    <button class="actions-btn" onclick="toggleRowActions(this)">⋮</button>
                    <div class="actions-dropdown">
                        <button onclick="openProviderModal('${escapeHtml(providerName).replace(/'/g, "\\'")}')">👤 View Details</button>
                        <button onclick="exportRowData(this)">📥 Export Row</button>
                        <button onclick="addRowNote(this)">📝 Add Note</button>
                        <button onclick="compareRow(this)">📊 Compare</button>
                    </div>
                </div>
            </td>
        `;
        
        html += '</tr>';
    });
    
    html += '</tbody>';
    
    // Add sticky summary row
    html += '<tfoot class="sticky-summary"><tr>';
    html += '<th>TOTALS</th>';
    meaningfulColumns.slice(1).forEach((col, colIndex) => {
        const actualCol = meaningfulColumns[colIndex + 1];
        // Calculate sum for numeric columns
        const sum = data.reduce((acc, row) => {
            const val = parseFloat(row[actualCol]);
            return acc + (isNaN(val) ? 0 : val);
        }, 0);
        
        if (sum > 0) {
            const avg = (sum / data.length).toFixed(1);
            html += `<th class="summary-cell" title="Total: ${sum.toLocaleString()}&#10;Average: ${avg}">
                <div class="summary-value">${sum.toLocaleString()}</div>
                <div class="summary-avg">avg: ${avg}</div>
            </th>`;
        } else {
            html += '<th class="summary-cell">—</th>';
        }
    });
    html += '</tr></tfoot>';
    
    html += '</table>';
    
    tableWrapper.innerHTML = html;
    
    // Enhance table interactivity
    enhanceTableReadability();
    
    // Add sparklines to each row
    addSparklinesToRows(data, weekCols);
    
    // Setup horizontal scroll indicators
    setupTableScrollListener();
}

// Add sparklines to table rows
function addSparklinesToRows(data, weekCols) {
    if (weekCols.length < 3) return; // Need at least 3 data points
    
    const table = document.querySelector('table');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach((row, rowIndex) => {
        if (rowIndex >= data.length) return;
        
        const rowData = data[rowIndex];
        const values = weekCols.map(col => parseFloat(rowData[col]) || 0);
        
        // Skip if all zeros
        if (values.every(v => v === 0)) return;
        
        // Create sparkline
        const sparkline = createSparkline(values);
        
        // Add sparkline to first cell
        const firstCell = row.querySelector('td:first-child');
        if (firstCell && sparkline) {
            firstCell.insertAdjacentHTML('beforeend', sparkline);
        }
    });
}

function createSparkline(values) {
    if (!values || values.length < 2) return '';
    
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    
    const width = 50;
    const height = 20;
    const points = values.map((val, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    
    // Determine trend
    const firstHalf = values.slice(0, Math.floor(values.length / 2)).reduce((a, b) => a + b, 0);
    const secondHalf = values.slice(Math.floor(values.length / 2)).reduce((a, b) => a + b, 0);
    const trend = secondHalf > firstHalf ? 'up' : secondHalf < firstHalf ? 'down' : 'neutral';
    const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280';
    
    return `
        <svg class="sparkline sparkline-${trend}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            <polyline
                fill="none"
                stroke="${trendColor}"
                stroke-width="2"
                points="${points}"
            />
            <circle cx="${(values.length - 1) / (values.length - 1) * width}" cy="${height - ((values[values.length - 1] - min) / range) * height}" r="2" fill="${trendColor}"/>
        </svg>
    `;
}

// Generate and display smart insights
function generateSmartInsights(data, columns, tabName) {
    const weekCols = columns.filter(col => {
        const colStr = String(col);
        return colStr.match(/week of \d+\/\d+/i) || (colStr.match(/\d+\/\d+/) && !colStr.toLowerCase().includes('unnamed'));
    });
    
    if (weekCols.length < 2) return;
    
    const currentWeekCol = weekCols[weekCols.length - 1];
    const prevWeekCol = weekCols[weekCols.length - 2];
    const providerCol = columns[0];
    
    const validData = data.filter(row => {
        const provider = row[providerCol];
        return provider && provider !== 'Provider' && !String(provider).toLowerCase().includes('total');
    });
    
    const insights = [];
    
    // Calculate total and changes
    const currentTotal = validData.reduce((sum, row) => sum + (parseFloat(row[currentWeekCol]) || 0), 0);
    const previousTotal = validData.reduce((sum, row) => sum + (parseFloat(row[prevWeekCol]) || 0), 0);
    const totalChange = currentTotal - previousTotal;
    const totalChangePercent = previousTotal > 0 ? ((totalChange / previousTotal) * 100).toFixed(1) : 0;
    
    // Insight 1: Overall performance
    if (Math.abs(totalChangePercent) > 10) {
        const emoji = totalChange > 0 ? '🚀' : '⚠️';
        insights.push(`${emoji} <strong>${tabName}:</strong> ${totalChange > 0 ? 'Up' : 'Down'} ${Math.abs(totalChangePercent)}% this week (${totalChange > 0 ? '+' : ''}${totalChange} visits)`);
    }
    
    // Insight 2: Top performer
    const performers = validData.map(row => ({
        name: row[providerCol],
        current: parseFloat(row[currentWeekCol]) || 0
    })).sort((a, b) => b.current - a.current);
    
    if (performers.length > 0 && performers[0].current > 0) {
        insights.push(`🏆 <strong>Top Performer:</strong> ${performers[0].name} with ${performers[0].current} visits`);
    }
    
    // Insight 3: Zero activity warnings
    const zeroVisits = validData.filter(row => (parseFloat(row[currentWeekCol]) || 0) === 0 && (parseFloat(row[prevWeekCol]) || 0) > 0);
    if (zeroVisits.length > 0) {
        insights.push(`🔴 <strong>Attention Needed:</strong> ${zeroVisits.length} provider${zeroVisits.length > 1 ? 's' : ''} with zero visits (had activity last week)`);
    }
    
    // Insight 4: Biggest gain
    const gains = validData.map(row => ({
        name: row[providerCol],
        change: (parseFloat(row[currentWeekCol]) || 0) - (parseFloat(row[prevWeekCol]) || 0)
    })).filter(p => p.change > 0).sort((a, b) => b.change - a.change);
    
    if (gains.length > 0 && gains[0].change > 5) {
        insights.push(`📈 <strong>Biggest Gain:</strong> ${gains[0].name} (+${gains[0].change} visits)`);
    }
    
    // Insight 5: Milestone
    if (currentTotal >= 1000 && currentTotal < previousTotal) {
        insights.push(`🎯 <strong>Milestone:</strong> Team maintained ${Math.floor(currentTotal / 1000)}K+ visits!`);
    }
    
    // Display insights
    const insightsPanel = document.getElementById('insightsPanel');
    const insightsContent = document.getElementById('insightsContent');
    
    if (insights.length > 0) {
        insightsContent.innerHTML = insights.map(insight => 
            `<div class="insight-item">${insight}</div>`
        ).join('');
        insightsPanel.style.display = 'block';
    } else {
        insightsPanel.style.display = 'none';
    }
}

function closeInsights() {
    document.getElementById('insightsPanel').style.display = 'none';
}

// Render Home Page with Guide and Weekly Summary
function renderHomePage() {
    console.log('Rendering Home page...');
    
    // Hide elements not needed for this view
    document.getElementById('analyticsSection').classList.remove('visible');
    document.getElementById('chartsSection').innerHTML = '';
    document.getElementById('weeklyAveragesSection').style.display = 'none';
    document.getElementById('monthlySummary').style.display = 'none';
    document.getElementById('summaryCardsSection').style.display = 'none';
    document.getElementById('insightsPanel').style.display = 'none';
    document.getElementById('quickFiltersSection').style.display = 'none';
    
    // Calculate weekly summary across all data sources
    const weeklySummary = calculateWeeklySummary();
    
    // Build home page HTML
    let html = `
        <div class="home-container">
            <div class="home-hero">
                <h1>📊 Doxy & Oncehub Reports Dashboard</h1>
                <p class="hero-subtitle">Comprehensive analytics and reporting for provider performance tracking</p>
            </div>
            
            <div class="weekly-summary-section">
                <h2>📈 This Week at a Glance</h2>
                <p class="section-subtitle">Comparing current week vs. previous week across all metrics</p>
                
                <div class="summary-grid">
                    ${weeklySummary.map(item => `
                        <div class="summary-card ${item.change >= 0 ? 'positive' : 'negative'}">
                            <div class="summary-icon">${item.icon}</div>
                            <div class="summary-content">
                                <h3>${item.title}</h3>
                                <div class="summary-value">${item.currentValue}</div>
                                <div class="summary-comparison">
                                    <span class="comparison-label">Last week:</span>
                                    <span class="comparison-value">${item.previousValue}</span>
                                </div>
                                <div class="summary-change ${item.change >= 0 ? 'positive' : 'negative'}">
                                    <span class="change-arrow">${item.change >= 0 ? '↑' : '↓'}</span>
                                    <span class="change-amount">${Math.abs(item.change).toFixed(1)}</span>
                                    <span class="change-percent">(${item.change >= 0 ? '+' : ''}${item.percentChange.toFixed(1)}%)</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="guide-section">
                <h2>📖 How to Use This Dashboard</h2>
                
                <div class="guide-grid">
                    <div class="guide-card">
                        <div class="guide-icon">🗂️</div>
                        <h3>Navigate Tabs</h3>
                        <p>Click on tabs at the top to view different datasets:</p>
                        <ul>
                            <li><strong>Doxy Visits:</strong> Provider visit data week by week</li>
                            <li><strong>Weekly Changes:</strong> Top increases/decreases across all data</li>
                            <li><strong>Gusto Hours:</strong> Provider hours worked</li>
                            <li><strong>Doxy 20+ Minutes:</strong> Extended visit durations</li>
                            <li><strong>Oncehub Reports:</strong> Various program and visit metrics</li>
                        </ul>
                    </div>
                    
                    <div class="guide-card">
                        <div class="guide-icon">🔍</div>
                        <h3>Search & Filter</h3>
                        <p>Use the powerful search and filtering tools:</p>
                        <ul>
                            <li>Type in the <strong>search box</strong> to find specific providers</li>
                            <li>Click <strong>column headers</strong> to sort data</li>
                            <li>Use <strong>Quick Filters</strong> (All, Active, Top 10, etc.)</li>
                            <li>Apply <strong>date range filters</strong> for specific periods</li>
                        </ul>
                    </div>
                    
                    <div class="guide-card">
                        <div class="guide-icon">📊</div>
                        <h3>View Week Details</h3>
                        <p>Click the 📊 icon in week column headers to see:</p>
                        <ul>
                            <li><strong>Provider rankings</strong> for that specific week</li>
                            <li><strong>Performance statistics</strong> and distribution</li>
                            <li><strong>Top performers</strong> with medals (🥇🥈🥉)</li>
                            <li><strong>Visual charts</strong> showing performance tiers</li>
                        </ul>
                    </div>
                    
                    <div class="guide-card">
                        <div class="guide-icon">👤</div>
                        <h3>Provider Details</h3>
                        <p>Click on any provider name to view:</p>
                        <ul>
                            <li><strong>Complete history</strong> across all weeks</li>
                            <li><strong>Total & average</strong> performance metrics</li>
                            <li><strong>Week-by-week breakdown</strong> with trends</li>
                            <li><strong>Additional information</strong> from all fields</li>
                        </ul>
                    </div>
                    
                    <div class="guide-card">
                        <div class="guide-icon">📥</div>
                        <h3>Export Data</h3>
                        <p>Save your data in multiple formats:</p>
                        <ul>
                            <li><strong>PDF:</strong> Formatted reports with charts</li>
                            <li><strong>Excel:</strong> Spreadsheet with all data</li>
                            <li><strong>CSV:</strong> Simple data export</li>
                            <li><strong>Charts:</strong> Save visualizations as images</li>
                            <li><strong>Clipboard:</strong> Copy for quick pasting</li>
                        </ul>
                    </div>
                    
                    <div class="guide-card">
                        <div class="guide-icon">🎨</div>
                        <h3>Customize Display</h3>
                        <p>Personalize your dashboard experience:</p>
                        <ul>
                            <li><strong>Theme:</strong> Choose Light, Dark, Midnight, Ocean, or Sunset</li>
                            <li><strong>Density:</strong> Compact, Comfortable, or Spacious</li>
                            <li><strong>Animations:</strong> Enable/disable for performance</li>
                            <li><strong>Rows per page:</strong> Control how much data to display</li>
                        </ul>
                    </div>
                    
                    <div class="guide-card">
                        <div class="guide-icon">💡</div>
                        <h3>Smart Features</h3>
                        <p>Take advantage of intelligent analytics:</p>
                        <ul>
                            <li><strong>Tooltips:</strong> Hover over any element for detailed explanations</li>
                            <li><strong>Heat maps:</strong> Color-coded cells show performance levels</li>
                            <li><strong>Sparklines:</strong> Mini trend charts in provider rows</li>
                            <li><strong>Anomaly detection:</strong> Automatic flagging of unusual changes</li>
                            <li><strong>Smart insights:</strong> AI-powered observations and recommendations</li>
                        </ul>
                    </div>
                    
                    <div class="guide-card">
                        <div class="guide-icon">⌨️</div>
                        <h3>Keyboard Shortcuts</h3>
                        <p>Speed up your workflow with shortcuts:</p>
                        <ul>
                            <li><strong>S:</strong> Open Settings</li>
                            <li><strong>E:</strong> Open Export menu</li>
                            <li><strong>C:</strong> Open Comparison view</li>
                            <li><strong>?:</strong> Open Help</li>
                            <li><strong>Ctrl/Cmd + F:</strong> Focus search box</li>
                            <li><strong>ESC:</strong> Close modals</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="quick-tips-section">
                <h2>💡 Pro Tips</h2>
                <div class="tips-grid">
                    <div class="tip-card">
                        <span class="tip-emoji">🎯</span>
                        <p><strong>Focus on trends:</strong> Look at week-over-week changes rather than absolute numbers to spot meaningful patterns.</p>
                    </div>
                    <div class="tip-card">
                        <span class="tip-emoji">🔄</span>
                        <p><strong>Use comparisons:</strong> The Comparison feature lets you view two weeks side-by-side for detailed analysis.</p>
                    </div>
                    <div class="tip-card">
                        <span class="tip-emoji">📈</span>
                        <p><strong>Check anomalies:</strong> Red and yellow badges highlight unusual changes that may need attention.</p>
                    </div>
                    <div class="tip-card">
                        <span class="tip-emoji">💾</span>
                        <p><strong>Save favorites:</strong> Use filter presets to save commonly used search criteria.</p>
                    </div>
                    <div class="tip-card">
                        <span class="tip-emoji">🌙</span>
                        <p><strong>Try dark mode:</strong> Easier on the eyes during extended viewing sessions.</p>
                    </div>
                    <div class="tip-card">
                        <span class="tip-emoji">📱</span>
                        <p><strong>Mobile friendly:</strong> The dashboard is fully responsive and works great on tablets and phones.</p>
                    </div>
                </div>
            </div>
            
            <div class="home-footer">
                <p>📅 Data last updated: <strong>${new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}</strong></p>
                <p>Need help? Click the ❓ button in the top-right corner or hover over any element for tooltips.</p>
            </div>
        </div>
    `;
    
    const tableWrapper = document.getElementById('tableWrapper');
    if (tableWrapper) {
        tableWrapper.innerHTML = html;
    }
}

// Calculate weekly summary across all data sources
function calculateWeeklySummary() {
    const summary = [];
    
    // Data sources to analyze
    const sources = [
        { name: 'Doxy Visits', icon: '🏥', label: 'Doxy Visits' },
        { name: 'Gusto Hours ', icon: '⏰', label: 'Gusto Hours' },
        { name: 'Doxy - Over 20 minutes', icon: '⏱️', label: 'Doxy 20+ Min Sessions' },
        { name: 'Oncehub Report - Number of Visi', icon: '📞', label: 'Oncehub Visits' }
    ];
    
    sources.forEach(source => {
        if (!allData[source.name]) return;
        
        const data = allData[source.name].filter(row => {
            const firstValue = Object.values(row)[0];
            return firstValue && 
                   firstValue !== 'Total' && 
                   firstValue !== 'Provider' &&
                   !String(firstValue).toLowerCase().includes('total');
        });
        
        if (data.length === 0) return;
        
        const columns = Object.keys(data[0]);
        
        // Find week columns
        const weekCols = columns.filter(col => {
            const colStr = String(col);
            return colStr.match(/week\s+of\s+\d+\/\d+/i) || (colStr.match(/\d+\/\d+/) && colStr.includes('-') && !colStr.toLowerCase().includes('unnamed'));
        });
        
        if (weekCols.length < 2) return;
        
        // Get last two weeks
        const currentWeekCol = weekCols[weekCols.length - 1];
        const previousWeekCol = weekCols[weekCols.length - 2];
        
        // Calculate totals
        let currentTotal = 0;
        let previousTotal = 0;
        
        data.forEach(row => {
            const currentVal = parseFloat(row[currentWeekCol]);
            const previousVal = parseFloat(row[previousWeekCol]);
            
            if (!isNaN(currentVal)) currentTotal += currentVal;
            if (!isNaN(previousVal)) previousTotal += previousVal;
        });
        
        const change = currentTotal - previousTotal;
        const percentChange = previousTotal > 0 ? (change / previousTotal) * 100 : 0;
        
        summary.push({
            title: source.label,
            icon: source.icon,
            currentValue: currentTotal.toFixed(1),
            previousValue: previousTotal.toFixed(1),
            change: change,
            percentChange: percentChange
        });
    });
    
    return summary;
}

// Render Weekly Changes Analysis Tab
function renderWeeklyChanges() {
    console.log('Rendering Weekly Changes tab...');
    
    // Hide elements not needed for this view
    document.getElementById('analyticsSection').classList.remove('visible');
    document.getElementById('chartsSection').innerHTML = '';
    document.getElementById('weeklyAveragesSection').style.display = 'none';
    document.getElementById('monthlySummary').style.display = 'none';
    document.getElementById('summaryCardsSection').style.display = 'none';
    document.getElementById('insightsPanel').style.display = 'none';
    document.getElementById('quickFiltersSection').style.display = 'none';
    
    // Analyze all data sources for week-over-week changes
    const allChanges = [];
    
    // Data sources to analyze
    const sourcesToAnalyze = [
        'Doxy Visits',
        'Gusto Hours ',
        'Doxy - Over 20 minutes',
        'Oncehub Report - Number of Visi'
    ];
    
    sourcesToAnalyze.forEach(sourceName => {
        if (!allData[sourceName]) return;
        
        const data = allData[sourceName].filter(row => {
            const firstValue = Object.values(row)[0];
            return firstValue && 
                   firstValue !== 'Total' && 
                   firstValue !== 'Provider' &&
                   !String(firstValue).toLowerCase().includes('total');
        });
        
        if (data.length === 0) return;
        
        const columns = Object.keys(data[0]);
        const providerCol = columns[0];
        
        // Find week columns
        const weekCols = columns.filter(col => {
            const colStr = String(col);
            return colStr.match(/week\s+of\s+\d+\/\d+/i) || (colStr.match(/\d+\/\d+/) && colStr.includes('-') && !colStr.toLowerCase().includes('unnamed'));
        });
        
        if (weekCols.length < 2) return;
        
        // Calculate week-over-week changes for each provider
        data.forEach(row => {
            const provider = row[providerCol];
            if (!provider) return;
            
            // Compare consecutive weeks
            for (let i = 1; i < weekCols.length; i++) {
                const currentWeek = weekCols[i];
                const previousWeek = weekCols[i - 1];
                
                const currentValue = parseFloat(row[currentWeek]);
                const previousValue = parseFloat(row[previousWeek]);
                
                if (isNaN(currentValue) || isNaN(previousValue) || previousValue === 0) continue;
                
                const change = currentValue - previousValue;
                const percentChange = (change / previousValue) * 100;
                
                allChanges.push({
                    source: sourceName,
                    provider: provider,
                    previousWeek: cleanColumnName(previousWeek),
                    currentWeek: cleanColumnName(currentWeek),
                    previousValue: previousValue,
                    currentValue: currentValue,
                    change: change,
                    percentChange: percentChange,
                    absPercentChange: Math.abs(percentChange)
                });
            }
        });
    });
    
    // Sort by absolute percent change
    allChanges.sort((a, b) => b.absPercentChange - a.absPercentChange);
    
    // Get top increases and decreases
    const topIncreases = allChanges.filter(c => c.change > 0).slice(0, 20);
    const topDecreases = allChanges.filter(c => c.change < 0).slice(0, 20);
    
    // Build HTML
    let html = `
        <div class="weekly-changes-container">
            <div class="weekly-changes-header">
                <h2>📊 Weekly Changes Analysis</h2>
                <p>Most significant week-over-week changes across all data sources</p>
            </div>
            
            <div class="changes-summary">
                <div class="summary-stat">
                    <div class="stat-icon">📈</div>
                    <div class="stat-value">${topIncreases.length}</div>
                    <div class="stat-label">Significant Increases</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-icon">📉</div>
                    <div class="stat-value">${topDecreases.length}</div>
                    <div class="stat-label">Significant Decreases</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-icon">🔄</div>
                    <div class="stat-value">${allChanges.length}</div>
                    <div class="stat-label">Total Changes Tracked</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-icon">📋</div>
                    <div class="stat-value">${sourcesToAnalyze.length}</div>
                    <div class="stat-label">Data Sources Analyzed</div>
                </div>
            </div>
            
            <div class="changes-grid">
                <div class="changes-section increases">
                    <h3>📈 Top 20 Increases</h3>
                    <div class="changes-list">
                        ${topIncreases.map((change, index) => `
                            <div class="change-item increase">
                                <div class="change-rank">${index + 1}</div>
                                <div class="change-details">
                                    <div class="change-provider">${escapeHtml(change.provider)}</div>
                                    <div class="change-source">${change.source}</div>
                                    <div class="change-period">${change.previousWeek} → ${change.currentWeek}</div>
                                </div>
                                <div class="change-values">
                                    <div class="change-arrow">↑</div>
                                    <div class="change-numbers">
                                        <div class="change-percent">+${change.percentChange.toFixed(1)}%</div>
                                        <div class="change-absolute">${change.previousValue.toFixed(1)} → ${change.currentValue.toFixed(1)}</div>
                                        <div class="change-diff">+${change.change.toFixed(1)}</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="changes-section decreases">
                    <h3>📉 Top 20 Decreases</h3>
                    <div class="changes-list">
                        ${topDecreases.map((change, index) => `
                            <div class="change-item decrease">
                                <div class="change-rank">${index + 1}</div>
                                <div class="change-details">
                                    <div class="change-provider">${escapeHtml(change.provider)}</div>
                                    <div class="change-source">${change.source}</div>
                                    <div class="change-period">${change.previousWeek} → ${change.currentWeek}</div>
                                </div>
                                <div class="change-values">
                                    <div class="change-arrow">↓</div>
                                    <div class="change-numbers">
                                        <div class="change-percent">${change.percentChange.toFixed(1)}%</div>
                                        <div class="change-absolute">${change.previousValue.toFixed(1)} → ${change.currentValue.toFixed(1)}</div>
                                        <div class="change-diff">${change.change.toFixed(1)}</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const tableWrapper = document.getElementById('tableWrapper');
    if (tableWrapper) {
        tableWrapper.innerHTML = html;
    }
}

// Helper function to calculate standard deviation
function calculateStdDev(values) {
    if (values.length === 0) return 0;
    const validValues = values.filter(v => !isNaN(v) && v !== null);
    if (validValues.length === 0) return 0;
    
    const mean = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
    const squaredDiffs = validValues.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / validValues.length;
    return Math.sqrt(variance);
}

// Generate weekly averages display
function generateWeeklyAverages(data, columns, tabName) {
    const weekCols = columns.filter(col => {
        const colStr = String(col);
        return colStr.match(/week\s+of\s+\d+\/\d+/i) || (colStr.match(/\d+\/\d+/) && !colStr.toLowerCase().includes('unnamed'));
    });
    
    if (weekCols.length === 0) {
        document.getElementById('weeklyAveragesSection').style.display = 'none';
        return;
    }
    
    const providerCol = columns[0];
    const validData = data.filter(row => {
        const provider = row[providerCol];
        return provider && 
               provider !== 'Provider' && 
               provider !== 'provider' &&
               !String(provider).toLowerCase().includes('total');
    });
    
    if (validData.length === 0) {
        document.getElementById('weeklyAveragesSection').style.display = 'none';
        return;
    }
    
    // Calculate average for each week
    const weeklyStats = weekCols.map((col, index) => {
        const weekTotal = validData.reduce((sum, row) => {
            const val = parseFloat(row[col]);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
        
        const average = validData.length > 0 ? (weekTotal / validData.length) : 0;
        
        // Calculate change from previous week
        let change = 0;
        let changePercent = 0;
        if (index > 0) {
            const prevCol = weekCols[index - 1];
            const prevTotal = validData.reduce((sum, row) => {
                const val = parseFloat(row[prevCol]);
                return sum + (isNaN(val) ? 0 : val);
            }, 0);
            const prevAverage = validData.length > 0 ? (prevTotal / validData.length) : 0;
            change = average - prevAverage;
            changePercent = prevAverage > 0 ? ((change / prevAverage) * 100) : 0;
        }
        
        // Extract week date for display
        const weekMatch = String(col).match(/(\d+\/\d+)/);
        const weekLabel = weekMatch ? weekMatch[1] : col;
        
        return {
            column: col,
            weekLabel,
            total: weekTotal,
            average: average,
            change: change,
            changePercent: changePercent,
            isFirst: index === 0,
            isLast: index === weekCols.length - 1
        };
    });
    
    // Generate HTML with detailed context
    const gridHTML = weeklyStats.map((week, idx) => {
        const trendClass = week.change > 0 ? 'positive' : week.change < 0 ? 'negative' : 'neutral';
        const trendArrow = week.change > 0 ? '↑' : week.change < 0 ? '↓' : '→';
        const badge = week.isLast ? '<span class="week-badge current">Current</span>' : '';
        
        const avgTooltip = `Week of ${week.weekLabel} - Detailed Breakdown\n` +
            `Average per provider: ${week.average.toFixed(2)}\n` +
            `Calculation: ${week.total.toLocaleString()} total visits ÷ ${validData.length} providers\n` +
            `Highest provider: ${Math.max(...validData.map(r => parseFloat(r[week.column]) || 0)).toFixed(0)} visits\n` +
            `Lowest provider: ${Math.min(...validData.map(r => parseFloat(r[week.column]) || 0).filter(v => v > 0)).toFixed(0)} visits\n` +
            `Standard deviation: ${calculateStdDev(validData.map(r => parseFloat(r[week.column]) || 0)).toFixed(2)}`;
        
        const changeTooltip = !week.isFirst ? 
            `Week-over-Week Change\n` +
            `Change from previous week: ${week.change > 0 ? '+' : ''}${week.change.toFixed(2)}\n` +
            `Percentage change: ${week.changePercent > 0 ? '+' : ''}${week.changePercent.toFixed(2)}%\n` +
            `Previous week avg: ${weeklyStats[idx - 1].average.toFixed(2)}\n` +
            `This week avg: ${week.average.toFixed(2)}\n` +
            `${week.change > 0 ? 'Performance improved' : week.change < 0 ? 'Performance declined' : 'Performance stable'} compared to last week` : 
            'First week in dataset - no comparison available';
        
        return `
            <div class="weekly-avg-card ${week.isLast ? 'current-week' : ''}" 
                 title="${avgTooltip}">
                <div class="week-label">
                    <span class="week-date" title="Week starting ${week.weekLabel}">Week of ${week.weekLabel}</span>
                    ${badge}
                </div>
                <div class="week-average" title="${avgTooltip}">${week.average.toFixed(1)}</div>
                <div class="week-subtitle" title="Average visits per provider for this week">avg per provider</div>
                ${!week.isFirst ? `
                    <div class="week-change ${trendClass}" title="${changeTooltip}">
                        <span class="change-arrow">${trendArrow}</span>
                        <span class="change-value">${Math.abs(week.change).toFixed(1)}</span>
                        <span class="change-percent">(${Math.abs(week.changePercent).toFixed(1)}%)</span>
                    </div>
                ` : `<div class="week-change neutral" title="${changeTooltip}"><span class="change-value">First week</span></div>`}
                <div class="week-total" title="Combined visits from all ${validData.length} providers">Total: ${week.total.toLocaleString()}</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('weeklyAveragesGrid').innerHTML = gridHTML;
    document.getElementById('weeklyAveragesSection').style.display = 'block';
}

// View mode switching
let currentViewMode = 'actual';
const weeklyGoal = 50; // Default goal per provider

function switchViewMode(mode) {
    currentViewMode = mode;
    
    // Update button states
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-mode') === mode) {
            btn.classList.add('active');
        }
    });
    
    // Reload table with new view
    loadTab(currentTab);
}

// Enhance table readability with column highlighting
function enhanceTableReadability() {
    const table = document.querySelector('table');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    const headerCells = table.querySelectorAll('thead th');
    
    // Add column hover effects
    headerCells.forEach((th, colIndex) => {
        th.addEventListener('mouseenter', () => {
            highlightColumn(colIndex, true);
        });
        
        th.addEventListener('mouseleave', () => {
            highlightColumn(colIndex, false);
        });
    });
    
    // Highlight column on cell hover
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, colIndex) => {
            cell.addEventListener('mouseenter', () => {
                highlightColumn(colIndex, true);
                showQuickTooltip(cell, colIndex);
            });
            
            cell.addEventListener('mouseleave', () => {
                highlightColumn(colIndex, false);
                hideQuickTooltip();
            });
        });
    });
}

// Quick tooltip on hover
let tooltipTimeout;
function showQuickTooltip(cell, colIndex) {
    const dataValue = cell.getAttribute('data-value');
    if (!dataValue) return;
    
    clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => {
        const value = parseFloat(dataValue);
        const goal = weeklyGoal;
        const percentOfGoal = ((value / goal) * 100).toFixed(1);
        
        // Get column average
        const table = cell.closest('table');
        const colCells = Array.from(table.querySelectorAll(`tbody td:nth-child(${colIndex + 1})`));
        const colValues = colCells.map(c => parseFloat(c.getAttribute('data-value')) || 0).filter(v => v > 0);
        const colAverage = colValues.length > 0 ? (colValues.reduce((a, b) => a + b, 0) / colValues.length).toFixed(1) : 0;
        
        const tooltip = document.createElement('div');
        tooltip.className = 'quick-tooltip';
        tooltip.innerHTML = `
            <div><strong>${value}</strong> visits</div>
            <div>${percentOfGoal}% of goal (${goal})</div>
            <div>Column avg: ${colAverage}</div>
            ${value > colAverage ? '<div class="positive">↑ Above average</div>' : '<div class="negative">↓ Below average</div>'}
        `;
        
        const rect = cell.getBoundingClientRect();
        tooltip.style.position = 'fixed';
        tooltip.style.top = `${rect.top - 10}px`;
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.transform = 'translate(-50%, -100%)';
        
        document.body.appendChild(tooltip);
    }, 500);
}

function hideQuickTooltip() {
    clearTimeout(tooltipTimeout);
    const tooltip = document.querySelector('.quick-tooltip');
    if (tooltip) tooltip.remove();
}

// Row actions menu
function toggleRowActions(btn) {
    const dropdown = btn.nextElementSibling;
    const allDropdowns = document.querySelectorAll('.actions-dropdown');
    
    // Close all other dropdowns
    allDropdowns.forEach(d => {
        if (d !== dropdown) d.classList.remove('show');
    });
    
    dropdown.classList.toggle('show');
    
    // Close on outside click
    document.addEventListener('click', function closeDropdown(e) {
        if (!e.target.closest('.actions-menu')) {
            dropdown.classList.remove('show');
            document.removeEventListener('click', closeDropdown);
        }
    });
}

function exportRowData(btn) {
    const row = btn.closest('tr');
    const cells = row.querySelectorAll('td');
    const headers = Array.from(document.querySelectorAll('thead th')).map(th => th.textContent);
    
    let csvContent = headers.slice(0, -1).join(',') + '\n';
    csvContent += Array.from(cells).slice(0, -1).map(cell => {
        const text = cell.textContent.trim();
        return text.includes(',') ? `"${text}"` : text;
    }).join(',');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `row-data-${Date.now()}.csv`;
    a.click();
    
    showNotification('✅ Row exported successfully!');
}

function addRowNote(btn) {
    const note = prompt('Add a note for this row:');
    if (note) {
        // Store note (in real app, would save to database)
        showNotification('📝 Note saved!');
    }
}

function compareRow(btn) {
    const row = btn.closest('tr');
    const providerCell = row.querySelector('td:first-child');
    const providerName = providerCell.textContent.trim().replace(/[^a-zA-Z0-9\s]/g, '');
    
    openProviderModal(providerName);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function highlightColumn(colIndex, highlight) {
    const table = document.querySelector('table');
    if (!table) return;
    
    // Highlight header
    const headerCell = table.querySelector(`thead th:nth-child(${colIndex + 1})`);
    if (headerCell) {
        if (highlight) {
            headerCell.classList.add('col-highlight');
        } else {
            headerCell.classList.remove('col-highlight');
        }
    }
    
    // Highlight all cells in column
    const cells = table.querySelectorAll(`tbody td:nth-child(${colIndex + 1})`);
    cells.forEach(cell => {
        if (highlight) {
            cell.classList.add('col-highlight');
        } else {
            cell.classList.remove('col-highlight');
        }
    });
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

// Monthly Summary Update
function updateMonthlySummary(data, columns, tabName) {
    console.log('Calculating monthly summary for:', tabName);
    
    // Filter out header and total rows
    const validData = data.filter(row => {
        const firstCol = row[columns[0]];
        return firstCol && 
               firstCol !== 'Provider' && 
               firstCol !== 'provider' &&
               !String(firstCol).toLowerCase().includes('total') &&
               !String(firstCol).toLowerCase().includes('grand total');
    });
    
    // Get all week columns
    const weekCols = columns.filter(col => {
        const colStr = String(col);
        return colStr.match(/week\s+of\s+\d+\/\d+/i) || (colStr.match(/\d+\/\d+/) && !colStr.toLowerCase().includes('unnamed'));
    });
    
    console.log('Week columns for monthly calc:', weekCols);
    
    if (weekCols.length === 0) {
        document.getElementById('monthlySummary').style.display = 'none';
        return;
    }
    
    // Calculate totals for each week
    const weeklyTotals = weekCols.map(col => {
        return validData.reduce((sum, row) => {
            const val = parseFloat(row[col]);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
    });
    
    // Monthly calculations
    const monthlyTotal = weeklyTotals.reduce((sum, val) => sum + val, 0);
    const weeklyAverage = weekCols.length > 0 ? (monthlyTotal / weekCols.length) : 0;
    const activeProviders = validData.length;
    const monthlyProviderAvg = activeProviders > 0 ? (monthlyTotal / activeProviders) : 0;
    
    // Calculate trend (comparing first half vs second half of weeks)
    const midpoint = Math.floor(weeklyTotals.length / 2);
    const firstHalfAvg = weeklyTotals.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
    const secondHalfAvg = weeklyTotals.slice(midpoint).reduce((a, b) => a + b, 0) / (weeklyTotals.length - midpoint);
    const trendPercent = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100) : 0;
    
    // Project end of month (assuming 4 weeks per month)
    const weeksInMonth = 4;
    const monthlyProjection = weeklyAverage * weeksInMonth;
    const weeksRemaining = weeksInMonth - weekCols.length;
    
    // Extract month from week columns
    const firstWeek = weekCols[0];
    const monthMatch = String(firstWeek).match(/(\d+)\/(\d+)/);
    let monthName = 'This Month';
    if (monthMatch) {
        const month = parseInt(monthMatch[1]);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthName = monthNames[month - 1] || 'This Month';
    }
    
    // Update display with detailed context
    document.getElementById('monthPeriod').textContent = `${monthName} • ${weekCols.length} week${weekCols.length > 1 ? 's' : ''} of data`;
    document.getElementById('monthPeriod').setAttribute('title', 
        `Data range: ${weekCols[0].match(/(\d+\/\d+)/)?.[0]} to ${weekCols[weekCols.length - 1].match(/(\d+\/\d+)/)?.[0]}\n` +
        `${weekCols.length} week${weekCols.length > 1 ? 's' : ''} included in this calculation`
    );
    
    document.getElementById('monthlyTotal').textContent = monthlyTotal.toLocaleString();
    document.getElementById('monthlyTotal').setAttribute('title', 
        `Total across all ${activeProviders} provider${activeProviders !== 1 ? 's' : ''} for ${weekCols.length} week${weekCols.length !== 1 ? 's' : ''}\n` +
        `Week breakdown:\n${weeklyTotals.map((val, i) => 
            `Week ${i + 1} (${weekCols[i].match(/(\d+\/\d+)/)?.[0]}): ${val.toFixed(0)}`
        ).join('\n')}`
    );
    document.getElementById('monthlyWeeks').textContent = `From ${weekCols.length} week${weekCols.length > 1 ? 's' : ''}`;
    
    document.getElementById('weeklyAverage').textContent = weeklyAverage.toFixed(1);
    document.getElementById('weeklyAverage').setAttribute('title', 
        `Average visits per week: ${weeklyAverage.toFixed(1)}\n` +
        `Calculated from ${monthlyTotal.toLocaleString()} total visits ÷ ${weekCols.length} weeks\n` +
        `Highest week: ${Math.max(...weeklyTotals).toFixed(0)}\n` +
        `Lowest week: ${Math.min(...weeklyTotals).toFixed(0)}\n` +
        `Range: ${(Math.max(...weeklyTotals) - Math.min(...weeklyTotals)).toFixed(0)}`
    );
    const trendArrow = trendPercent > 0 ? '↗' : trendPercent < 0 ? '↘' : '→';
    const trendClass = trendPercent > 0 ? 'positive' : trendPercent < 0 ? 'negative' : 'neutral';
    document.getElementById('weeklyTrend').innerHTML = `<span class="${trendClass}">${trendArrow} ${Math.abs(trendPercent).toFixed(1)}% trend</span>`;
    document.getElementById('weeklyTrend').setAttribute('title', 
        `Trend calculation: Comparing first half vs second half of weeks\n` +
        `First half average: ${firstHalfAvg.toFixed(1)}\n` +
        `Second half average: ${secondHalfAvg.toFixed(1)}\n` +
        `${trendPercent > 0 ? 'Positive' : trendPercent < 0 ? 'Negative' : 'Neutral'} trend indicates performance is ${trendPercent > 0 ? 'improving' : trendPercent < 0 ? 'declining' : 'stable'}`
    );
    
    document.getElementById('monthlyProviderAvg').textContent = monthlyProviderAvg.toFixed(1);
    document.getElementById('monthlyProviderAvg').setAttribute('title', 
        `Average visits per provider for the entire month\n` +
        `${monthlyTotal.toLocaleString()} total visits ÷ ${activeProviders} provider${activeProviders !== 1 ? 's' : ''}\n` +
        `This represents the typical performance of each provider\n` +
        `Weekly average per provider: ${(weeklyAverage / activeProviders).toFixed(2)}`
    );
    document.getElementById('providerCount').textContent = `${activeProviders} active provider${activeProviders > 1 ? 's' : ''}`;
    
    document.getElementById('monthlyProjection').textContent = monthlyProjection.toFixed(0);
    document.getElementById('monthlyProjection').setAttribute('title', 
        weeksRemaining > 0 ?
        `4-week month projection based on current average\n` +
        `Current data: ${weekCols.length} week${weekCols.length !== 1 ? 's' : ''} = ${monthlyTotal.toLocaleString()} visits\n` +
        `Weekly average: ${weeklyAverage.toFixed(1)}\n` +
        `Projected full month: ${weeklyAverage.toFixed(1)} × 4 weeks = ${monthlyProjection.toFixed(0)}\n` +
        `Remaining weeks to reach projection: ${weeksRemaining}` :
        `Full 4-week month data captured\n` +
        `Total: ${monthlyTotal.toLocaleString()} visits\n` +
        `This is the complete month total, not a projection`
    );
    if (weeksRemaining > 0) {
        document.getElementById('projectionDetail').textContent = `Based on ${weekCols.length} weeks, ${weeksRemaining} to go`;
    } else {
        document.getElementById('projectionDetail').textContent = `Full month captured`;
    }
    
    // Show the monthly summary
    document.getElementById('monthlySummary').style.display = 'block';
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
    
    // Calculate average per provider
    const activeProvidersCount = validData.length;
    const averageVisits = activeProvidersCount > 0 ? (totalVisits / activeProvidersCount) : 0;
    const previousAverage = activeProvidersCount > 0 ? (previousVisits / activeProvidersCount) : 0;
    
    // Update Total Visits card with context
    const currentWeekLabel = weekCols.length > 0 ? weekCols[weekCols.length - 1].match(/(\d+\/\d+)/)?.[0] : 'Current';
    const prevWeekLabel = weekCols.length > 1 ? weekCols[weekCols.length - 2].match(/(\d+\/\d+)/)?.[0] : 'Previous';
    
    document.getElementById('totalVisitsValue').textContent = totalVisits.toLocaleString();
    document.getElementById('totalVisitsValue').setAttribute('title', 
        `Total visits for week of ${currentWeekLabel}\n` +
        `Based on ${activeProvidersCount} active provider${activeProvidersCount !== 1 ? 's' : ''}\n` +
        `Average per provider: ${averageVisits.toFixed(1)}`
    );
    
    const totalChangeEl = document.getElementById('totalVisitsChange');
    if (previousVisits > 0) {
        const changePercent = ((totalVisits - previousVisits) / previousVisits * 100).toFixed(1);
        const changeValue = totalVisits - previousVisits;
        const changeText = changeValue > 0 ? `+${changeValue}` : `${changeValue}`;
        const avgChange = averageVisits - previousAverage;
        const avgChangeText = avgChange > 0 ? `+${avgChange.toFixed(1)}` : `${avgChange.toFixed(1)}`;
        
        if (changeValue > 0) {
            totalChangeEl.innerHTML = `
                <span class="positive" title="Increased by ${changeValue} visits (${changePercent}%) compared to ${prevWeekLabel}">
                    ↑ ${changePercent}% (${changeText})
                </span>
                <span class="card-subtext" title="Average visits per provider this week vs last week">
                    Avg/provider: ${averageVisits.toFixed(1)} (${avgChangeText})
                </span>`;
            totalChangeEl.className = 'card-change positive';
        } else if (changeValue < 0) {
            totalChangeEl.innerHTML = `
                <span class="negative" title="Decreased by ${Math.abs(changeValue)} visits (${Math.abs(changePercent)}%) compared to ${prevWeekLabel}">
                    ↓ ${Math.abs(changePercent)}% (${changeText})
                </span>
                <span class="card-subtext" title="Average visits per provider this week vs last week">
                    Avg/provider: ${averageVisits.toFixed(1)} (${avgChangeText})
                </span>`;
            totalChangeEl.className = 'card-change negative';
        } else {
            totalChangeEl.innerHTML = `
                <span class="neutral" title="No change from ${prevWeekLabel}">→ No change</span>
                <span class="card-subtext" title="Average visits per provider">
                    Avg/provider: ${averageVisits.toFixed(1)}
                </span>`;
            totalChangeEl.className = 'card-change neutral';
        }
    } else {
        totalChangeEl.innerHTML = `<span class="card-subtext" title="Average visits per provider (no previous week data available)">Avg/provider: ${averageVisits.toFixed(1)}</span>`;
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
    document.getElementById('topPerformerValue').setAttribute('title', 
        topProvider ? 
        `${topProvider} had the highest number of visits this week (${currentWeekLabel})\n` +
        `Performance: ${topVisits} visits\n` +
        `${(topVisits / totalVisits * 100).toFixed(1)}% of total visits\n` +
        `${(topVisits / averageVisits).toFixed(1)}x the average provider` : 
        'No data available'
    );
    document.getElementById('topPerformerVisits').textContent = topVisits > 0 ? `${topVisits} visits` : '';
    document.getElementById('topPerformerVisits').setAttribute('title', 
        topVisits > 0 ? 
        `${topVisits} visits is ${(topVisits - averageVisits).toFixed(1)} above the average of ${averageVisits.toFixed(1)}` : 
        ''
    );
    
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
    
    const programsArray = Array.from(programs);
    document.getElementById('activeProgramsValue').textContent = programs.size || 'N/A';
    document.getElementById('activeProgramsValue').setAttribute('title', 
        programs.size > 0 ? 
        `${programs.size} unique program${programs.size !== 1 ? 's' : ''} with activity\n` +
        `Programs: ${programsArray.join(', ')}\n` +
        `Average visits per program: ${(totalVisits / programs.size).toFixed(1)}` : 
        'No program data available in this dataset'
    );
    document.getElementById('programsList').textContent = programs.size > 0 ? programsArray.slice(0, 3).join(', ') + (programs.size > 3 ? '...' : '') : '';
    document.getElementById('programsList').setAttribute('title', programsArray.join('\n'));
    
    // Count active providers
    const activeProviders = validData.length;
    document.getElementById('activeProvidersValue').textContent = activeProviders;
    document.getElementById('activeProvidersValue').setAttribute('title', 
        `${activeProviders} provider${activeProviders !== 1 ? 's' : ''} with recorded data\n` +
        `Average per provider: ${averageVisits.toFixed(1)} visits\n` +
        `Total contribution: ${totalVisits.toLocaleString()} visits\n` +
        `Highest: ${topVisits} | Lowest: ${Math.min(...validData.map(r => parseFloat(r[weekCols[weekCols.length - 1]]) || 0).filter(v => v > 0))}`
    );
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

// Open Week Detail Modal
function openWeekModal(weekColumn) {
    if (!currentData || currentData.length === 0) return;
    
    const columns = Object.keys(currentData[0]);
    const providerCol = columns[0];
    
    // Filter valid data
    const validData = currentData.filter(row => {
        const provider = row[providerCol];
        return provider && !String(provider).toLowerCase().includes('total') && !String(provider).toLowerCase().includes('provider');
    });
    
    const weekLabel = cleanColumnName(weekColumn);
    document.getElementById('weekModalTitle').textContent = `📅 ${weekLabel}`;
    
    // Get all provider data for this week
    const weekData = validData.map(row => ({
        provider: row[providerCol],
        value: parseFloat(row[weekColumn]) || 0
    })).filter(item => item.value > 0 || item.value === 0);
    
    // Sort by value descending
    weekData.sort((a, b) => b.value - a.value);
    
    // Calculate statistics
    const total = weekData.reduce((sum, item) => sum + item.value, 0);
    const average = weekData.length > 0 ? total / weekData.length : 0;
    const highest = weekData.length > 0 ? weekData[0] : null;
    const lowest = weekData.length > 0 ? weekData[weekData.length - 1] : null;
    
    // Build HTML
    let html = '<div class="week-detail-stats">';
    
    // Summary statistics cards
    html += `
        <div class="stat-cards-grid">
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-label">Total</div>
                <div class="stat-value">${total.toLocaleString()}</div>
                <div class="stat-subtext">Combined from all providers</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📈</div>
                <div class="stat-label">Average</div>
                <div class="stat-value">${average.toFixed(1)}</div>
                <div class="stat-subtext">Per provider</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-label">Active Providers</div>
                <div class="stat-value">${weekData.length}</div>
                <div class="stat-subtext">With recorded data</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🏆</div>
                <div class="stat-label">Top Performer</div>
                <div class="stat-value">${highest ? highest.provider : 'N/A'}</div>
                <div class="stat-subtext">${highest ? highest.value.toLocaleString() + ' visits' : ''}</div>
            </div>
        </div>
    `;
    
    html += '</div>';
    
    // Rankings table
    html += `<div class="week-rankings">`;
    html += `<h3>Provider Rankings for ${weekLabel}</h3>`;
    html += `<table class="detail-table rankings-table">
        <thead>
            <tr>
                <th>Rank</th>
                <th>Provider</th>
                <th>Value</th>
                <th>% of Total</th>
                <th>vs Average</th>
            </tr>
        </thead>
        <tbody>`;
    
    weekData.forEach((item, index) => {
        const percentOfTotal = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
        const vsAverage = average > 0 ? ((item.value / average) * 100).toFixed(0) : 0;
        const vsAverageClass = item.value > average ? 'positive' : item.value < average ? 'negative' : 'neutral';
        
        // Medal emojis for top 3
        let rankDisplay = index + 1;
        if (index === 0) rankDisplay = '🥇';
        else if (index === 1) rankDisplay = '🥈';
        else if (index === 2) rankDisplay = '🥉';
        
        html += `
            <tr>
                <td class="rank-cell">${rankDisplay}</td>
                <td class="provider-cell">${escapeHtml(item.provider)}</td>
                <td class="number">${item.value.toLocaleString()}</td>
                <td class="number">${percentOfTotal}%</td>
                <td class="number ${vsAverageClass}">${vsAverage}%</td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    
    // Distribution chart area
    html += `<div class="week-distribution">`;
    html += `<h3>Distribution Analysis</h3>`;
    html += `<div class="distribution-bars">`;
    
    // Group providers into performance tiers
    const excellent = weekData.filter(item => item.value >= average * 1.2).length;
    const good = weekData.filter(item => item.value >= average && item.value < average * 1.2).length;
    const belowAverage = weekData.filter(item => item.value < average && item.value > 0).length;
    const noActivity = weekData.filter(item => item.value === 0).length;
    
    html += `
        <div class="distribution-item">
            <div class="distribution-label">Excellent (≥120% of avg)</div>
            <div class="distribution-bar">
                <div class="distribution-fill excellent" style="width: ${(excellent / weekData.length * 100)}%"></div>
            </div>
            <div class="distribution-count">${excellent} providers</div>
        </div>
        <div class="distribution-item">
            <div class="distribution-label">Good (100-119% of avg)</div>
            <div class="distribution-bar">
                <div class="distribution-fill good" style="width: ${(good / weekData.length * 100)}%"></div>
            </div>
            <div class="distribution-count">${good} providers</div>
        </div>
        <div class="distribution-item">
            <div class="distribution-label">Below Average (<100% of avg)</div>
            <div class="distribution-bar">
                <div class="distribution-fill below" style="width: ${(belowAverage / weekData.length * 100)}%"></div>
            </div>
            <div class="distribution-count">${belowAverage} providers</div>
        </div>
        ${noActivity > 0 ? `
        <div class="distribution-item">
            <div class="distribution-label">No Activity</div>
            <div class="distribution-bar">
                <div class="distribution-fill none" style="width: ${(noActivity / weekData.length * 100)}%"></div>
            </div>
            <div class="distribution-count">${noActivity} providers</div>
        </div>
        ` : ''}
    `;
    
    html += `</div></div>`;
    
    document.getElementById('weekContent').innerHTML = html;
    openModal('weekModal');
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
// Handle horizontal scroll shadows for table
function updateScrollShadows() {
    const tableWrapper = document.getElementById('tableWrapper');
    if (!tableWrapper) return;
    
    const scrollLeft = tableWrapper.scrollLeft;
    const scrollWidth = tableWrapper.scrollWidth;
    const clientWidth = tableWrapper.clientWidth;
    const maxScroll = scrollWidth - clientWidth;
    
    // Remove all scroll classes
    tableWrapper.classList.remove('scrolled-left', 'scrolled-right', 'scrolled-middle');
    
    // Add appropriate classes based on scroll position
    if (scrollLeft <= 5) {
        // At the left edge
        tableWrapper.classList.add('scrolled-left');
    } else if (scrollLeft >= maxScroll - 5) {
        // At the right edge
        tableWrapper.classList.add('scrolled-right');
    } else {
        // In the middle
        tableWrapper.classList.add('scrolled-middle');
    }
}

// Setup scroll listener for table
function setupTableScrollListener() {
    const tableWrapper = document.getElementById('tableWrapper');
    if (tableWrapper) {
        tableWrapper.addEventListener('scroll', updateScrollShadows);
        // Initial update
        setTimeout(updateScrollShadows, 100);
    }
}

document.addEventListener('DOMContentLoaded', init);

