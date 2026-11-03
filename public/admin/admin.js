/**
 * Dr. Gopi's Clinic - Admin Dashboard & CMS Application Controller
 */

// Application State
const state = {
    currentTab: 'overview',
    products: [],
    books: [],
    articles: [],
    testimonials: [],
    reviewFilter: 'all',
    searchQuery: '',
    selectedProdBase64: null,
    selectedBookCoverBase64: null,
    selectedBookPdfBase64: null,
    selectedArtThumbBase64: null
};

// ============================================================================
// 1. INITIALIZATION & AUTHENTICATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Force clear all local data caches on admin load
    if (window.clinicApi && typeof window.clinicApi.clearDataCache === 'function') {
        window.clinicApi.clearDataCache();
    }
    lucide.createIcons();
    initEventListeners();
    checkAuthStatus();
    checkApiHealth();
});

// Force Refresh Function to Evict Cache & Reload DB Data
window.forceRefreshAll = async function() {
    if (window.clinicApi && typeof window.clinicApi.clearDataCache === 'function') {
        window.clinicApi.clearDataCache();
    }
    showToast('Clearing cache and fetching fresh records...');
    await loadAllData();
    showToast('Cache cleared! Fresh database records loaded.');
};

// Toast Notification Helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-emerald-800 text-white' : (type === 'error' ? 'bg-rose-700 text-white' : 'bg-slate-800 text-white');
    const iconName = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-triangle' : 'info');

    toast.className = `${bgClass} px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0`;
    toast.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4"></i><span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons({ root: toast });

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Modal Error & Validation Helpers
function showModalError(modalId, message, invalidInputIds = []) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    let errBox = modal.querySelector('.modal-error-alert');
    if (!errBox) {
        errBox = document.createElement('div');
        errBox.className = 'modal-error-alert mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2 shadow-sm animate-fadeIn';
        const form = modal.querySelector('form');
        if (form) form.insertBefore(errBox, form.firstChild);
    }
    errBox.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4 text-rose-600 shrink-0 mt-0.5"></i><span class="flex-1">${message}</span>`;
    errBox.classList.remove('hidden');
    lucide.createIcons({ root: errBox });

    // Highlight invalid input fields with red ring and focus the first invalid input
    invalidInputIds.forEach((id, index) => {
        const input = document.getElementById(id);
        if (input) {
            input.classList.add('border-rose-500', 'ring-2', 'ring-rose-200');
            if (index === 0 && typeof input.focus === 'function') {
                input.focus();
            }
            input.addEventListener('input', () => {
                input.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
                if (modal && !modal.querySelector('.border-rose-500')) {
                    if (errBox) errBox.classList.add('hidden');
                }
            }, { once: true });
        }
    });
}

function clearModalError(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const errBox = modal.querySelector('.modal-error-alert');
    if (errBox) errBox.classList.add('hidden');
    modal.querySelectorAll('.border-rose-500').forEach(el => {
        el.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
    });
}

// Modal Click-Outside & Escape Key Dismissal
function initModalBackdropDismissal() {
    const modals = document.querySelectorAll('[id^="modal-"]');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            // Only close when clicking on the backdrop itself (outside the white modal content box)
            if (e.target === modal) {
                modal.classList.add('hidden');
                clearModalError(modal.id);
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modals.forEach(modal => {
                if (!modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                    clearModalError(modal.id);
                }
            });
        }
    });
}

// Authentication Check
function checkAuthStatus() {
    if (window.clinicApi.isAuthenticated()) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        loadAllData();
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('admin-dashboard').classList.add('hidden');
    }
}

