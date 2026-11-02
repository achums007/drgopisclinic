/**
 * Dr. Gopi's Clinic - Public Dynamic Frontend Data Loader
 * 
 * Fetches dynamic data from the GoDaddy MySQL API bridge (with offline cache fallback)
 * and renders products, books, articles, and patient testimonials with Base64 BLOB images.
 */

document.addEventListener('DOMContentLoaded', async () => {
    initDynamicNavigation();

    // 1. Home Page Dynamic Sections
    if (document.getElementById('dynamic-testimonials-wrapper')) {
        await loadDynamicTestimonials();
    }
    if (document.getElementById('dynamic-articles-wrapper')) {
        await loadDynamicArticlesHome();
    }
    if (document.getElementById('dynamic-home-books-wrapper')) {
        await loadDynamicBooksHome();
    }
    if (document.getElementById('dynamic-home-products-wrapper')) {
        await loadDynamicProductsHome();
    }

    // 2. Books Page
    if (document.getElementById('dynamic-books-wrapper')) {
        await loadDynamicBooksPage();
    }

    // 3. Products / Personal Care Page
    if (document.getElementById('dynamic-products-wrapper')) {
        await loadDynamicProductsPage();
    }

    // 4. Dedicated Articles Page
    if (document.getElementById('dynamic-articles-page-wrapper')) {
        await loadDynamicArticlesPage();
    }
});

// Update Header / Nav across pages to link Articles & Admin
function initDynamicNavigation() {
    const menus = document.querySelectorAll('#menu');
    menus.forEach(menu => {
        // Check if "Articles" link exists
        if (!menu.innerHTML.includes('articles.html')) {
            const servicesItem = menu.querySelector('li a[href*="services.html"]')?.parentElement;
            const articlesLi = document.createElement('li');
            articlesLi.className = 'nav-item';
            articlesLi.innerHTML = '<a class="nav-link" href="articles.html">Articles</a>';
            if (servicesItem) {
                servicesItem.after(articlesLi);
            } else {
                menu.appendChild(articlesLi);
            }
        }
    });

    // Add Admin CMS shortcut link in footer if present
    const copyrightRow = document.querySelector('.footer-copyright .col-lg-12');
    if (copyrightRow && !copyrightRow.innerHTML.includes('admin/')) {
        const adminLink = document.createElement('p');
        adminLink.className = 'mt-1 text-center';
        adminLink.innerHTML = '<a href="admin/index.html" class="text-muted" style="font-size: 11px; opacity: 0.6; text-decoration: none;">🔐 Clinic Admin CMS</a>';
        copyrightRow.appendChild(adminLink);
    }
}

// ----------------------------------------------------------------------------
// 1. HOME: DYNAMIC PATIENT TESTIMONIALS
// ----------------------------------------------------------------------------
async function loadDynamicTestimonials() {
    const wrapper = document.getElementById('dynamic-testimonials-wrapper');
    if (!wrapper) return;

    try {
        const testimonials = await window.clinicApi.getTestimonials(false);
        if (!testimonials || !testimonials.length) return;

        wrapper.innerHTML = testimonials.map(t => `
            <div class="swiper-slide">
                <div class="testimonial-item">	
                    <div class="testimonial-header">
                        <div class="testimonial-quote-image">
                            <img src="images/icon-testimonial-quote.svg" alt="Quote">
                        </div>
                        <div class="testimonial-content">
                            <p style="font-weight: 500; color: #222;">
                                <strong style="color: #0b5e54; text-transform: uppercase;">${escapeHtml(t.condition_treated || 'General Consultation')}:</strong> 
                                "${escapeHtml(t.review_text || '')}"
                            </p>
                        </div>
                    </div>
                    <div class="testimonial-body">
                        <div class="author-image">
                            <figure class="image-anime">
                                <img src="images/drg/user.png" alt="Patient">
                            </figure>
                        </div>            
                        <div class="author-content">
                            <h3 style="text-transform: uppercase; font-size: 16px;">${escapeHtml(t.patient_name || 'Verified Patient')}</h3>
                            <p style="color: #0b5e54; font-weight: 600; font-size: 12px; letter-spacing: 1px;">${escapeHtml(t.location || 'INDIA')}</p>
                        </div>
                    </div>													
                </div>
            </div>
        `).join('');

        // Reinitialize or update swiper
        if (window.Swiper && document.querySelector('.testimonial-slider .swiper')) {
            const swiperEl = document.querySelector('.testimonial-slider .swiper');
            if (swiperEl.swiper) {
                swiperEl.swiper.update();
            } else {
                new Swiper(swiperEl, {
                    slidesPerView: 1,
                    speed: 1000,
                    spaceBetween: 30,
                    loop: testimonials.length > 1,
                    autoplay: { delay: 4000, disableOnInteraction: false },
                    navigation: {
                        nextEl: '.testimonial-button-next',
                        prevEl: '.testimonial-button-prev',
                    }
                });
            }
        }
    } catch (err) {
        console.warn('Error loading dynamic testimonials:', err);
    }
}

