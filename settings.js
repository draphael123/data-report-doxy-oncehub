// Settings Manager
const SettingsManager = {
    settings: {
        density: 'comfortable',
        animations: true,
        autoRefresh: false,
        rowsPerPage: 100,
        favorites: [],
        filterPresets: {}
    },
    
    init() {
        // Load saved settings
        const saved = localStorage.getItem('dashboard-settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        this.applySettings();
    },
    
    save() {
        localStorage.setItem('dashboard-settings', JSON.stringify(this.settings));
    },
    
    setDensity(density) {
        this.settings.density = density;
        document.body.className = document.body.className.replace(/density-\w+/g, '');
        document.body.classList.add(`density-${density}`);
        this.save();
    },
    
    toggleAnimations(enabled) {
        this.settings.animations = enabled;
        if (enabled) {
            document.body.classList.remove('no-animations');
        } else {
            document.body.classList.add('no-animations');
        }
        this.save();
    },
    
    toggleAutoRefresh(enabled) {
        this.settings.autoRefresh = enabled;
        this.save();
        
        if (enabled) {
            // Auto-refresh every 5 minutes
            this.refreshInterval = setInterval(() => {
                location.reload();
            }, 5 * 60 * 1000);
            showNotification('✅ Auto-refresh enabled (every 5 minutes)');
        } else {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
            showNotification('Auto-refresh disabled');
        }
    },
    
    setRowsPerPage(rows) {
        this.settings.rowsPerPage = parseInt(rows);
        this.save();
        // Trigger table re-render if needed
        if (typeof renderTable === 'function') {
            renderTable(filteredData);
        }
    },
    
    toggleFavorite(tabName) {
        const index = this.settings.favorites.indexOf(tabName);
        if (index > -1) {
            this.settings.favorites.splice(index, 1);
        } else {
            this.settings.favorites.push(tabName);
        }
        this.save();
        this.updateFavoritesUI();
    },
    
    isFavorite(tabName) {
        return this.settings.favorites.includes(tabName);
    },
    
    updateFavoritesUI() {
        // Update star icons on tabs
        document.querySelectorAll('.tab-button').forEach(btn => {
            const tabName = btn.dataset.tab;
            const star = btn.querySelector('.favorite-star');
            if (this.isFavorite(tabName)) {
                if (!star) {
                    const span = document.createElement('span');
                    span.className = 'favorite-star';
                    span.textContent = '⭐';
                    btn.insertBefore(span, btn.firstChild);
                }
            } else {
                if (star) star.remove();
            }
        });
    },
    
    saveFilterPreset(name) {
        this.settings.filterPresets[name] = {
            tab: currentTab,
            search: document.getElementById('searchInput').value,
            timestamp: new Date().toISOString()
        };
        this.save();
        showNotification(`✅ Filter preset "${name}" saved`);
    },
    
    loadFilterPreset(name) {
        const preset = this.settings.filterPresets[name];
        if (preset) {
            // Switch to tab
            const tabBtn = document.querySelector(`.tab-button[data-tab="${preset.tab}"]`);
            if (tabBtn) tabBtn.click();
            
            // Apply search
            document.getElementById('searchInput').value = preset.search;
            document.getElementById('searchInput').dispatchEvent(new Event('input'));
            
            showNotification(`✅ Filter preset "${name}" loaded`);
        }
    },
    
    deleteFilterPreset(name) {
        delete this.settings.filterPresets[name];
        this.save();
        showNotification(`Filter preset "${name}" deleted`);
    },
    
    applySettings() {
        this.setDensity(this.settings.density);
        this.toggleAnimations(this.settings.animations);
        
        // Update UI controls
        const densityRadio = document.querySelector(`input[name="density"][value="${this.settings.density}"]`);
        if (densityRadio) densityRadio.checked = true;
        
        const animToggle = document.getElementById('animationsToggle');
        if (animToggle) animToggle.checked = this.settings.animations;
        
        const refreshToggle = document.getElementById('autoRefreshToggle');
        if (refreshToggle) refreshToggle.checked = this.settings.autoRefresh;
        
        const rowsSelect = document.getElementById('rowsPerPage');
        if (rowsSelect) rowsSelect.value = this.settings.rowsPerPage;
        
        if (this.settings.autoRefresh) {
            this.toggleAutoRefresh(true);
        }
    }
};

// Comparison Manager
const ComparisonManager = {
    comparisonMode: false,
    selectedItems: [],
    
    toggleComparisonMode() {
        this.comparisonMode = !this.comparisonMode;
        document.body.classList.toggle('comparison-mode', this.comparisonMode);
        
        if (this.comparisonMode) {
            showNotification('✅ Comparison mode enabled. Click rows to compare.');
        } else {
            this.clearComparison();
            showNotification('Comparison mode disabled.');
        }
    },
    
    addToComparison(data, identifier) {
        if (!this.comparisonMode) return;
        
        const index = this.selectedItems.findIndex(item => item.id === identifier);
        if (index > -1) {
            this.selectedItems.splice(index, 1);
        } else {
            this.selectedItems.push({ id: identifier, data });
        }
        
        this.updateComparisonUI();
    },
    
    clearComparison() {
        this.selectedItems = [];
        this.updateComparisonUI();
    },
    
    updateComparisonUI() {
        // Highlight selected rows
        document.querySelectorAll('tbody tr').forEach(tr => {
            tr.classList.remove('selected-for-comparison');
        });
        
        // Show comparison panel
        if (this.selectedItems.length > 0) {
            const panel = document.getElementById('comparisonPanel');
            if (panel) {
                panel.innerHTML = `
                    <h3>Comparing ${this.selectedItems.length} item(s)</h3>
                    <button onclick="ComparisonManager.showComparison()">View Comparison</button>
                    <button onclick="ComparisonManager.clearComparison()">Clear</button>
                `;
                panel.style.display = 'block';
            }
        }
    },
    
    showComparison() {
        if (this.selectedItems.length < 2) {
            showNotification('⚠️ Select at least 2 items to compare', 'warning');
            return;
        }
        
        // Create comparison view
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2>📊 Comparison View</h2>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="comparison-grid">
                        ${this.selectedItems.map(item => this.renderComparisonCard(item)).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    renderComparisonCard(item) {
        const data = item.data;
        return `
            <div class="comparison-card">
                <h3>${data.Provider || data['Unnamed: 0'] || 'Item'}</h3>
                ${Object.entries(data).map(([key, value]) => `
                    <div class="comparison-row">
                        <span class="comparison-label">${cleanColumnName(key)}:</span>
                        <span class="comparison-value">${value || 'N/A'}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
};

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SettingsManager.init());
} else {
    SettingsManager.init();
}


