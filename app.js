// Language support
const translations = {
    en: {
        'main-title': 'Digital Learning Platform',
        'welcome-text': 'Welcome to Digital Learning',
        'description': 'Learn digital skills offline. Perfect for rural schools in Nabha.',
        'login-btn': 'Login / Register',
        'install-btn': 'Install App',
        'offline-title': '📱 Works Offline',
        'offline-desc': 'Access content without internet',
        'local-lang-title': '🌐 Local Language',
        'local-lang-desc': 'Content in Punjabi and English',
        'progress-title': '📊 Track Progress',
        'progress-desc': 'Monitor learning progress'
    },
    pa: {
        'main-title': 'ਡਿਜੀਟਲ ਸਿੱਖਣ ਪਲੇਟਫਾਰਮ',
        'welcome-text': 'ਡਿਜੀਟਲ ਸਿੱਖਣ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ',
        'description': 'ਔਫਲਾਈਨ ਡਿਜੀਟਲ ਹੁਨਰ ਸਿੱਖੋ। ਨਾਭਾ ਦੇ ਪੇਂਡੂ ਸਕੂਲਾਂ ਲਈ ਸੰਪੂਰਨ।',
        'login-btn': 'ਲਾਗਇਨ / ਰਜਿਸਟਰ',
        'install-btn': 'ਐਪ ਇੰਸਟਾਲ ਕਰੋ',
        'offline-title': '📱 ਔਫਲਾਈਨ ਕੰਮ ਕਰਦਾ ਹੈ',
        'offline-desc': 'ਇੰਟਰਨੈਟ ਤੋਂ ਬਿਨਾਂ ਸਮੱਗਰੀ ਦੇਖੋ',
        'local-lang-title': '🌐 ਸਥਾਨਕ ਭਾਸ਼ਾ',
        'local-lang-desc': 'ਪੰਜਾਬੀ ਅਤੇ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਸਮੱਗਰੀ',
        'progress-title': '📊 ਤਰੱਕੀ ਟਰੈਕ ਕਰੋ',
        'progress-desc': 'ਸਿਖਲਾਈ ਦੀ ਤਰੱਕੀ ਦੀ ਨਿਗਰਾਨੀ ਕਰੋ'
    }
};

let currentLanguage = 'en';

function switchLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('preferred-language', lang);
    
    // Update all text elements
    Object.keys(translations[lang]).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            element.textContent = translations[lang][key];
        }
    });
    
    // Update HTML lang attribute
    document.documentElement.lang = lang === 'pa' ? 'pa-IN' : 'en';
}

function getCurrentLanguage() {
    return localStorage.getItem('preferred-language') || 'en';
}

// Initialize language on page load
document.addEventListener('DOMContentLoaded', function() {
    const savedLang = getCurrentLanguage();
    if (savedLang !== 'en') {
        switchLanguage(savedLang);
    }
});

// Offline detection
function updateOnlineStatus() {
    const indicator = document.querySelector('.offline-indicator');
    if (!navigator.onLine) {
        if (!indicator) {
            const offlineDiv = document.createElement('div');
            offlineDiv.className = 'offline-indicator show';
            offlineDiv.textContent = currentLanguage === 'pa' ? 
                'ਔਫਲਾਈਨ ਮੋਡ - ਸਿੰਕ ਹੋਵੇਗਾ ਜਦੋਂ ਕਨੈਕਸ਼ਨ ਵਾਪਸ ਆਵੇਗਾ' : 
                'Offline Mode - Will sync when connection returns';
            document.body.insertBefore(offlineDiv, document.body.firstChild);
        }
    } else {
        if (indicator) {
            indicator.remove();
        }
    }
}

// Listen for online/offline events
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Check initial status
updateOnlineStatus();

// Utility functions
function showLoading(element) {
    element.innerHTML = '<div class="loading"></div>';
}

function hideLoading(element, originalContent) {
    element.innerHTML = originalContent;
}

// Data management for offline storage
class DataManager {
    constructor() {
        this.dbName = 'nabha-learning-db';
        this.version = 1;
        this.db = null;
        this.init();
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('courses')) {
                    db.createObjectStore('courses', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('lessons')) {
                    db.createObjectStore('lessons', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('progress')) {
                    db.createObjectStore('progress', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('offline-queue')) {
                    db.createObjectStore('offline-queue', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }
    
    async saveOffline(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return store.put(data);
    }
    
    async getOffline(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return store.get(id);
    }
    
    async getAllOffline(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return store.getAll();
    }
    
    async queueForSync(data) {
        const transaction = this.db.transaction(['offline-queue'], 'readwrite');
        const store = transaction.objectStore('offline-queue');
        return store.add({
            data: data,
            timestamp: Date.now(),
            synced: false
        });
    }
}

// Initialize data manager
const dataManager = new DataManager();
