/**
 * Dr. Gopi's Clinic - Frontend Environment & API Configuration
 * 
 * You can override the API URL by setting it in localStorage ('drgopi_api_url')
 * or via the Admin Dashboard Settings modal.
 */

// Helper to resolve relative or absolute API URL
function resolveClinicApiUrl() {
    if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
        // When accessed inside the /admin/ folder
        if (window.location.pathname.indexOf('/admin') !== -1) {
            return '../api/api.php';
        }
        return 'api/api.php';
    }
    return 'https://drgopiclinic.com/api/api.php';
}

window.CLINIC_CONFIG = {
    // Default PHP API bridge URL (resolved dynamically relative to current folder)
    DEFAULT_API_URL: resolveClinicApiUrl(),
    
    // Fallback Admin Passcode for local demo mode if API is unreachable
    DEFAULT_ADMIN_PASSCODE: 'DrGopi@Clinic#Admin2026!',

    // Clinic Brand Metadata
    CLINIC_NAME: "Dr. Gopi's Clinic",
    DOCTOR_NAME: "Dr. K.S. Gopi (BSc, BHMS, MD)",
    WHATSAPP_NUMBER: "919207011814",
    WHATSAPP_LINK: "https://wa.me/919207011814",

    // Default Seed Data (Pre-populated so website works immediately even before DB configuration)
    INITIAL_SEEDS: {
        products: [
            {
                id: 1,
                title: "KARTHI HERBAL HAIR CARE OIL - 100 ML",
                category: "Hair Care",
                price: 200.00,
                description: "For hair loss, hair growth, premature grey hair, dandruff. Formulated with extracts of Amla, Arnica Montana, Brahmi, Jaborandi, Eclypta alba, Aloe vera, Thuja occidentalis, Ceanothus, Neela Amari, Moringa oleifera, Armoracia sativa and pure coconut oil. Price: INR 200 (India), $25 USD.",
                image_data: "images/drg/personalcare/p1.png",
                image_mime_type: "image/png"
            }
        ],
        books: [
            {
                id: 1,
                title: "Homeopathy Easy Prescriber: 2nd Edition",
                price: 2250.00,
                price_display: "Rs. 2250 (India), $100 USD",
                summary: "Easy prescriber book can be a useful resource for homeopathic practitioners and students alike. It provides a concise and practical guide to homeopathic remedies and their indications, making it easier to prescribe and match remedies to specific symptoms and conditions.\n\nSalient Features:\n• A comprehensive list of homeopathic remedies and their indications.\n• Clear and concise descriptions of remedy symptoms and uses.\n• Dose and repetition of dose is clearly mentioned in each disease.\n• Crown 1/4 size, 977 pages, double color printing, hardbound.",
                cover_image_data: "images/drg/books/Book 1.png",
                cover_mime_type: "image/png",
                has_preview: true
            },
            {
                id: 2,
                title: "Diseases of Skin",
                price: 1450.00,
                price_display: "Rs. 1450 (India), $75 USD",
                summary: "Salient Features:\n• A practical guide for practitioners and medical students.\n• Clinical diagnosis and treatment of diseases thoroughly explained.\n• Colour photographs for proper identification of disease condition.\n• Easy selection of homeopathic remedy and potency.\n• Miasmatic analysis of disease condition.\n• 134 skin diseases and their homeopathic management.\n• Crown 1/4 size, 522 pages in full 4-color format.",
                cover_image_data: "images/drg/books/Book 2.png",
                cover_mime_type: "image/png",
                has_preview: true
            },
            {
                id: 3,
                title: "Mother Tincture & Low Potency",
                price: 650.00,
                price_display: "Rs. 650 (India), $35 USD",
                summary: "Salient Features:\n• A practical guide for practitioners and medical students.\n• Includes almost all disease conditions and their Homeopathic Management with mother tinctures and low potency.\n• Materia medica of each medicine.\n• Crown 1/4 size, comprehensive clinical reference.",
                cover_image_data: "images/drg/books/Book 3.png",
                cover_mime_type: "image/png",
                has_preview: true
            },
            {
                id: 4,
                title: "Psychiatric Diseases",
                price: 550.00,
                price_display: "Rs. 550 (India), $30 USD",
                summary: "Salient Features:\n• A practical clinical guide for practitioners and medical students.\n• Includes almost all psychiatric disorders including their management with homeopathic medicines.\n• Detailed symptom matching, mind rubrics, and clinical potencies.",
                cover_image_data: "images/drg/books/Book 4.png",
                cover_mime_type: "image/png",
                has_preview: true
            }
        ],
        articles: [
            {
                id: 1,
                title: "Homeopathy for Trigger Finger",
                category: "Orthopedics & Pain",
                content: "Trigger finger happens when the tendon that controls that finger cannot glide smoothly in the sheath that surrounds it. This is usually due to inflammation of the tendon or tendon sheath, often resulting in stiffness, clicking or locking sensation when bending the finger. Key homeopathic remedies include Ruta Graveolens, Rhus Tox, and Causticum tailored to the patient's specific symptom modality.",
                thumbnail_data: "images/drg/hand_pain.jpg",
                thumbnail_mime_type: "image/jpeg",
                created_at: "2026-03-15"
            },
            {
                id: 2,
                title: "Homeopathy for Back Pain & Sciatica",
                category: "Orthopedics & Pain",
                content: "Back pain from muscle strain, overstraining, overstretching or from lifting heavy weight. Pain worse from rest, better from walking, and relieved by hard pressure responds remarkably well to individualized remedies like Rhus Tox, Bryonia Alba, and Kali Carb. Chronic lumbar spondylosis and disc issues can be managed conservatively with homeopathy.",
                thumbnail_data: "images/drg/back_pain.jpeg",
                thumbnail_mime_type: "image/jpeg",
                created_at: "2026-03-20"
            },
            {
                id: 3,
                title: "Indigestion, Acidity and Homeopathic Management",
                category: "Gastroenterology",
                content: "Indigestion (dyspepsia) involves persistent discomfort in the upper abdomen, heartburn, and bloating. Homeopathic remedies like Nux Vomica, Lycopodium, and Carbo Veg provide rapid, holistic relief by addressing constitutional metabolism, diet indiscretions, and stress-related digestive sluggishness without suppressing natural acid secretion.",
                thumbnail_data: "images/drg/indigestion.jpg",
                thumbnail_mime_type: "image/jpeg",
                created_at: "2026-04-02"
            }
        ],
        testimonials: [
            {
                id: 1,
                patient_name: "ANANYA",
                location: "KERALA",
                condition_treated: "Schizophrenia",
                review_text: "Right now, I would like let you know that my daughter is doing better than ever. Her attitude is greatly improved from giving her the remedies you advised. So, thank you so much for that. I was wondering if you would like a testimonial for your website on the results you achieved for my daughter.",
                is_published: true
            },
            {
                id: 2,
                patient_name: "CHAITANYA",
                location: "USA",
                condition_treated: "Schizophrenia",
                review_text: "Doctor, you saved my life. I am now free from all my symptoms, and I have started my studies. God help you doctor.",
                is_published: true
            },
            {
                id: 3,
                patient_name: "SAMPURNA MOHANTY",
                location: "USA",
                condition_treated: "Brain Tumor",
                review_text: "Recent CT shows that the size of the tumour is reduced, and I am free from symptoms. Thanks, Doctor, for your service.",
                is_published: true
            },
            {
                id: 4,
                patient_name: "SREE LAKSHMI",
                location: "KERALA",
                condition_treated: "Anal Fistula",
                review_text: "Thanks, doctor my fistula openings are completely closed. Your medicines acted magically.",
                is_published: true
            },
            {
                id: 5,
                patient_name: "IMAN KHIMANI",
                location: "AUSTRALIA",
                condition_treated: "Infertility",
                review_text: "I recommend Dr Gopi's clinic for infertility cases. After 9 years of my marriage, I was conceived after the treatment from Dr. Gopi's clinic. I strongly recommend Dr Gopi without any second thoughts for anyone looking for homoeopathic treatment. All the best.",
                is_published: true
            },
            {
                id: 6,
                patient_name: "THOMAS",
                location: "DELHI",
                condition_treated: "Trichotillomania (Hair Pulling Disorder)",
                review_text: "Doctor, my daughter is completely free from this bad habit. Thanks a lot.",
                is_published: true
            }
        ]
    }
};

// Getter helper for API Base URL
window.getApiUrl = function() {
    const custom = localStorage.getItem('drgopi_api_url');
    if (custom && custom.trim()) {
        return custom.trim();
    }
    return resolveClinicApiUrl();
};
