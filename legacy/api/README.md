# Dr. Gopi's Clinic - Backend & API Setup Guide

This folder contains the PHP / MySQL REST API bridge that connects your GitHub Pages static frontend to your cPanel MySQL database.

---

## 🔒 Security Best Practice: Credential Separation

**Never commit your live MySQL database password to Git or GitHub!**

Instead of hardcoding passwords inside tracked PHP files:
1. `backend/config.php` is tracked in Git, but contains **NO passwords**. It dynamically reads credentials from environment variables or an untracked `.env` file.
2. The `.gitignore` file is configured to strictly ignore:
   - `backend/.env`
   - `backend/config.local.php`
3. You only set your real MySQL credentials **directly on the server** using either:
   - **Option A (Recommended):** Create a `backend/.env` file in cPanel using `backend/.env.example` as a template.
   - **Option B (Most Secure):** Place a `.clinic.env` file in your cPanel home directory (`/home/username/.clinic.env`) *above* the public web root so it can never be accessed via a browser or accidental git push.
   - **Option C:** In cPanel Apache `.htaccess` using `SetEnv DB_PASS "YourPassword"`.

---

## 🛠️ Step-by-Step cPanel Deployment

### Step 1: Create the MySQL Database & User in cPanel
1. Log in to your **cPanel** dashboard.
2. Under the **Databases** section, click **MySQL Databases**.
3. Create a new database: e.g., `drgopi_clinic_db` (or prefix like `username_clinic`).
4. Under **MySQL Users**, create a new user: e.g., `drgopi_user` with a strong password.
5. Under **Add User to Database**, select your new user and database, and click **Add**.
6. Check **ALL PRIVILEGES** and click **Make Changes**.

---

### Step 2: Import the Database Schema
1. In cPanel, click **phpMyAdmin** under the **Databases** section.
2. Select your newly created clinic database on the left sidebar.
3. Click the **Import** tab at the top.
4. Choose the file `backend/schema.sql`.
5. Click **Import** (or **Go**).
   - *This creates all 4 tables (`products`, `books`, `articles`, `testimonials`) with `LONGBLOB` binary fields and inserts Dr. Gopi's starter books, products, articles, and reviews.*

---

### Step 3: Set Your Credentials on the Server
1. In cPanel **File Manager**, create a folder named `api` inside `public_html/` (e.g. `public_html/api/`).
2. Upload the backend files:
   - `api.php`
   - `config.php`
   - `.htaccess`
   - `schema.sql`
3. Inside that `public_html/api/` folder on your server, create a new file named `.env` (or copy from `.env.example`):
   ```env
   DB_HOST=localhost
   DB_NAME=your_actual_cpanel_dbname
   DB_USER=your_actual_cpanel_dbuser
   DB_PASS=YourActualStrongPassword
   DB_CHARSET=utf8mb4

   # Secret Admin Passcode for CMS Dashboard verification
   ADMIN_SECRET_TOKEN=DrGopi@Clinic#Admin2026!
   ```
4. Save the file. Because `.env` is listed in `.gitignore` and protected by `.htaccess`, it will **never be committed to GitHub or exposed over HTTP**.

---

### Step 4: Verify the API Bridge
Visit in your browser:
`https://drgopiclinic.com/api/api.php?action=ping`

You should see:
```json
{
  "success": true,
  "status": "online",
  "service": "Dr. Gopi's Clinic API Bridge",
  "version": "2.0.0"
}
```
