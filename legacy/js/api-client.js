/**
 * Dr. Gopi's Clinic - Unified API Client & Offline-Fallback Bridge
 * 
 * Supports binary LONGBLOB / Base64 image encoding, CRUD operations,
 * and seamless fallback to seed data & localStorage during setup or offline demo mode.
 */

class ClinicApiClient {
    constructor() {
        this.tokenKey = 'drgopi_admin_token';
        this.cacheKeyPrefix = 'drgopi_local_data_';
        this.clearDataCache(); // Wipe stale local cache immediately on every load
    }

    // Completely clear all stored data caches from localStorage & sessionStorage
    clearDataCache() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.cacheKeyPrefix)) {
                    localStorage.removeItem(key);
                }
            });
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith(this.cacheKeyPrefix)) {
                    sessionStorage.removeItem(key);
                }
            });
        } catch (e) {
            console.warn('[ClinicApiClient] Could not clear cache:', e);
        }
    }

    getBaseUrl() {
        return window.getApiUrl();
    }

    getAdminToken() {
        return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey) || '';
    }

    setAdminToken(token, persist = true) {
        if (persist) {
            localStorage.setItem(this.tokenKey, token);
        } else {
            sessionStorage.setItem(this.tokenKey, token);
        }
    }

    clearAdminToken() {
        localStorage.removeItem(this.tokenKey);
        sessionStorage.removeItem(this.tokenKey);
    }

    isAuthenticated() {
        const token = this.getAdminToken();
        return !!token;
    }

    // Helper: Convert File object to Base64 Data URI
    static fileToBase64(file) {
        return new Promise((resolve, reject) => {
            if (!file) return resolve(null);
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve({
                dataUri: reader.result,
                mimeType: file.type || 'application/octet-stream',
                fileName: file.name,
                fileSize: file.size
            });
            reader.onerror = error => reject(error);
        });
    }

    // Core Request Handler (Always bypasses cache)
    async request(action, options = {}) {
        // Cache-buster: attach millisecond timestamp so browser/proxy never caches the response
        const cacheBuster = `_nocache=${Date.now()}`;
        const queryParams = options.params ? `${options.params}&${cacheBuster}` : cacheBuster;
        const url = `${this.getBaseUrl()}?action=${encodeURIComponent(action)}&${queryParams}`;
        
        const headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            ...(options.headers || {})
        };

        const token = this.getAdminToken();
        if (token) {
            headers['X-Admin-Token'] = token;
            headers['Authorization'] = `Bearer ${token}`;
        }

        const fetchOptions = {
            method: options.method || 'GET',
            cache: 'no-store', // Native fetch cache-bypass
            headers,
            ...(options.body ? { body: JSON.stringify(options.body) } : {})
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), options.timeout || 12000); // 12s timeout
            fetchOptions.signal = controller.signal;

            const res = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP error ${res.status}`);
            }

            const data = await res.json();
            return data;
        } catch (err) {
            // If network fails or offline, fall back to local store
            console.warn(`[ClinicApiClient] Live API request failed for action="${action}". Using fallback handler.`, err.message);
            return this.handleFallback(action, options, err);
        }
    }

    // Fallback store handler (local storage mirror of seed data)
    getLocalStore(collection) {
        const stored = localStorage.getItem(this.cacheKeyPrefix + collection);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {}
        }
        // Fallback to initial config seeds
        const seeds = window.CLINIC_CONFIG.INITIAL_SEEDS[collection] || [];
        localStorage.setItem(this.cacheKeyPrefix + collection, JSON.stringify(seeds));
        return JSON.parse(JSON.stringify(seeds));
    }

    setLocalStore(collection, data) {
        localStorage.setItem(this.cacheKeyPrefix + collection, JSON.stringify(data));
    }

    // Simulated local handler for smooth offline/static development
    async handleFallback(action, options, originalError) {
        const method = options.method || 'GET';
        const collection = action; // 'products', 'books', 'articles', 'testimonials'

        if (action === 'ping') {
            return { success: false, status: 'offline', error: originalError.message };
        }

        if (action === 'login') {
            const passcode = options.body?.passcode || '';
            if (passcode === window.CLINIC_CONFIG.DEFAULT_ADMIN_PASSCODE) {
                return { success: true, token: passcode, message: 'Authenticated in Demo/Fallback Mode' };
            }
            throw new Error('Invalid Admin Passcode (Demo Mode: DrGopi@Clinic#Admin2026!)');
        }

        if (action === 'stats') {
            const p = this.getLocalStore('products');
            const b = this.getLocalStore('books');
            const a = this.getLocalStore('articles');
            const t = this.getLocalStore('testimonials');
            return {
                success: true,
                stats: {
                    products: p.length,
                    books: b.length,
                    articles: a.length,
                    testimonials: {
                        total: t.length,
                        published: t.filter(x => x.is_published).length,
                        pending: t.filter(x => !x.is_published).length
                    }
                }
            };
        }

        if (['products', 'books', 'articles', 'testimonials'].includes(collection)) {
            const items = this.getLocalStore(collection);

            if (method === 'GET') {
                if (options.params && options.params.includes('id=')) {
                    const match = options.params.match(/id=(\d+)/);
                    const id = match ? parseInt(match[1]) : 0;
                    const item = items.find(x => x.id === id);
                    if (item) return { success: true, data: item };
                    throw new Error('Item not found in local cache');
                }
                let dataToReturn = items;
                if (collection === 'testimonials' && !this.isAuthenticated() && !options.params?.includes('all=1')) {
                    dataToReturn = items.filter(x => x.is_published);
                }
                return { success: true, data: dataToReturn, is_fallback: true };
            }

            if (method === 'POST') {
                const body = options.body || {};
                // Testimonial toggle check
                if (options.params?.includes('toggle=1') || body.action === 'toggle') {
                    const id = parseInt(options.params?.match(/id=(\d+)/)?.[1] || body.id || 0);
                    const item = items.find(x => x.id === id);
                    if (item) {
                        item.is_published = !item.is_published;
                        this.setLocalStore(collection, items);
                        return { success: true, is_published: item.is_published, message: 'Status updated locally' };
                    }
                }

                const newItem = {
                    id: Date.now(),
                    created_at: new Date().toISOString(),
                    ...body
                };
                items.unshift(newItem);
                this.setLocalStore(collection, items);
                return { success: true, id: newItem.id, message: 'Saved to local cache', data: newItem };
            }

            if (method === 'PUT') {
                const id = parseInt(options.params?.match(/id=(\d+)/)?.[1] || 0);
                const idx = items.findIndex(x => x.id === id);
                if (idx !== -1) {
                    items[idx] = { ...items[idx], ...(options.body || {}) };
                    this.setLocalStore(collection, items);
                    return { success: true, message: 'Updated in local cache' };
                }
                throw new Error('Item not found for update');
            }

            if (method === 'DELETE') {
                const id = parseInt(options.params?.match(/id=(\d+)/)?.[1] || 0);
                const filtered = items.filter(x => x.id !== id);
                this.setLocalStore(collection, filtered);
                return { success: true, message: 'Deleted from local cache' };
            }
        }

        throw originalError;
    }

    // -------------------------------------------------------------
    // Auth & Ping
    // -------------------------------------------------------------
    async ping() {
        return this.request('ping', { timeout: 4000 });
    }

    async login(passcode, rememberMe = true) {
        const res = await this.request('login', {
            method: 'POST',
            body: { passcode }
        });
        if (res.success && res.token) {
            this.setAdminToken(res.token, rememberMe);
        }
        return res;
    }

    logout() {
        this.clearAdminToken();
    }

    async getStats() {
        return this.request('stats');
    }

    async setupDatabase() {
        return this.request('setup', { method: 'POST' });
    }

    // -------------------------------------------------------------
    // Products (Module A)
    // -------------------------------------------------------------
    async getProducts() {
        const res = await this.request('products');
        return res.data || [];
    }

    async getProduct(id) {
        const res = await this.request('products', { params: `id=${id}` });
        return res.data;
    }

    async createProduct(productData) {
        return this.request('products', {
            method: 'POST',
            body: productData
        });
    }

    async updateProduct(id, productData) {
        return this.request('products', {
            method: 'PUT',
            params: `id=${id}`,
            body: productData
        });
    }

    async deleteProduct(id) {
        return this.request('products', {
            method: 'DELETE',
            params: `id=${id}`
        });
    }

    // -------------------------------------------------------------
    // Books (Module B)
    // -------------------------------------------------------------
    async getBooks() {
        const res = await this.request('books');
        return res.data || [];
    }

    async getBook(id) {
        const res = await this.request('books', { params: `id=${id}` });
        return res.data;
    }

    async createBook(bookData) {
        return this.request('books', {
            method: 'POST',
            body: bookData
        });
    }

    async updateBook(id, bookData) {
        return this.request('books', {
            method: 'PUT',
            params: `id=${id}`,
            body: bookData
        });
    }

    async deleteBook(id) {
        return this.request('books', {
            method: 'DELETE',
            params: `id=${id}`
        });
    }

    // -------------------------------------------------------------
    // Articles (Module C)
    // -------------------------------------------------------------
    async getArticles() {
        const res = await this.request('articles');
        return res.data || [];
    }

    async getArticle(id) {
        const res = await this.request('articles', { params: `id=${id}` });
        return res.data;
    }

    async createArticle(articleData) {
        return this.request('articles', {
            method: 'POST',
            body: articleData
        });
    }

    async updateArticle(id, articleData) {
        return this.request('articles', {
            method: 'PUT',
            params: `id=${id}`,
            body: articleData
        });
    }

    async deleteArticle(id) {
        return this.request('articles', {
            method: 'DELETE',
            params: `id=${id}`
        });
    }

    // -------------------------------------------------------------
    // Testimonials & WhatsApp Reviews (Module D)
    // -------------------------------------------------------------
    async getTestimonials(includeAll = false) {
        const params = includeAll ? 'all=1' : '';
        const res = await this.request('testimonials', { params });
        return res.data || [];
    }

    async createTestimonial(reviewData) {
        return this.request('testimonials', {
            method: 'POST',
            body: reviewData
        });
    }

    async toggleTestimonial(id) {
        return this.request('testimonials', {
            method: 'POST',
            params: `id=${id}&toggle=1`,
            body: { action: 'toggle', id }
        });
    }

    async updateTestimonial(id, reviewData) {
        return this.request('testimonials', {
            method: 'PUT',
            params: `id=${id}`,
            body: reviewData
        });
    }

    async deleteTestimonial(id) {
        return this.request('testimonials', {
            method: 'DELETE',
            params: `id=${id}`
        });
    }
}

// Global Singleton Instance
window.clinicApi = new ClinicApiClient();
