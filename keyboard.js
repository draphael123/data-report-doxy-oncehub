// Keyboard Shortcuts Manager
const KeyboardManager = {
    shortcuts: {
        'd': () => ThemeManager.toggleDarkMode(),
        'e': () => openModal('exportModal'),
        's': () => openModal('settingsModal'),
        '?': () => openModal('helpModal'),
        '/': () => document.getElementById('searchInput').focus(),
        'Escape': () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        },
        '1': () => switchToTab(0),
        '2': () => switchToTab(1),
        '3': () => switchToTab(2),
        '4': () => switchToTab(3),
        '5': () => switchToTab(4),
        '6': () => switchToTab(5),
        '7': () => switchToTab(6),
        '8': () => switchToTab(7),
        '9': () => switchToTab(8),
        'ArrowLeft': () => navigateTab(-1),
        'ArrowRight': () => navigateTab(1),
        'c': () => ComparisonManager.toggleComparisonMode(),
        'f': () => openFilters(),
        'r': () => location.reload()
    },
    
    init() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                if (e.key !== 'Escape') return;
            }
            
            // Handle Ctrl/Cmd + key combinations
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'p') {
                    e.preventDefault();
                    window.print();
                }
                if (e.key === 'k') {
                    e.preventDefault();
                    document.getElementById('searchInput').focus();
                }
                return;
            }
            
            // Handle single key shortcuts
            const handler = this.shortcuts[e.key];
            if (handler) {
                e.preventDefault();
                handler();
            }
        });
        
        // Set up button event listeners
        this.setupButtons();
    },
    
    setupButtons() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => ThemeManager.toggleDarkMode());
        }
        
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => ThemeManager.applyTheme(e.target.value));
        }
        
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => openModal('exportModal'));
        }
        
        const helpBtn = document.getElementById('helpBtn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => openModal('helpModal'));
        }
        
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => openModal('settingsModal'));
        }
        
        // FAB menu
        const fabMain = document.getElementById('fabMain');
        const fabMenu = document.getElementById('fabMenu');
        if (fabMain && fabMenu) {
            fabMain.addEventListener('click', () => {
                fabMenu.classList.toggle('active');
                fabMain.classList.toggle('active');
            });
        }
    }
};

function switchToTab(index) {
    const tabs = document.querySelectorAll('.tab-button');
    if (tabs[index]) {
        tabs[index].click();
    }
}

function navigateTab(direction) {
    const tabs = Array.from(document.querySelectorAll('.tab-button'));
    const activeIndex = tabs.findIndex(tab => tab.classList.contains('active'));
    let newIndex = activeIndex + direction;
    
    if (newIndex < 0) newIndex = tabs.length - 1;
    if (newIndex >= tabs.length) newIndex = 0;
    
    tabs[newIndex].click();
}

function openFilters() {
    // Toggle advanced filters panel
    const filtersPanel = document.getElementById('advancedFilters');
    if (filtersPanel) {
        filtersPanel.classList.toggle('visible');
    }
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => KeyboardManager.init());
} else {
    KeyboardManager.init();
}