// Event Listeners
function initEventListeners() {
    // Password toggle
    const togglePwd = document.getElementById('toggle-pwd-btn');
    const pwdInput = document.getElementById('login-passcode');
    if (togglePwd && pwdInput) {
        togglePwd.addEventListener('click', () => {
            const isText = pwdInput.type === 'text';
            pwdInput.type = isText ? 'password' : 'text';
            togglePwd.innerHTML = `<i data-lucide="${isText ? 'eye' : 'eye-off'}" class="w-5 h-5"></i>`;
            lucide.createIcons({ root: togglePwd });
        });
    }

    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const passcode = pwdInput.value.trim();
            const remember = document.getElementById('login-remember').checked;
            const btn = document.getElementById('login-btn');
            const originalText = btn.innerHTML;

            try {
                btn.disabled = true;
                btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Verifying...`;
                const res = await window.clinicApi.login(passcode, remember);
                if (res.success) {
                    showToast('Admin session unlocked successfully.');
                    checkAuthStatus();
                }
            } catch (err) {
                showToast(err.message || 'Authentication failed. Please check passcode.', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
                lucide.createIcons({ root: btn });
            }
        });
    }

    // Navigation Tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // File Upload Inputs Listeners
    initFileUploadHandlers();

    // Form Submissions
    initFormHandlers();

    // Click outside modal backdrop to close & Escape key
    initModalBackdropDismissal();

    // Review Search & Filters
    const reviewSearch = document.getElementById('review-search');
    if (reviewSearch) {
        reviewSearch.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase();
            renderReviewsTable();
        });
    }

    document.querySelectorAll('.review-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.review-filter-btn').forEach(b => {
                b.className = 'review-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50';
            });
            btn.className = 'review-filter-btn active px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white';
            state.reviewFilter = btn.getAttribute('data-filter');
            renderReviewsTable();
        });
    });
}

function handleLogout() {
    if (confirm('Are you sure you want to end your admin session?')) {
        window.clinicApi.logout();
        showToast('Logged out of Admin Portal.', 'info');
        checkAuthStatus();
    }
}

// Check API Health
async function checkApiHealth() {
    const pill = document.getElementById('api-status-pill');
    const text = document.getElementById('api-status-text');
    const loginBadge = document.getElementById('login-api-badge');

    try {
        const ping = await window.clinicApi.ping();
        if (ping.success && ping.status === 'online') {
            if (pill) pill.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer';
            if (text) text.textContent = 'MySQL Database Online';
            if (loginBadge) loginBadge.textContent = 'MySQL Bridge Connected';
        } else {
            setDemoStatus();
        }
    } catch (e) {
        setDemoStatus();
    }

    function setDemoStatus() {
        if (pill) pill.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer';
        if (text) text.textContent = 'Local Cache Mode';
        if (loginBadge) loginBadge.textContent = 'Local Cache Active';
    }
}

// Switch Active Tab
function switchTab(tabName) {
    state.currentTab = tabName;
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const isActive = tab.getAttribute('data-tab') === tabName;
        tab.className = isActive 
            ? 'nav-tab active flex items-center gap-2 py-3 px-1 text-sm font-semibold border-b-2 border-brand-800 text-brand-800'
            : 'nav-tab flex items-center gap-2 py-3 px-1 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800';
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.add('hidden');
    });

    const targetPane = document.getElementById(`tab-${tabName}`);
    if (targetPane) {
        targetPane.classList.remove('hidden');
    }
    lucide.createIcons();
}

// ============================================================================
// 2. DATA LOADING & STATS (PROGRESSIVE NON-BLOCKING STREAM)
// ============================================================================
async function loadAllData() {
    // Progressive Loading: Don't block the UI waiting for all tables.
    // Render each section as soon as its data arrives.

    // 1. WhatsApp Reviews & Testimonials (Lightning fast ~150ms)
    window.clinicApi.getTestimonials(true).then(testimonials => {
        state.testimonials = testimonials || [];
        renderReviewsTable();
        renderOverviewTestimonials();
        updateStatsUI();
    }).catch(err => console.warn('[Admin] Testimonials load warning:', err));

    // 2. Articles (Fast ~180ms)
    window.clinicApi.getArticles().then(articles => {
        state.articles = articles || [];
        renderArticlesGrid();
        updateStatsUI();
    }).catch(err => console.warn('[Admin] Articles load warning:', err));

    // 3. Products
    window.clinicApi.getProducts().then(products => {
        state.products = products || [];
        renderProductsTable();
        updateStatsUI();
    }).catch(err => console.warn('[Admin] Products load warning:', err));

    // 4. Books
    window.clinicApi.getBooks().then(books => {
        state.books = books || [];
        renderBooksTable();
        updateStatsUI();
    }).catch(err => console.warn('[Admin] Books load warning:', err));
}

function updateStatsUI() {
    const prodCount = state.products.length;
    const bookCount = state.books.length;
    const artCount = state.articles.length;
    const revTotal = state.testimonials.length;
    const revPub = state.testimonials.filter(x => x.is_published).length;
    const revPend = revTotal - revPub;

    // Badges in Header Tabs
    document.getElementById('badge-products-count').textContent = prodCount;
    document.getElementById('badge-books-count').textContent = bookCount;
    document.getElementById('badge-articles-count').textContent = artCount;
    document.getElementById('badge-testimonials-count').textContent = revPub;

    // Overview Stats
    document.getElementById('stat-products').textContent = prodCount;
    document.getElementById('stat-books').textContent = bookCount;
    document.getElementById('stat-articles').textContent = artCount;
    document.getElementById('stat-reviews').textContent = revTotal;
    document.getElementById('stat-reviews-pub').textContent = `${revPub} live on website`;
    document.getElementById('stat-reviews-pend').textContent = `${revPend} hidden`;

    // Filter counts in reviews tab
    document.getElementById('count-filter-all').textContent = revTotal;
    document.getElementById('count-filter-pub').textContent = revPub;
    document.getElementById('count-filter-hid').textContent = revPend;
}

// ============================================================================
// 3. FILE UPLOADER HANDLERS & IMAGE OPTIMIZATION (VERCEL SAFETY)
// ============================================================================

// Helper: Compress an image file using browser Canvas if larger than 1.5MB
async function optimizeImageFile(file, maxSizeMB = 1.5) {
    if (!file || !file.type.startsWith('image/')) {
        return ClinicApiClient.fileToBase64(file);
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 4.0) {
        showToast(`⚠️ Image (${fileSizeMB.toFixed(1)} MB) exceeds Vercel 4.5MB limit. Resizing & compressing...`, 'error');
    } else if (fileSizeMB > maxSizeMB) {
        showToast(`ℹ️ Optimizing image (${fileSizeMB.toFixed(1)} MB) for fast upload...`);
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.onerror = reject;

        img.onload = () => {
            const maxWidth = 1600;
            const maxHeight = 1600;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const targetMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const quality = fileSizeMB > maxSizeMB ? 0.8 : 0.92;
            const dataUri = canvas.toDataURL(targetMime, quality);

            // Calculate approximate compressed size
            const base64Len = dataUri.length - (dataUri.indexOf(',') + 1);
            const compressedBytes = (base64Len * 3) / 4;

            if (file.size > compressedBytes) {
                const reduction = Math.round(((file.size - compressedBytes) / file.size) * 100);
                showToast(`✅ Image optimized: reduced by ${reduction}% (${(compressedBytes / 1024).toFixed(1)} KB)`);
            }

            resolve({
                dataUri,
                mimeType: targetMime,
                fileName: file.name,
                fileSize: compressedBytes
            });
        };

        img.onerror = () => {
            // Fallback to raw base64 if canvas decode fails
            ClinicApiClient.fileToBase64(file).then(resolve).catch(reject);
        };

        reader.readAsDataURL(file);
    });
}

function initFileUploadHandlers() {
    // Product Photo
    const prodInput = document.getElementById('prod-file-input');
    if (prodInput) {
        prodInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                showToast('Processing product image...');
                const res = await optimizeImageFile(file);
                state.selectedProdBase64 = res;
                document.getElementById('prod-img-preview').src = res.dataUri;
                document.getElementById('prod-img-info').textContent = `${file.name} (${(res.fileSize / 1024).toFixed(1)} KB)`;
                document.getElementById('prod-preview-container').classList.remove('hidden');
                document.getElementById('prod-upload-prompt').classList.add('hidden');
                const dropzone = document.getElementById('prod-dropzone');
                if (dropzone) dropzone.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
                const modal = document.getElementById('modal-product');
                if (modal && !modal.querySelector('.border-rose-500')) {
                    const errBox = modal.querySelector('.modal-error-alert');
                    if (errBox) errBox.classList.add('hidden');
                }
            }
        });
    }

    // Book Cover
    const bookCoverInput = document.getElementById('book-cover-input');
    if (bookCoverInput) {
        bookCoverInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                showToast('Processing book cover image...');
                const res = await optimizeImageFile(file);
                state.selectedBookCoverBase64 = res;
                document.getElementById('book-cover-preview').src = res.dataUri;
                document.getElementById('book-cover-info').textContent = `${file.name} (${(res.fileSize / 1024).toFixed(1)} KB)`;
                document.getElementById('book-cover-preview-container').classList.remove('hidden');
                const dropzone = document.getElementById('book-cover-dropzone');
                if (dropzone) dropzone.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
                const modal = document.getElementById('modal-book');
                if (modal && !modal.querySelector('.border-rose-500')) {
                    const errBox = modal.querySelector('.modal-error-alert');
                    if (errBox) errBox.classList.add('hidden');
                }
            }
        });
    }

    // Article Thumbnail
    const artThumbInput = document.getElementById('art-thumb-input');
    if (artThumbInput) {
        artThumbInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                showToast('Processing article image...');
                const res = await optimizeImageFile(file);
                state.selectedArtThumbBase64 = res;
                document.getElementById('art-thumb-preview').src = res.dataUri;
                document.getElementById('art-thumb-info').textContent = `${file.name} (${(res.fileSize / 1024).toFixed(1)} KB)`;
                document.getElementById('art-thumb-preview-container').classList.remove('hidden');
                const dropzone = document.getElementById('art-thumb-dropzone');
                if (dropzone) dropzone.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200');
                const modal = document.getElementById('modal-article');
                if (modal && !modal.querySelector('.border-rose-500')) {
                    const errBox = modal.querySelector('.modal-error-alert');
                    if (errBox) errBox.classList.add('hidden');
                }
            }
        });
    }
}

// ============================================================================
// 4. MODULE A: PRODUCT MANAGER
// ============================================================================
function getAdminProductImageSrc(p) {
    if (p.image_data) return p.image_data;
    if (p.id === 1 || (p.title && p.title.toLowerCase().includes('karthi'))) {
        return '/images/drg/personalcare/p1.png';
    }
    return '/images/drg/logo.png';
}

function renderProductsTable() {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;

    if (!state.products.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">No products found. Click "Add New Product" to create one.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.products.map(p => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-4">
                <img src="${getAdminProductImageSrc(p)}" 
                     alt="${escapeHtml(p.title)}" 
                     class="h-12 w-12 object-cover rounded-lg border border-slate-200 bg-white shadow-sm"
                     onerror="this.src='/images/drg/logo.png'">
            </td>
            <td class="py-3 px-4">
                <p class="font-bold text-slate-900">${escapeHtml(p.title)}</p>
                <p class="text-[11px] text-slate-500 line-clamp-1 max-w-xs mt-0.5">${escapeHtml(p.description || '')}</p>
            </td>
            <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-100">${escapeHtml(p.category || 'General')}</span>
            </td>
            <td class="py-3 px-4 font-bold text-slate-900">
                ₹${parseFloat(p.price || 0).toFixed(2)}
            </td>
            <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                    <button onclick="editProduct(${p.id})" class="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition" title="Edit Product">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteProduct(${p.id})" class="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition" title="Delete Product">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons({ root: tbody });
}

function openProductModal(prod = null) {
    clearModalError('modal-product');
    state.selectedProdBase64 = null;
    document.getElementById('form-product').reset();
    document.getElementById('prod-id').value = prod ? prod.id : '';
    document.getElementById('modal-product-title').textContent = prod ? 'Edit Product' : 'Add New Product';

    if (prod) {
        document.getElementById('prod-title').value = prod.title || '';
        document.getElementById('prod-category').value = prod.category || '';
        document.getElementById('prod-price').value = prod.price || '';
        document.getElementById('prod-desc').value = prod.description || '';
        if (prod.image_data) {
            document.getElementById('prod-img-preview').src = prod.image_data;
            document.getElementById('prod-img-info').textContent = 'Current Product Image';
            document.getElementById('prod-preview-container').classList.remove('hidden');
            document.getElementById('prod-upload-prompt').classList.add('hidden');
        } else {
            document.getElementById('prod-preview-container').classList.add('hidden');
            document.getElementById('prod-upload-prompt').classList.remove('hidden');
        }
    } else {
        document.getElementById('prod-preview-container').classList.add('hidden');
        document.getElementById('prod-upload-prompt').classList.remove('hidden');
    }

    document.getElementById('modal-product').classList.remove('hidden');
    lucide.createIcons();
}

function closeProductModal() {
    document.getElementById('modal-product').classList.add('hidden');
}

function editProduct(id) {
    const prod = state.products.find(p => p.id === id);
    if (prod) openProductModal(prod);
}

async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            // Immediate optimistic UI removal
            state.products = state.products.filter(p => p.id !== id);
            renderProductsTable();
            updateStatsUI();

            await window.clinicApi.deleteProduct(id);
            showToast('Product deleted.');
            loadAllData();
        } catch (err) {
            showToast(err.message, 'error');
            loadAllData();
        }
    }
}

// ============================================================================
// 5. MODULE B: BOOK MANAGER
// ============================================================================
function getAdminBookCoverSrc(b) {
    if (b.cover_image_data) return b.cover_image_data;
    if (b.id === 1 || (b.title && b.title.toLowerCase().includes('easy prescriber'))) {
        return '/images/drg/books/Book 1.png';
    }
    if (b.id === 2 || (b.title && b.title.toLowerCase().includes('skin'))) {
        return '/images/drg/books/Book 2.png';
    }
    if (b.id === 3 || (b.title && b.title.toLowerCase().includes('tincture'))) {
        return '/images/drg/books/Book 3.png';
    }
    if (b.id === 4 || (b.title && b.title.toLowerCase().includes('psychiatric'))) {
        return '/images/drg/books/Book 4.png';
    }
    return '/images/drg/logo.png';
}

function renderBooksTable() {
    const tbody = document.getElementById('books-table-body');
    if (!tbody) return;

    if (!state.books.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-slate-400">No books found. Click "Add New Book" to publish one.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.books.map(b => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-4">
                <img src="${getAdminBookCoverSrc(b)}" 
                     alt="${escapeHtml(b.title)}" 
                     class="h-16 w-12 object-cover rounded-md border border-slate-200 bg-white shadow-sm"
                     onerror="this.src='/images/drg/logo.png'">
            </td>
            <td class="py-3 px-4">
                <p class="font-bold text-slate-900">${escapeHtml(b.title)}</p>
                <p class="text-[11px] text-slate-500 line-clamp-2 max-w-sm mt-0.5">${escapeHtml(b.summary || '')}</p>
            </td>
            <td class="py-3 px-4">
                <p class="font-bold text-slate-900">₹${parseFloat(b.price || 0).toFixed(2)}</p>
                <p class="text-[10px] text-slate-400">${b.price_display || 'Paperback / Hardbound'}</p>
            </td>
            <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                    <button onclick="editBook(${b.id})" class="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition" title="Edit Book">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteBook(${b.id})" class="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition" title="Delete Book">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons({ root: tbody });
}

function openBookModal(book = null) {
    clearModalError('modal-book');
    state.selectedBookCoverBase64 = null;
    state.selectedBookPdfBase64 = null;
    document.getElementById('form-book').reset();
    document.getElementById('book-id').value = book ? book.id : '';
    document.getElementById('modal-book-title').textContent = book ? 'Edit Book' : 'Add New Book';

    if (book) {
        document.getElementById('book-title').value = book.title || '';
        document.getElementById('book-price').value = book.price || '';
        document.getElementById('book-summary').value = book.summary || '';
        const currentCover = book.cover_image_data || (getAdminBookCoverSrc(book) !== '/images/drg/logo.png' ? getAdminBookCoverSrc(book) : null);
        if (currentCover) {
            document.getElementById('book-cover-preview').src = currentCover;
            document.getElementById('book-cover-info').textContent = book.cover_image_data ? 'Current Cover in Database' : 'Catalog Cover Image';
            document.getElementById('book-cover-preview-container').classList.remove('hidden');
        } else {
            document.getElementById('book-cover-preview-container').classList.add('hidden');
        }
    } else {
        document.getElementById('book-cover-preview-container').classList.add('hidden');
    }

    document.getElementById('modal-book').classList.remove('hidden');
    lucide.createIcons();
}

function closeBookModal() {
    document.getElementById('modal-book').classList.add('hidden');
}

function editBook(id) {
    const book = state.books.find(b => b.id === id);
    if (book) openBookModal(book);
}

async function deleteBook(id) {
    if (confirm('Are you sure you want to delete this book?')) {
        try {
            // Immediate optimistic UI removal
            state.books = state.books.filter(b => b.id !== id);
            renderBooksTable();
            updateStatsUI();

            await window.clinicApi.deleteBook(id);
            showToast('Book removed from catalog.');
            loadAllData();
        } catch (err) {
            showToast(err.message, 'error');
            loadAllData();
        }
    }
}

// ============================================================================
// 6. MODULE C: ARTICLE MANAGER
// ============================================================================
function getAdminArticleThumbSrc(a) {
    if (a.thumbnail_data) return a.thumbnail_data;
    if (a.id === 1 || (a.title && a.title.toLowerCase().includes('trigger finger'))) {
        return '/images/drg/hand_pain.jpg';
    }
    if (a.id === 2 || (a.title && a.title.toLowerCase().includes('back pain'))) {
        return '/images/drg/back_pain.jpeg';
    }
    if (a.id === 3 || (a.title && a.title.toLowerCase().includes('indigestion'))) {
        return '/images/drg/indigestion.jpg';
    }
    return '/images/drg/logo.png';
}

function renderArticlesGrid() {
    const container = document.getElementById('articles-grid');
    if (!container) return;

    if (!state.articles.length) {
        container.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 text-xs">No articles published yet. Click "Publish New Article" to write one.</div>`;
        return;
    }

    container.innerHTML = state.articles.map(a => `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition">
            <div class="relative h-44 bg-slate-100 overflow-hidden">
                <img src="${getAdminArticleThumbSrc(a)}" 
                     alt="${escapeHtml(a.title)}" 
                     class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                     onerror="this.src='/images/drg/logo.png'">
                <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 text-brand-900 shadow-sm backdrop-blur-sm">
                    ${escapeHtml(a.category || 'Health Guide')}
                </span>
            </div>
            <div class="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                    <h3 class="font-bold text-sm text-slate-900 leading-snug line-clamp-2">${escapeHtml(a.title)}</h3>
                    <p class="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">${escapeHtml(a.content || '')}</p>
                </div>
                <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span class="text-slate-400 text-[11px]">${a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Active'}</span>
                    <div class="flex items-center gap-1.5">
                        <button onclick="editArticle(${a.id})" class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition" title="Edit Article">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteArticle(${a.id})" class="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition" title="Delete Article">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons({ root: container });
}

function openArticleModal(art = null) {
    clearModalError('modal-article');
    state.selectedArtThumbBase64 = null;
    document.getElementById('form-article').reset();
    document.getElementById('art-id').value = art ? art.id : '';
    document.getElementById('modal-article-title').textContent = art ? 'Edit Health Article' : 'Publish Health Article';

    if (art) {
        document.getElementById('art-title').value = art.title || '';
        document.getElementById('art-category').value = art.category || '';
        document.getElementById('art-content').value = art.content || '';
        const currentThumb = art.thumbnail_data || (getAdminArticleThumbSrc(art) !== '/images/drg/logo.png' ? getAdminArticleThumbSrc(art) : null);
        if (currentThumb) {
            document.getElementById('art-thumb-preview').src = currentThumb;
            document.getElementById('art-thumb-info').textContent = art.thumbnail_data ? 'Current Article Thumbnail' : 'Catalog Article Thumbnail';
            document.getElementById('art-thumb-preview-container').classList.remove('hidden');
        } else {
            document.getElementById('art-thumb-preview-container').classList.add('hidden');
        }
    } else {
        document.getElementById('art-thumb-preview-container').classList.add('hidden');
    }

    document.getElementById('modal-article').classList.remove('hidden');
    lucide.createIcons();
}

function closeArticleModal() {
    document.getElementById('modal-article').classList.add('hidden');
}

function editArticle(id) {
    const art = state.articles.find(a => a.id === id);
    if (art) openArticleModal(art);
}

async function deleteArticle(id) {
    if (confirm('Are you sure you want to delete this article?')) {
        try {
            // Immediate optimistic UI removal
            state.articles = state.articles.filter(a => a.id !== id);
            renderArticlesGrid();
            updateStatsUI();

            await window.clinicApi.deleteArticle(id);
            showToast('Article deleted.');
            loadAllData();
        } catch (err) {
            showToast(err.message, 'error');
            loadAllData();
        }
    }
}

// ============================================================================
// 7. MODULE D: WHATSAPP REVIEW IMPORTER & MODERATION
// ============================================================================
function renderReviewsTable() {
    const tbody = document.getElementById('reviews-table-body');
    if (!tbody) return;

    let list = [...state.testimonials];

    // Filter by tab
    if (state.reviewFilter === 'published') {
        list = list.filter(r => r.is_published);
    } else if (state.reviewFilter === 'hidden') {
        list = list.filter(r => !r.is_published);
    }

    // Search query
    if (state.searchQuery) {
        list = list.filter(r => 
            (r.patient_name && r.patient_name.toLowerCase().includes(state.searchQuery)) ||
            (r.location && r.location.toLowerCase().includes(state.searchQuery)) ||
            (r.condition_treated && r.condition_treated.toLowerCase().includes(state.searchQuery)) ||
            (r.review_text && r.review_text.toLowerCase().includes(state.searchQuery))
        );
    }

    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">No reviews found matching the current criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(r => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-4">
                <button onclick="toggleReviewPublish(${r.id})" 
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition shadow-sm ${
                        r.is_published 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }" title="Click to toggle live display on website">
                    <span class="w-2 h-2 rounded-full ${r.is_published ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
                    <span>${r.is_published ? 'Published' : 'Hidden'}</span>
                </button>
            </td>
            <td class="py-3 px-4">
                <p class="font-bold text-slate-900">${escapeHtml(r.patient_name || 'Anonymous')}</p>
                <p class="text-[11px] text-slate-400">${escapeHtml(r.location || 'Location Not Specified')}</p>
            </td>
            <td class="py-3 px-4">
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    ${escapeHtml(r.condition_treated || 'General Consultation')}
                </span>
            </td>
            <td class="py-3 px-4">
                <p class="text-xs text-slate-700 italic max-w-md line-clamp-2 leading-relaxed">"${escapeHtml(r.review_text || '')}"</p>
            </td>
            <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                    <button onclick="editReview(${r.id})" class="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition" title="Edit Review">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteReview(${r.id})" class="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition" title="Delete Review">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons({ root: tbody });
}

function renderOverviewTestimonials() {
    const container = document.getElementById('overview-testimonials-list');
    if (!container) return;

    const published = state.testimonials.filter(r => r.is_published).slice(0, 3);
    if (!published.length) {
        container.innerHTML = `<div class="text-center py-4 text-slate-400 text-xs">No live reviews published yet.</div>`;
        return;
    }

    container.innerHTML = published.map(r => `
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3">
            <div class="space-y-1">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-900">${escapeHtml(r.patient_name)}</span>
                    <span class="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500">${escapeHtml(r.location)}</span>
                    <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">${escapeHtml(r.condition_treated)}</span>
                </div>
                <p class="text-xs text-slate-600 line-clamp-2 italic">"${escapeHtml(r.review_text)}"</p>
            </div>
            <button onclick="toggleReviewPublish(${r.id})" class="p-1 text-slate-400 hover:text-rose-600" title="Hide Review">
                <i data-lucide="eye-off" class="w-4 h-4"></i>
            </button>
        </div>
    `).join('');
    lucide.createIcons({ root: container });
}

async function toggleReviewPublish(id) {
    try {
        const res = await window.clinicApi.toggleTestimonial(id);
        const item = state.testimonials.find(t => t.id === id);
        if (item) {
            item.is_published = res.is_published;
            updateStatsUI();
            renderReviewsTable();
            renderOverviewTestimonials();
            showToast(`Review is now ${res.is_published ? 'Published (Live)' : 'Hidden'}.`);
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function openReviewModal(rev = null) {
    clearModalError('modal-review');
    document.getElementById('form-review').reset();
    document.getElementById('rev-id').value = rev ? rev.id : '';
    document.getElementById('modal-review-title').textContent = rev ? 'Edit Review' : 'Add New Review';

    if (rev) {
        document.getElementById('rev-name').value = rev.patient_name || '';
        document.getElementById('rev-location').value = rev.location || '';
        document.getElementById('rev-condition').value = rev.condition_treated || '';
        document.getElementById('rev-text').value = rev.review_text || '';
        document.getElementById('rev-published').checked = !!rev.is_published;
    } else {
        document.getElementById('rev-published').checked = true;
    }

    document.getElementById('modal-review').classList.remove('hidden');
    lucide.createIcons();
}

function closeReviewModal() {
    document.getElementById('modal-review').classList.add('hidden');
}

function editReview(id) {
    const rev = state.testimonials.find(r => r.id === id);
    if (rev) openReviewModal(rev);
}

async function deleteReview(id) {
    if (confirm('Are you sure you want to delete this patient testimonial?')) {
        try {
            // Immediate optimistic UI removal
            state.testimonials = state.testimonials.filter(t => t.id !== id);
            renderReviewsTable();
            renderOverviewTestimonials();
            updateStatsUI();

            await window.clinicApi.deleteTestimonial(id);
            showToast('Review removed.');
            loadAllData();
        } catch (err) {
            showToast(err.message, 'error');
            loadAllData();
        }
    }
}

// ----------------------------------------------------------------------------
// Smart WhatsApp Message Parser Helper
// ----------------------------------------------------------------------------
function parseWhatsAppString(raw) {
    if (!raw || !raw.trim()) return null;

    let patient_name = '';
    let location = '';
    let condition_treated = '';
    let review_text = raw.trim();

    // 1. Look for labeled keys like "Name:", "Location:", "Condition:", "Message:"
    const nameMatch = raw.match(/Name\s*:\s*([^\n\r]+)/i);
    const locMatch = raw.match(/(?:Location|City|Country|From)\s*:\s*([^\n\r]+)/i);
    const condMatch = raw.match(/(?:Condition|Disease|Problem|Issue)\s*:\s*([^\n\r]+)/i);
    const msgMatch = raw.match(/(?:Review|Message|Feedback|Text)\s*:\s*([\s\S]+)/i);

    if (nameMatch) patient_name = nameMatch[1].trim();
    if (locMatch) location = locMatch[1].trim();
    if (condMatch) condition_treated = condMatch[1].trim();
    if (msgMatch) review_text = msgMatch[1].trim();

    // 2. Fallback pattern: "ANANYA, Kerala - SCHIZOPHRENIA: Doctor you saved..."
    if (!nameMatch && !condMatch) {
        const patternA = /^([a-zA-Z\s]+)(?:from|,)\s*([a-zA-Z\s]+)?\s*[:\-]\s*([a-zA-Z0-9\s()]+)\s*[:\-]\s*([\s\S]+)$/i;
        const matchA = raw.match(patternA);
        if (matchA) {
            patient_name = matchA[1]?.trim() || '';
            location = matchA[2]?.trim() || '';
            condition_treated = matchA[3]?.trim() || '';
            review_text = matchA[4]?.trim() || '';
        } else {
            // Pattern B: "SCHIZOPHRENIA: Doctor you saved my life... - Chaitanya, USA"
            const patternB = /^([A-Z\s()]+)\s*:\s*([\s\S]+?)(?:\s*[-–]\s*([a-zA-Z\s]+)(?:,\s*([a-zA-Z\s]+))?)?$/;
            const matchB = raw.match(patternB);
            if (matchB) {
                condition_treated = matchB[1]?.trim() || '';
                review_text = matchB[2]?.trim() || '';
                patient_name = matchB[3]?.trim() || 'Patient';
                location = matchB[4]?.trim() || '';
            }
        }
    }

    // Clean quotes
    review_text = review_text.replace(/^["']|["']$/g, '').trim();

    return {
        patient_name: patient_name || 'Verified Patient',
        location: location || 'India',
        condition_treated: condition_treated || 'General Care',
        review_text: review_text
    };
}

function parseAndFillReview() {
    const raw = document.getElementById('raw-whatsapp-text').value;
    const parsed = parseWhatsAppString(raw);
    if (!parsed) {
        showToast('Please paste a WhatsApp review text first.', 'error');
        return;
    }

    openReviewModal({
        patient_name: parsed.patient_name,
        location: parsed.location,
        condition_treated: parsed.condition_treated,
        review_text: parsed.review_text,
        is_published: true
    });
    showToast('Auto-parsed WhatsApp review into form!');
}

async function parseQuickWhatsApp() {
    const raw = document.getElementById('quick-whatsapp-input').value;
    const parsed = parseWhatsAppString(raw);
    if (!parsed || !parsed.review_text) {
        showToast('Please enter review text into the input box.', 'error');
        return;
    }

    try {
        const payload = {
            patient_name: parsed.patient_name,
            location: parsed.location,
            condition_treated: parsed.condition_treated,
            review_text: parsed.review_text,
            is_published: 1
        };

        const res = await window.clinicApi.createTestimonial(payload);

        // Immediate optimistic UI addition
        const newRev = {
            id: res?.data?.id || Date.now(),
            patient_name: parsed.patient_name,
            location: parsed.location,
            condition_treated: parsed.condition_treated,
            review_text: parsed.review_text,
            is_published: true,
            created_at: new Date().toISOString()
        };
        state.testimonials.unshift(newRev);
        renderReviewsTable();
        renderOverviewTestimonials();
        updateStatsUI();

        document.getElementById('quick-whatsapp-input').value = '';
        showToast(`Imported & published review for ${parsed.patient_name}!`);
        loadAllData();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============================================================================
// 8. FORM HANDLERS (Add / Edit Submissions & In-Popup Validation)
// ============================================================================
function initFormHandlers() {
    // Save Product
    document.getElementById('form-product').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearModalError('modal-product');

        const title = document.getElementById('prod-title').value.trim();
        const category = document.getElementById('prod-category').value.trim();
        const priceVal = document.getElementById('prod-price').value.trim();
        const price = parseFloat(priceVal || 0);
        const description = document.getElementById('prod-desc').value.trim();
        const id = document.getElementById('prod-id').value;

        const invalidFields = [];
        const missing = [];

        if (!title) {
            invalidFields.push('prod-title');
            missing.push('Product Title');
        }
        if (!category) {
            invalidFields.push('prod-category');
            missing.push('Category');
        }
        if (!priceVal || isNaN(price) || price <= 0) {
            invalidFields.push('prod-price');
            missing.push('Valid Price (greater than ₹0)');
        }
        if (!description) {
            invalidFields.push('prod-desc');
            missing.push('Description / Indications');
        }

        // Check if photo is provided (newly uploaded or exists on edit)
        const existingImg = id ? state.products.find(p => p.id === parseInt(id))?.image_data : null;
        if (!state.selectedProdBase64 && !existingImg) {
            invalidFields.push('prod-dropzone');
            missing.push('Product Photo');
        }

        if (invalidFields.length > 0) {
            showModalError('modal-product', 'Please complete all required fields: ' + missing.join(', ') + '.', invalidFields);
            return;
        }

        const btn = document.getElementById('btn-save-product');
        const originalText = btn.innerHTML;

        const payload = {
            title,
            category,
            price,
            description
        };

        if (state.selectedProdBase64) {
            payload.image_data = state.selectedProdBase64.dataUri;
            payload.image_mime_type = state.selectedProdBase64.mimeType;
        }

        try {
            btn.disabled = true;
            btn.innerHTML = 'Saving to Database...';
            if (id) {
                const res = await window.clinicApi.updateProduct(id, payload);
                const pId = parseInt(id);
                const idx = state.products.findIndex(p => p.id === pId);
                if (idx !== -1) {
                    state.products[idx] = {
                        ...state.products[idx],
                        title: payload.title,
                        category: payload.category,
                        price: parseFloat(payload.price || 0),
                        description: payload.description,
                        image_data: payload.image_data || (res?.data?.image_data) || state.products[idx].image_data,
                        image_mime_type: payload.image_mime_type || state.products[idx].image_mime_type,
                    };
                }
                showToast('Product updated successfully.');
            } else {
                const res = await window.clinicApi.createProduct(payload);
                const newProduct = {
                    id: res?.data?.id || Date.now(),
                    title: payload.title,
                    category: payload.category,
                    price: parseFloat(payload.price || 0),
                    description: payload.description,
                    image_data: payload.image_data || (res?.data?.image_data) || '',
                    image_mime_type: payload.image_mime_type || 'image/png',
                    created_at: new Date().toISOString()
                };
                // Prepend so it is instantly the first row in the table!
                state.products.unshift(newProduct);
                showToast('New product added to catalog.');
            }
            renderProductsTable();
            updateStatsUI();
            closeProductModal();
            loadAllData();
        } catch (err) {
            showModalError('modal-product', err.message || 'Failed to save product to database.');
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    // Save Book
    document.getElementById('form-book').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearModalError('modal-book');

        const title = document.getElementById('book-title').value.trim();
        const priceVal = document.getElementById('book-price').value.trim();
        const price = parseFloat(priceVal || 0);
        const summary = document.getElementById('book-summary').value.trim();
        const id = document.getElementById('book-id').value;

        const invalidFields = [];
        const missing = [];

        if (!title) {
            invalidFields.push('book-title');
            missing.push('Book Title');
        }
        if (!priceVal || isNaN(price) || price <= 0) {
            invalidFields.push('book-price');
            missing.push('Valid Price (greater than ₹0)');
        }
        if (!summary) {
            invalidFields.push('book-summary');
            missing.push('Book Summary & Features');
        }

        const existingCover = id ? (state.books.find(b => b.id === parseInt(id))?.cover_image_data || (getAdminBookCoverSrc({ id: parseInt(id) }) !== '/images/drg/logo.png')) : null;
        if (!state.selectedBookCoverBase64 && !existingCover) {
            invalidFields.push('book-cover-dropzone');
            missing.push('Book Cover Image');
        }

        if (invalidFields.length > 0) {
            showModalError('modal-book', 'Please complete all required fields: ' + missing.join(', ') + '.', invalidFields);
            return;
        }

        const btn = document.getElementById('btn-save-book');
        const originalText = btn.innerHTML;

        const payload = {
            title,
            price,
            summary
        };

        if (state.selectedBookCoverBase64) {
            payload.cover_image_data = state.selectedBookCoverBase64.dataUri;
            payload.cover_mime_type = state.selectedBookCoverBase64.mimeType;
        }

        try {
            btn.disabled = true;
            btn.innerHTML = 'Saving Book...';
            if (id) {
                const res = await window.clinicApi.updateBook(id, payload);
                const bId = parseInt(id);
                const idx = state.books.findIndex(b => b.id === bId);
                if (idx !== -1) {
                    state.books[idx] = {
                        ...state.books[idx],
                        title: payload.title,
                        price: parseFloat(payload.price || 0),
                        summary: payload.summary,
                        cover_image_data: payload.cover_image_data || (res?.data?.cover_image_data) || state.books[idx].cover_image_data,
                    };
                }
                showToast('Book details updated.');
            } else {
                const res = await window.clinicApi.createBook(payload);
                const newBook = {
                    id: res?.data?.id || Date.now(),
                    title: payload.title,
                    price: parseFloat(payload.price || 0),
                    summary: payload.summary,
                    cover_image_data: payload.cover_image_data || (res?.data?.cover_image_data) || '',
                    created_at: new Date().toISOString()
                };
                state.books.unshift(newBook);
                showToast('Book added to library catalog.');
            }
            renderBooksTable();
            updateStatsUI();
            closeBookModal();
            loadAllData();
        } catch (err) {
            showModalError('modal-book', err.message || 'Failed to save book to database.');
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    // Save Article
    document.getElementById('form-article').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearModalError('modal-article');

        const title = document.getElementById('art-title').value.trim();
        const category = document.getElementById('art-category').value.trim();
        const content = document.getElementById('art-content').value.trim();
        const id = document.getElementById('art-id').value;

        const invalidFields = [];
        const missing = [];

        if (!title) {
            invalidFields.push('art-title');
            missing.push('Article Title');
        }
        if (!category) {
            invalidFields.push('art-category');
            missing.push('Category');
        }
        if (!content) {
            invalidFields.push('art-content');
            missing.push('Article Content');
        }

        const existingThumb = id ? (state.articles.find(a => a.id === parseInt(id))?.thumbnail_data || (getAdminArticleThumbSrc({ id: parseInt(id) }) !== '/images/drg/logo.png')) : null;
        if (!state.selectedArtThumbBase64 && !existingThumb) {
            invalidFields.push('art-thumb-dropzone');
            missing.push('Article Thumbnail Image');
        }

        if (invalidFields.length > 0) {
            showModalError('modal-article', 'Please complete all required fields: ' + missing.join(', ') + '.', invalidFields);
            return;
        }

        const btn = document.getElementById('btn-save-article');
        const originalText = btn.innerHTML;

        const payload = {
            title,
            category,
            content
        };

        if (state.selectedArtThumbBase64) {
            payload.thumbnail_data = state.selectedArtThumbBase64.dataUri;
            payload.thumbnail_mime_type = state.selectedArtThumbBase64.mimeType;
        }

        try {
            btn.disabled = true;
            btn.innerHTML = 'Publishing...';
            if (id) {
                const res = await window.clinicApi.updateArticle(id, payload);
                const aId = parseInt(id);
                const idx = state.articles.findIndex(a => a.id === aId);
                if (idx !== -1) {
                    state.articles[idx] = {
                        ...state.articles[idx],
                        title: payload.title,
                        category: payload.category,
                        content: payload.content,
                        thumbnail_data: payload.thumbnail_data || (res?.data?.thumbnail_data) || state.articles[idx].thumbnail_data,
                    };
                }
                showToast('Article updated.');
            } else {
                const res = await window.clinicApi.createArticle(payload);
                const newArticle = {
                    id: res?.data?.id || Date.now(),
                    title: payload.title,
                    category: payload.category,
                    content: payload.content,
                    thumbnail_data: payload.thumbnail_data || (res?.data?.thumbnail_data) || '',
                    created_at: new Date().toISOString()
                };
                state.articles.unshift(newArticle);
                showToast('Article published live.');
            }
            renderArticlesGrid();
            updateStatsUI();
            closeArticleModal();
            loadAllData();
        } catch (err) {
            showModalError('modal-article', err.message || 'Failed to publish article.');
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    // Save Review
    document.getElementById('form-review').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearModalError('modal-review');

        const patient_name = document.getElementById('rev-name').value.trim();
        const condition_treated = document.getElementById('rev-condition').value.trim();
        const review_text = document.getElementById('rev-text').value.trim();

        const invalidFields = [];
        const missing = [];
        if (!patient_name) {
            invalidFields.push('rev-name');
            missing.push('Patient Name');
        }
        if (!condition_treated) {
            invalidFields.push('rev-condition');
            missing.push('Condition Treated');
        }
        if (!review_text) {
            invalidFields.push('rev-text');
            missing.push('Review Text');
        }

        if (invalidFields.length > 0) {
            showModalError('modal-review', 'Please complete all required fields: ' + missing.join(', ') + '.', invalidFields);
            return;
        }

        const id = document.getElementById('rev-id').value;
        const btn = document.getElementById('btn-save-review');
        const originalText = btn.innerHTML;

        const payload = {
            patient_name,
            location: document.getElementById('rev-location').value.trim() || 'India',
            condition_treated,
            review_text,
            is_published: document.getElementById('rev-published').checked ? 1 : 0
        };

        try {
            btn.disabled = true;
            btn.innerHTML = 'Saving...';
            if (id) {
                const res = await window.clinicApi.updateTestimonial(id, payload);
                const rId = parseInt(id);
                const idx = state.testimonials.findIndex(t => t.id === rId);
                if (idx !== -1) {
                    state.testimonials[idx] = {
                        ...state.testimonials[idx],
                        ...payload
                    };
                }
                showToast('Review updated.');
            } else {
                const res = await window.clinicApi.createTestimonial(payload);
                const newReview = {
                    id: res?.data?.id || Date.now(),
                    patient_name: payload.patient_name,
                    location: payload.location,
                    condition_treated: payload.condition_treated,
                    review_text: payload.review_text,
                    is_published: !!payload.is_published,
                    created_at: new Date().toISOString()
                };
                state.testimonials.unshift(newReview);
                showToast('Review saved.');
            }
            renderReviewsTable();
            renderOverviewTestimonials();
            updateStatsUI();
            closeReviewModal();
            loadAllData();
        } catch (err) {
            showModalError('modal-review', err.message || 'Failed to save review to database.');
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });
}

// ============================================================================
// 9. API & DATABASE CONFIGURATION MODAL HANDLERS
// ============================================================================
function openApiConfigModal() {
    clearModalError('modal-api-config');
    document.getElementById('cfg-api-url').value = window.getApiUrl();
    document.getElementById('cfg-ping-result').classList.add('hidden');
    document.getElementById('modal-api-config').classList.remove('hidden');
    lucide.createIcons();
}

function closeApiConfigModal() {
    document.getElementById('modal-api-config').classList.add('hidden');
}

function resetDefaultApiUrl() {
    document.getElementById('cfg-api-url').value = window.CLINIC_CONFIG.DEFAULT_API_URL;
}

function saveApiConfig() {
    const url = document.getElementById('cfg-api-url').value.trim();
    if (!url) {
        showToast('API URL cannot be empty.', 'error');
        return;
    }
    localStorage.setItem('drgopi_api_url', url);
    showToast('API Endpoint saved.');
    closeApiConfigModal();
    checkApiHealth();
    loadAllData();
}

async function testApiConnection() {
    const resultBox = document.getElementById('cfg-ping-result');
    resultBox.className = 'p-3 rounded-xl text-[11px] font-mono leading-relaxed bg-slate-100 text-slate-700 block';
    resultBox.textContent = 'Pinging API bridge...';

    const testUrl = document.getElementById('cfg-api-url').value.trim();
    const startTime = performance.now();

    try {
        const res = await fetch(`${testUrl}?action=ping`, { method: 'GET' });
        const latency = Math.round(performance.now() - startTime);
        const data = await res.json();

        if (res.ok && data.success) {
            resultBox.className = 'p-3 rounded-xl text-[11px] font-mono leading-relaxed bg-emerald-50 text-emerald-800 border border-emerald-200 block';
            resultBox.innerHTML = `✅ <strong>Status Online (${latency}ms)</strong><br>Service: ${data.service}<br>Version: ${data.version}<br>Server Time: ${data.time}`;
        } else {
            resultBox.className = 'p-3 rounded-xl text-[11px] font-mono leading-relaxed bg-amber-50 text-amber-800 border border-amber-200 block';
            resultBox.innerHTML = `⚠️ <strong>Connected with warning</strong>: ${data.error || 'Check database configuration'}`;
        }
    } catch (err) {
        resultBox.className = 'p-3 rounded-xl text-[11px] font-mono leading-relaxed bg-rose-50 text-rose-800 border border-rose-200 block';
        resultBox.innerHTML = `❌ <strong>Cannot reach API endpoint</strong><br>${err.message}<br><small>Ensure api/api.php is uploaded to the server and database credentials in api/.env are correct.</small>`;
    }
}

async function triggerDbSetup() {
    if (confirm('This will execute the SQL schema to create tables and insert starter data in your MySQL database. Proceed?')) {
        try {
            showToast('Initializing MySQL tables and starter data...');
            const res = await window.clinicApi.setupDatabase();
            if (res.success) {
                showToast('MySQL Database initialized successfully with starter data!');
                loadAllData();
            }
        } catch (err) {
            showToast('Setup error: ' + err.message, 'error');
        }
    }
}

// Utility: HTML Escape
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