// ----------------------------------------------------------------------------
// 2. HOME: DYNAMIC LATEST ARTICLES
// ----------------------------------------------------------------------------
async function loadDynamicArticlesHome() {
    const wrapper = document.getElementById('dynamic-articles-wrapper');
    if (!wrapper) return;

    try {
        const articles = await window.clinicApi.getArticles();
        if (!articles || !articles.length) return;

        // Render up to 3 articles on home page
        const featured = articles.slice(0, 3);
        wrapper.innerHTML = featured.map((a, idx) => `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="blog-item wow fadeInUp" data-wow-delay="${idx * 0.2}s" style="height: 100%; display: flex; flex-direction: column;">
                    <div class="post-featured-image" data-cursor-text="Read">
                        <figure>
                            <a href="articles.html?id=${a.id}" class="image-anime">
                                <img src="${a.thumbnail_data || 'images/drg/hand_pain.jpg'}" alt="${escapeHtml(a.title)}" style="height: 220px; width: 100%; object-fit: cover; border-radius: 12px 12px 0 0;">
                            </a>
                        </figure>
                    </div>
                    <div class="post-item-body" style="flex: 1; padding: 20px;">
                        <span class="badge" style="background-color: #eefcf8; color: #0b5e54; font-weight: 600; margin-bottom: 8px; display: inline-block; padding: 4px 10px; border-radius: 20px;">${escapeHtml(a.category || 'Health Guide')}</span>
                        <h2 style="font-size: 18px; margin-top: 5px;"><a href="articles.html?id=${a.id}">${escapeHtml(a.title)}</a></h2>
                        <p style="font-size: 13px; line-height: 1.6; color: #666; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(a.content || '')}</p>
                    </div>
                    <div class="post-item-footer" style="padding: 0 20px 20px;">
                        <a href="articles.html?id=${a.id}" class="read-more-btn">read full article</a>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.warn('Error loading dynamic articles:', err);
    }
}

// ----------------------------------------------------------------------------
// 2B. HOME: FEATURED BOOKS BY DR. K.S. GOPI (MySQL LONGBLOB Covers)
// ----------------------------------------------------------------------------
async function loadDynamicBooksHome() {
    const wrapper = document.getElementById('dynamic-home-books-wrapper');
    if (!wrapper) return;

    try {
        const books = await window.clinicApi.getBooks();
        if (!books || !books.length) return;

        const featured = books.slice(0, 3);
        wrapper.innerHTML = featured.map((b, idx) => `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="blog-item wow fadeInUp" data-wow-delay="${idx * 0.2}s" style="height: 100%; display: flex; flex-direction: column; background: #fff; border-radius: 16px; border: 1px solid #eef0f2; box-shadow: 0 4px 20px rgba(0,0,0,0.03); overflow: hidden;">
                    <div class="post-featured-image" style="text-align: center; background: #fbfcfc; padding: 25px 15px 15px;">
                        <figure>
                            <img src="${b.cover_image_data || 'images/drg/books/Book 1.png'}" alt="${escapeHtml(b.title)}" style="max-height: 280px; max-width: 100%; object-fit: contain; border-radius: 6px; box-shadow: 0 8px 18px rgba(0,0,0,0.12);">
                        </figure>
                    </div>
                    <div class="post-item-body" style="flex: 1; padding: 20px;">
                        <h2 style="font-size: 18px; line-height: 1.35; margin-bottom: 10px; font-weight: 700;"><a href="books.html">${escapeHtml(b.title)}</a></h2>
                        <p style="font-size: 13px; line-height: 1.6; color: #555; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 15px;">
                            ${escapeHtml(b.summary || '')}
                        </p>
                    </div>
                    <div style="padding: 15px 20px 20px; border-top: 1px solid #f1f3f5; background: #fafbfc;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div>
                                <span style="font-size: 11px; text-transform: uppercase; color: #888; font-weight: 600; display: block;">Price</span>
                                <h3 style="font-size: 17px; font-weight: 700; color: #0b5e54; margin: 0;">₹${parseFloat(b.price || 0).toFixed(0)}</h3>
                            </div>
                            ${b.has_preview ? `
                                <button onclick="openBookPreviewModal(${b.id})" class="btn-default" style="padding: 6px 12px; font-size: 11px; border-radius: 8px;">
                                    Preview
                                </button>
                            ` : ''}
                        </div>
                        <a href="https://wa.me/919207011814?text=${encodeURIComponent('Hello Dr. Gopi Clinic, I would like to order the book: ' + b.title)}" target="_blank" class="btn-default" style="display: block; text-align: center; width: 100%; padding: 10px; font-size: 13px; border-radius: 10px; background-color: #25D366; color: #fff; text-transform: uppercase;">
                            <i class="fa fa-whatsapp mr-1"></i> Order via WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.warn('Error loading home books:', err);
    }
}

// ----------------------------------------------------------------------------
// 2C. HOME: FEATURED PRODUCTS (MySQL LONGBLOB Images)
// ----------------------------------------------------------------------------
async function loadDynamicProductsHome() {
    const wrapper = document.getElementById('dynamic-home-products-wrapper');
    if (!wrapper) return;

    try {
        const products = await window.clinicApi.getProducts();
        if (!products || !products.length) return;

        const featured = products.slice(0, 3);
        wrapper.innerHTML = featured.map((p, idx) => `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="blog-item wow fadeInUp" data-wow-delay="${idx * 0.2}s" style="height: 100%; display: flex; flex-direction: column; background: #fff; border-radius: 16px; border: 1px solid #eef0f2; box-shadow: 0 4px 20px rgba(0,0,0,0.03); overflow: hidden;">
                    <div style="text-align: center; background: #fbfcfc; padding: 25px 15px;">
                        <figure>
                            <img src="${p.image_data || 'images/drg/personalcare/p1.png'}" alt="${escapeHtml(p.title)}" style="max-height: 240px; max-width: 100%; object-fit: contain; border-radius: 8px;">
                        </figure>
                    </div>
                    <div class="post-item-body" style="flex: 1; padding: 20px;">
                        <span class="badge" style="background-color: #eefcf8; color: #0b5e54; font-weight: 600; margin-bottom: 8px; display: inline-block; padding: 4px 10px; border-radius: 20px;">${escapeHtml(p.category || 'Personal Care')}</span>
                        <h2 style="font-size: 18px; line-height: 1.35; margin-bottom: 10px; font-weight: 700;"><a href="personal-care.html">${escapeHtml(p.title)}</a></h2>
                        <p style="font-size: 13px; line-height: 1.6; color: #666; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(p.description || '')}</p>
                    </div>
                    <div style="padding: 15px 20px 20px; border-top: 1px solid #f1f3f5; background: #fafbfc;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div>
                                <span style="font-size: 11px; text-transform: uppercase; color: #888; font-weight: 600; display: block;">Price</span>
                                <h3 style="font-size: 17px; font-weight: 700; color: #0b5e54; margin: 0;">₹${parseFloat(p.price || 0).toFixed(0)}</h3>
                            </div>
                        </div>
                        <a href="https://wa.me/919207011814?text=${encodeURIComponent('Hello Dr. Gopi Clinic, I would like to order: ' + p.title)}" target="_blank" class="btn-default" style="display: block; text-align: center; width: 100%; padding: 10px; font-size: 13px; border-radius: 10px; background-color: #25D366; color: #fff; text-transform: uppercase;">
                            <i class="fa fa-whatsapp mr-1"></i> Order via WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.warn('Error loading home products:', err);
    }
}

// ----------------------------------------------------------------------------
// 3. BOOKS PAGE: DYNAMIC RENDERING (MySQL LONGBLOB Covers & Sample PDFs)
// ----------------------------------------------------------------------------
async function loadDynamicBooksPage() {
    const wrapper = document.getElementById('dynamic-books-wrapper');
    if (!wrapper) return;

    try {
        const books = await window.clinicApi.getBooks();
        if (!books || !books.length) return;

        wrapper.innerHTML = books.map((b, idx) => `
            <div class="col-lg-4 col-md-6 book-border mb-4">
                <div class="blog-item wow fadeInUp" data-wow-delay="${(idx % 3) * 0.2}s" style="height: 100%; display: flex; flex-direction: column; background: #fff; border-radius: 16px; border: 1px solid #eef0f2; box-shadow: 0 4px 20px rgba(0,0,0,0.03); overflow: hidden;">
                    <div class="post-featured-image" data-cursor-text="View" style="text-align: center; background: #fbfcfc; padding: 25px 15px 15px;">
                        <figure>
                            <img src="${b.cover_image_data || 'images/drg/books/Book 1.png'}" alt="${escapeHtml(b.title)}" style="max-height: 320px; max-width: 100%; object-fit: contain; border-radius: 6px; box-shadow: 0 8px 18px rgba(0,0,0,0.12);">
                        </figure>
                    </div>
                    <div class="post-item-body" style="flex: 1; padding: 25px;">
                        <h2 style="font-size: 19px; line-height: 1.35; margin-bottom: 12px; font-weight: 700;"><a href="#">${escapeHtml(b.title)}</a></h2>
                        <div style="font-size: 13px; line-height: 1.65; color: #555; white-space: pre-line; margin-bottom: 15px;">
                            ${escapeHtml(b.summary || '')}
                        </div>
                    </div>
                    <div style="padding: 15px 25px 25px; border-top: 1px solid #f1f3f5; background: #fafbfc;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div>
                                <span style="font-size: 11px; text-transform: uppercase; color: #888; font-weight: 600; display: block;">Price</span>
                                <h3 style="font-size: 18px; font-weight: 700; color: #0b5e54; margin: 0;">₹${parseFloat(b.price || 0).toFixed(0)} <span style="font-size: 12px; color: #777; font-weight: normal;">${b.price_display ? `(${b.price_display})` : ''}</span></h3>
                            </div>
                            ${b.has_preview ? `
                                <button onclick="openBookPreviewModal(${b.id})" class="btn-default" style="padding: 8px 14px; font-size: 12px; border-radius: 8px;">
                                    Sample Preview
                                </button>
                            ` : ''}
                        </div>
                        <a href="https://wa.me/919207011814?text=${encodeURIComponent('Hello Dr. Gopi Clinic, I would like to purchase the book: ' + b.title)}" target="_blank" class="btn-default" style="display: block; text-align: center; width: 100%; padding: 10px; font-size: 13px; border-radius: 10px; background-color: #25D366; color: #fff; text-transform: uppercase;">
                            <i class="fa fa-whatsapp mr-1"></i> Order via WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.warn('Error loading dynamic books:', err);
    }
}

// Book Preview Modal Trigger
window.openBookPreviewModal = async function(bookId) {
    const book = await window.clinicApi.getBook(bookId);
    if (!book) return;

    if (book.preview_download_url) {
        // Direct stream URL
        const downloadUrl = `${window.getApiUrl()}?action=download_preview&id=${bookId}`;
        window.open(downloadUrl, '_blank');
    } else {
        alert('Sample PDF preview for "' + book.title + '" is currently being updated.');
    }
};

// ----------------------------------------------------------------------------
// 4. PRODUCTS PAGE: DYNAMIC RENDERING (MySQL LONGBLOB Images)
// ----------------------------------------------------------------------------
async function loadDynamicProductsPage() {
    const wrapper = document.getElementById('dynamic-products-wrapper');
    if (!wrapper) return;

    try {
        const products = await window.clinicApi.getProducts();
        if (!products || !products.length) return;

        wrapper.innerHTML = products.map((p, idx) => `
            <div class="col-lg-4 col-md-6 book-border mb-4">
                <div class="blog-item wow fadeInUp" data-wow-delay="${(idx % 3) * 0.2}s" style="height: 100%; display: flex; flex-direction: column; background: #fff; border-radius: 16px; border: 1px solid #eef0f2; box-shadow: 0 4px 20px rgba(0,0,0,0.03); overflow: hidden;">
                    <div style="text-align: center; background: #fbfcfc; padding: 25px 15px;">
                        <figure>
                            <img src="${p.image_data || 'images/drg/personalcare/p1.png'}" alt="${escapeHtml(p.title)}" style="max-height: 260px; max-width: 100%; object-fit: contain; border-radius: 8px;">
                        </figure>
                    </div>
                    <div class="post-item-body" style="flex: 1; padding: 25px;">
                        <span class="badge" style="background-color: #eefcf8; color: #0b5e54; font-weight: 600; margin-bottom: 8px; display: inline-block; padding: 4px 10px; border-radius: 20px;">${escapeHtml(p.category || 'Personal Care')}</span>
                        <h2 style="font-size: 19px; line-height: 1.35; margin-bottom: 12px; font-weight: 700;"><a href="#">${escapeHtml(p.title)}</a></h2>
                        <p style="font-size: 13px; line-height: 1.65; color: #555; white-space: pre-line;">${escapeHtml(p.description || '')}</p>
                    </div>
                    <div style="padding: 15px 25px 25px; border-top: 1px solid #f1f3f5; background: #fafbfc;">
                        <div style="margin-bottom: 12px;">
                            <span style="font-size: 11px; text-transform: uppercase; color: #888; font-weight: 600; display: block;">Price</span>
                            <h3 style="font-size: 20px; font-weight: 700; color: #0b5e54; margin: 0;">₹${parseFloat(p.price || 0).toFixed(2)}</h3>
                        </div>
                        <a href="https://wa.me/919207011814?text=${encodeURIComponent('Hello Dr. Gopi Clinic, I would like to order: ' + p.title)}" target="_blank" class="btn-default" style="display: block; text-align: center; width: 100%; padding: 10px; font-size: 13px; border-radius: 10px; background-color: #25D366; color: #fff; text-transform: uppercase;">
                            <i class="fa fa-whatsapp mr-1"></i> Order via WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.warn('Error loading dynamic products:', err);
    }
}

// ----------------------------------------------------------------------------
// 5. ARTICLES PAGE: DYNAMIC RENDERING & MODAL VIEWER
// ----------------------------------------------------------------------------
async function loadDynamicArticlesPage() {
    const wrapper = document.getElementById('dynamic-articles-page-wrapper');
    if (!wrapper) return;

    try {
        const articles = await window.clinicApi.getArticles();
        if (!articles || !articles.length) return;

        // Render articles
        renderArticleList(articles);

        // Filter / Search listeners
        const searchInput = document.getElementById('article-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = articles.filter(a => 
                    (a.title && a.title.toLowerCase().includes(query)) ||
                    (a.category && a.category.toLowerCase().includes(query)) ||
                    (a.content && a.content.toLowerCase().includes(query))
                );
                renderArticleList(filtered);
            });
        }

        // Check if direct ID in URL: ?id=X
        const urlParams = new URLSearchParams(window.location.search);
        const artId = urlParams.get('id');
        if (artId) {
            const match = articles.find(a => a.id == artId);
            if (match) {
                setTimeout(() => openArticleReader(match), 300);
            }
        }
    } catch (err) {
        console.warn('Error loading dynamic articles page:', err);
    }

    function renderArticleList(list) {
        if (!list.length) {
            wrapper.innerHTML = `<div class="col-12 py-5 text-center text-muted">No health articles found matching your query.</div>`;
            return;
        }

        wrapper.innerHTML = list.map((a, idx) => `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="blog-item wow fadeInUp" data-wow-delay="${(idx % 3) * 0.2}s" style="height: 100%; display: flex; flex-direction: column; background: #fff; border-radius: 16px; border: 1px solid #eef0f2; box-shadow: 0 4px 20px rgba(0,0,0,0.03); overflow: hidden;">
                    <div class="post-featured-image" data-cursor-text="Read">
                        <figure>
                            <img src="${a.thumbnail_data || 'images/drg/hand_pain.jpg'}" alt="${escapeHtml(a.title)}" style="height: 220px; width: 100%; object-fit: cover;">
                        </figure>
                    </div>
                    <div class="post-item-body" style="flex: 1; padding: 25px;">
                        <span class="badge" style="background-color: #eefcf8; color: #0b5e54; font-weight: 600; margin-bottom: 8px; display: inline-block; padding: 4px 10px; border-radius: 20px;">${escapeHtml(a.category || 'Condition Guide')}</span>
                        <h2 style="font-size: 19px; line-height: 1.35; margin-bottom: 12px; font-weight: 700;">${escapeHtml(a.title)}</h2>
                        <p style="font-size: 13px; line-height: 1.65; color: #555; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(a.content || '')}</p>
                    </div>
                    <div class="post-item-footer" style="padding: 15px 25px 25px; border-top: 1px solid #f1f3f5; background: #fafbfc;">
                        <button onclick="readArticleModalById(${a.id})" class="read-more-btn" style="background: none; border: none; cursor: pointer; color: #0b5e54; font-weight: 700; text-transform: uppercase; font-size: 13px;">
                            Read Full Article &rarr;
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Full Article Reading Modal
window.readArticleModalById = async function(id) {
    const art = await window.clinicApi.getArticle(id);
    if (art) openArticleReader(art);
};

function openArticleReader(art) {
    let modal = document.getElementById('public-article-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'public-article-modal';
        modal.style.cssText = 'position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px;';
        modal.innerHTML = `
            <div style="background: #fff; max-width: 720px; width: 100%; border-radius: 16px; overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                <div style="position: relative; height: 260px; background: #111;">
                    <img id="pam-img" src="" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.85;">
                    <button onclick="document.getElementById('public-article-modal').style.display='none'" style="position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.5); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; font-size: 18px; cursor: pointer;">&times;</button>
                </div>
                <div style="padding: 30px; overflow-y: auto; flex: 1;">
                    <span id="pam-category" style="background-color: #eefcf8; color: #0b5e54; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 20px; text-transform: uppercase;"></span>
                    <h2 id="pam-title" style="font-size: 24px; font-weight: 800; margin: 12px 0 16px; color: #111;"></h2>
                    <div id="pam-content" style="font-size: 15px; line-height: 1.8; color: #444; white-space: pre-line;"></div>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-size: 12px; color: #888;">Authored by Dr. K.S. Gopi (BSc, BHMS, MD)</span>
                        <a id="pam-whatsapp-btn" href="#" target="_blank" style="background: #25D366; color: #fff; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;">Consult for this Condition</a>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    document.getElementById('pam-img').src = art.thumbnail_data || 'images/drg/hand_pain.jpg';
    document.getElementById('pam-category').textContent = art.category || 'Health Guide';
    document.getElementById('pam-title').textContent = art.title;
    document.getElementById('pam-content').textContent = art.content;
    document.getElementById('pam-whatsapp-btn').href = `https://wa.me/919207011814?text=${encodeURIComponent('Hello Dr. Gopi Clinic, I read your article about "' + art.title + '" and would like to consult.')}`;

    modal.style.display = 'flex';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
