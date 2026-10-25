# 🧾 SpendLens — Smart Receipt & Personal Expense Tracker

> **An attractive, responsive, and privacy-focused personal expense tracker built with pure HTML, CSS, and modern JavaScript. Features automatic in-browser OCR receipt reading, a currency switcher (Rupees ₹, USD $, EUR €, etc.), an effective welcoming Home Page, and fair month-over-month analytics.**

---

## 🌟 What's New & Highlights

1. **🇮🇳 Multi-Currency Support (Rupees `₹` by Default)**:
   - Currency dropdown right in the header bar.
   - Switch between **Indian Rupee (`₹`)**, **US Dollar (`$`)**, **Euro (`€`)**, **British Pound (`£`)**, **Canadian Dollar (`C$`)**, **Australian Dollar (`A$`)**, or **Japanese Yen (`¥`)**.
   - Changing the currency dynamically recalculates and re-formats all dashboard metrics, charts, budget limits, history items, and reports using native localized formatting (e.g. `₹1,25,000.00`).

2. **🏠 Welcoming, User-Friendly Home Page (`#view-home`)**:
   - Time-sensitive greeting (*Good morning / Good evening!*).
   - Monthly spending pulse hero banner in high-contrast indigo gradient.
   - Prominent **"📊 Go to Full Dashboard ➔"** button for a clean 1-click transition.
   - **3 Quick Shortcut Cards**:
     - 📸 **Auto-Scan Receipt**: Upload or snap a receipt photo for instant automatic reading.
     - ✏️ **Add Manually**: Fill in transaction details when no receipt is available.
     - 📋 **View Spending History**: Search, filter, or export your financial records.
   - Live snapshot of recent transactions and attached receipt thumbnails directly on the home page.

3. **🔍 Automatic Receipt Reading (OCR) + Seamless Manual Entry**:
   - Integrated with **Tesseract.js** (100% in-browser WebAssembly/Web Worker OCR).
   - When a receipt image is uploaded, OCR automatically reads the text and extracts:
     - **Store / Provider Name** (e.g., Reliance Fresh, DMart, Blue Bottle, Apollo Pharmacy, Shell, etc.).
     - **Total Amount** (e.g., `₹2,350.50`).
     - **Transaction Date** (`YYYY-MM-DD` or `DD/MM/YYYY`).
     - **Category Suggestion** (Groceries, Cafe, Health, Transport, Utilities, etc.).
   - Pre-fills the form with detected details and shows an auto-read badge for quick confirmation.
   - **Manual Fallback**: If a receipt is blurry, handwritten, or a PDF, a clear notification guides you to enter details manually without any friction.
   - **Golden Rule Maintained**: Never saves automatically until you explicitly confirm the amount, date, and category.

4. **📊 Full Interactive Dashboard & Fair MoM Analytics**:
   - Donut chart of category distribution with center totals in your chosen currency.
   - Fair **apples-to-apples Month-over-Month comparison** (comparing the exact same elapsed days, e.g., *Oct 1–22 vs Sep 1–22*).
   - Budget progress bars with safe (green), warning (amber, >80%), and exceeded (red, >100%) color badges.

5. **🔒 100% Local-First Privacy**:
   - Zero cloud tracking or data collection. All OCR, transactions, and receipt documents stay in your browser's `localStorage`.
   - CSV export for Excel and JSON full backup & restore.

---

## 📁 File Structure

```
expense-tracker/
├── index.html                 # Semantic single-page application structure
├── css/
│   ├── main.css               # Design tokens, variables, typography, reset
│   ├── components.css         # Currency select, home hero, cards, modals, dropzone
│   └── responsive.css         # Mobile bottom navigation bar & responsive breakpoints
├── js/
│   ├── app.js                 # App controller, Home page rendering, currency switcher, routing
│   ├── storage.js             # LocalStorage manager, currency definitions, budgets, duplicates
│   ├── receipt.js             # In-browser Tesseract.js OCR engine, heuristic parser & compression
│   ├── charts.js              # Pure HTML5 Canvas Donut & Bar charts in active currency
│   ├── reports.js             # Monthly analytics, category shares, MoM comparison engine
│   └── export.js              # CSV exporter and JSON backup/restore handlers
├── sample-receipts/           # Bundled sample receipt image assets
└── README.md                  # Complete documentation and user guide
```

---

## 🏃 How to Open & Run

The application is already running live:
👉 **`http://localhost:8080`**

To launch or restart the server in PowerShell:

```powershell
cd C:\Users\prachi\.gemini\antigravity\scratch\expense-tracker
python -m http.server 8080
```

*(You can also double-click [`index.html`](file:///C:/Users/prachi/.gemini/antigravity/scratch/expense-tracker/index.html) to open it directly in any browser without needing a server!)*
