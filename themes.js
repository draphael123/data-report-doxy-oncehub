// Theme Management System
const ThemeManager = {
    themes: {
        light: {
            name: 'Light',
            colors: {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                surface: 'rgba(255, 255, 255, 0.95)',
                text: '#1e293b',
                textSecondary: '#64748b',
                primary: '#6366f1',
                secondary: '#10b981',
                accent: '#ec4899'
            }
        },
        dark: {
            name: 'Dark',
            colors: {
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                surface: 'rgba(30, 41, 59, 0.95)',
                text: '#f1f5f9',
                textSecondary: '#cbd5e1',
                primary: '#818cf8',
                secondary: '#34d399',
                accent: '#f472b6'
            }
        },
        midnight: {
            name: 'Midnight',
            colors: {
                background: 'linear-gradient(135deg, #000000 0%, #1a1a2e 100%)',
                surface: 'rgba(26, 26, 46, 0.95)',
                text: '#ffffff',
                textSecondary: '#a0aec0',
                primary: '#bb86fc',
                secondary: '#03dac6',
                accent: '#cf6679'
            }
        },
        ocean: {
            name: 'Ocean',
            colors: {
                background: 'linear-gradient(135deg, #0077be 0%, #004e7a 100%)',
                surface: 'rgba(255, 255, 255, 0.95)',
                text: '#1e293b',
                textSecondary: '#64748b',
                primary: '#0ea5e9',
                secondary: '#06b6d4',
                accent: '#8b5cf6'
            }
        },
        sunset: {
            name: 'Sunset',
            colors: {
                background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
                surface: 'rgba(255, 255, 255, 0.95)',
                text: '#1e293b',
                textSecondary: '#64748b',
                primary: '#f97316',
                secondary: '#eab308',
                accent: '#ec4899'
            }
        }
    },
    
    currentTheme: 'light',
    
    init() {
        // Load saved theme
        const saved = localStorage.getItem('dashboard-theme');
        if (saved && this.themes[saved]) {
            this.currentTheme = saved;
        } else {
            // Check system preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.currentTheme = 'dark';
            }
        }
        this.applyTheme(this.currentTheme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('dashboard-theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    },
    
    applyTheme(themeName) {
        if (!this.themes[themeName]) return;
        
        this.currentTheme = themeName;
        const theme = this.themes[themeName];
        const root = document.documentElement;
        
        // Apply theme colors
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--theme-${key}`, value);
        });
        
        // Apply dark mode class
        if (themeName === 'dark' || themeName === 'midnight') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Save preference
        localStorage.setItem('dashboard-theme', themeName);
        
        // Update UI
        this.updateThemeUI();
    },
    
    updateThemeUI() {
        // Update theme selector if exists
        const selector = document.getElementById('themeSelect');
        if (selector) {
            selector.value = this.currentTheme;
        }
        
        // Update theme icon
        const icon = document.getElementById('themeIcon');
        if (icon) {
            icon.textContent = this.currentTheme === 'dark' || this.currentTheme === 'midnight' ? '☀️' : '🌙';
        }
    },
    
    toggleDarkMode() {
        const newTheme = (this.currentTheme === 'light') ? 'dark' : 'light';
        this.applyTheme(newTheme);
    },
    
    getAvailableThemes() {
        return Object.keys(this.themes).map(key => ({
            id: key,
            name: this.themes[key].name
        }));
    }
};

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}


