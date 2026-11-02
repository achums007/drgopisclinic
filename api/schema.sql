-- ========================================================================
-- Dr. Gopi's Clinic (drgopiclinic.com) - MySQL Database Schema
-- Compatible with MySQL / MariaDB (phpMyAdmin)
-- Note: All image/binary data is stored directly in MySQL as LONGBLOB
-- ========================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------
-- Table 1: products
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY, 
    `title` VARCHAR(255) NOT NULL, 
    `category` VARCHAR(100) DEFAULT 'General', 
    `price` DECIMAL(10,2) DEFAULT 0.00, 
    `description` TEXT, 
    `image_data` LONGBLOB,           -- Direct image binary/base64 storage
    `image_mime_type` VARCHAR(50) DEFAULT 'image/png',  -- e.g., 'image/jpeg', 'image/png'
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------
-- Table 2: books
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `books` (
    `id` INT AUTO_INCREMENT PRIMARY KEY, 
    `title` VARCHAR(255) NOT NULL, 
    `price` DECIMAL(10,2) DEFAULT 0.00, 
    `summary` TEXT, 
    `cover_image_data` LONGBLOB,     -- Direct book cover storage
    `cover_mime_type` VARCHAR(50) DEFAULT 'image/png', 
    `preview_file_data` LONGBLOB,    -- PDF/Sample preview binary storage
    `preview_mime_type` VARCHAR(50) DEFAULT 'application/pdf', 
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------
-- Table 3: articles
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `articles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY, 
    `title` VARCHAR(255) NOT NULL, 
    `category` VARCHAR(100) DEFAULT 'General Health', 
    `content` TEXT, 
    `thumbnail_data` LONGBLOB,       -- Direct article thumbnail storage
    `thumbnail_mime_type` VARCHAR(50) DEFAULT 'image/jpeg', 
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------
-- Table 4: testimonials
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `testimonials` (
    `id` INT AUTO_INCREMENT PRIMARY KEY, 
    `patient_name` VARCHAR(100), 
    `location` VARCHAR(100), 
    `condition_treated` VARCHAR(255), 
    `review_text` TEXT, 
    `is_published` BOOLEAN DEFAULT TRUE, 
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------
-- Initial Starter Seeds (Real Clinic Data)
-- ------------------------------------------------------------------------

-- Starter Products
INSERT INTO `products` (`id`, `title`, `category`, `price`, `description`, `image_mime_type`) 
VALUES (
    1, 
    'KARTHI HERBAL HAIR CARE OIL - 100 ML', 
    'Hair Care', 
    200.00, 
    'For hair loss, hair growth, premature grey hair, dandruff. Formulated with extracts of Amla, Arnica Montana, Brahmi, Jaborandi, Eclypta alba, Aloe vera, Thuja occidentalis, Ceanothus, Neela Amari, Moringa oleifera, Armoracia sativa and pure coconut oil. Price: INR 200 (India), $25 USD.', 
    'image/png'
) ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- Starter Books by Dr. K.S. Gopi (BSc, BHMS, MD)
INSERT INTO `books` (`id`, `title`, `price`, `summary`, `cover_mime_type`, `preview_mime_type`) 
VALUES 
(
    1, 
    'Homeopathy Easy Prescriber: 2nd Edition', 
    2250.00, 
    'Easy prescriber book can be a useful resource for homeopathic practitioners and students alike. It provides a concise and practical guide to homoeopathic remedies and their indications, making it easier to prescribe and match remedies to specific symptoms and conditions.\n\nSalient Features:\n• A comprehensive list of homeopathic remedies and their indications.\n• Clear and concise descriptions of remedy symptoms and uses.\n• Dose and repetition of dose is clearly mentioned in each disease.\n• Crown 1/4 size, 977 pages, double color printing, hardbound.\n• Price: Rs. 2250 (India), $100 USD.', 
    'image/png', 
    'application/pdf'
),
(
    2, 
    'Diseases of Skin', 
    1450.00, 
    'Salient Features:\n• A practical guide for practitioners and medical students.\n• Clinical diagnosis and treatment of diseases thoroughly explained.\n• Colour photographs for proper identification of disease condition.\n• Easy selection of homeopathic remedy and potency.\n• Miasmatic analysis of disease condition.\n• 134 skin diseases and their homeopathic management.\n• Crown 1/4 size, 522 pages in full 4-color format.', 
    'image/png', 
    'application/pdf'
),
(
    3, 
    'Mother Tincture & Low Potency', 
    650.00, 
    'Salient Features:\n• A practical guide for practitioners and medical students.\n• Includes almost all disease conditions and their Homeopathic Management with mother tinctures and low potency.\n• Materia medica of each medicine.\n• Price: Rs. 650 (India), $35 USD.', 
    'image/png', 
    'application/pdf'
),
(
    4, 
    'Psychiatric Diseases', 
    550.00, 
    'Salient Features:\n• A practical clinical guide for practitioners and medical students.\n• Includes almost all psychiatric disorders including their management with homeopathic medicines.\n• Detailed symptom matching and clinical rubrics.\n• Price: Rs. 550 (India), $30 USD.', 
    'image/png', 
    'application/pdf'
) ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- Starter Health Articles
INSERT INTO `articles` (`id`, `title`, `category`, `content`, `thumbnail_mime_type`) 
VALUES 
(
    1, 
    'Homeopathy for Trigger Finger', 
    'Orthopedics & Pain', 
    'Trigger finger happens when the tendon that controls that finger cannot glide smoothly in the sheath that surrounds it. This is usually due to inflammation of the tendon or tendon sheath, often resulting in stiffness, clicking or locking sensation when bending the finger. Key homeopathic remedies include Ruta Graveolens, Rhus Tox, and Causticum tailored to the patient\'s specific symptom modality.', 
    'image/jpeg'
),
(
    2, 
    'Homeopathy for Back Pain & Sciatica', 
    'Orthopedics & Pain', 
    'Back pain from muscle strain, overstraining, overstretching or from lifting heavy weight. Pain worse from rest, better from walking, and relieved by hard pressure responds remarkably well to individualized remedies like Rhus Tox, Bryonia Alba, and Kali Carb. Chronic lumbar spondylosis and disc issues can be managed conservatively with homeopathy.', 
    'image/jpeg'
),
(
    3, 
    'Indigestion, Acidity and Homeopathic Management', 
    'Gastroenterology', 
    'Indigestion (dyspepsia) involves persistent discomfort in the upper abdomen, heartburn, and bloating. Homeopathic remedies like Nux Vomica, Lycopodium, and Carbo Veg provide rapid, holistic relief by addressing constitutional metabolism, diet indiscretions, and stress-related digestive sluggishness without suppressing natural acid secretion.', 
    'image/jpeg'
) ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- Starter Verified Patient Testimonials
INSERT INTO `testimonials` (`id`, `patient_name`, `location`, `condition_treated`, `review_text`, `is_published`) 
VALUES 
(
    1, 
    'Ananya', 
    'Kerala', 
    'Schizophrenia', 
    'Right now, I would like let you know that my daughter is doing better than ever. Her attitude is greatly improved from giving her the remedies you advised. So, thank you so much for that. I was wondering if you would like a testimonial for your website on the results you achieved for my daughter.', 
    1
),
(
    2, 
    'Chaitanya', 
    'USA', 
    'Schizophrenia', 
    'Doctor, you saved my life. I am now free from all my symptoms, and I have started my studies. God help you doctor.', 
    1
),
(
    3, 
    'Sampurna Mohanty', 
    'USA', 
    'Brain Tumor', 
    'Recent CT shows that the size of the tumour is reduced, and I am free from symptoms. Thanks, Doctor, for your service.', 
    1
),
(
    4, 
    'Sree Lakshmi', 
    'Kerala', 
    'Anal Fistula', 
    'Thanks, doctor my fistula openings are completely closed. Your medicines acted magically.', 
    1
),
(
    5, 
    'Iman Khimani', 
    'Australia', 
    'Infertility', 
    'I recommend Dr Gopi\'s clinic for infertility cases. After 9 years of my marriage, I was conceived after the treatment from Dr. Gopi\'s clinic. I strongly recommend Dr Gopi without any second thoughts for anyone looking for homoeopathic treatment. All the best.', 
    1
),
(
    6, 
    'Thomas', 
    'Delhi', 
    'Trichotillomania (Hair Pulling Disorder)', 
    'Doctor, my daughter is completely free from this bad habit. Thanks a lot.', 
    1
) ON DUPLICATE KEY UPDATE `patient_name` = VALUES(`patient_name`);

SET FOREIGN_KEY_CHECKS = 1;
