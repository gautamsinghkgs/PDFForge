# ⬡ PDFForge — Full MERN Stack PDF Platform
## 100% Local Processing — No API Key Required

---

## 📁 Project Structure

```
pdfforge-fixed/               ← ROOT FOLDER
├── package.json              ← Root scripts (dev, install-all)
├── README.md
├── .gitignore
│
├── server/                   ← Node.js + Express + MongoDB
│   ├── index.js
│   ├── .env                  ← Your config file
│   ├── package.json
│   ├── config/db.js
│   ├── controllers/
│   │   ├── tool.controller.js   ← ALL PDF processing (LOCAL, no API)
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   └── history.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── upload.middleware.js
│   │   └── rateLimit.middleware.js
│   ├── models/
│   │   ├── User.model.js
│   │   ├── Tool.model.js
│   │   └── History.model.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── tool.routes.js
│   │   ├── user.routes.js
│   │   ├── history.routes.js
│   │   └── download.routes.js    ← Signed, expiring downloads
│   └── utils/
│       ├── downloads.js          ← File retention and cleanup
│       └── seed.js
│
├── pdf-service/              ← Python FastAPI PDF-to-Office conversion
│   ├── app.py
│   ├── pdf_converter.py
│   └── requirements.txt
│
└── client/                   ← React 18 Frontend
    ├── package.json
    ├── public/index.html
    └── src/
        ├── App.js
        ├── index.js / index.css
        ├── context/AuthContext.js
        ├── utils/api.js
        ├── components/
        │   ├── layout/ (Navbar, Footer)
        │   ├── tools/ (ToolCard)
        │   └── ui/ (FileDropzone)
        └── pages/
            ├── Home, Login, Register, Dashboard
            ├── Profile, History, Pricing, About
            ├── ToolPage.jsx  ← Dynamic tool UI
            └── NotFound.jsx
```

---

## ⚙️ System Tools Required (Install Once)

### Windows (Admin PowerShell — Chocolatey):
```powershell
# Install Chocolatey first if not installed:
Set-ExecutionPolicy Bypass -Scope Process -Force
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# Install PDF tools:
choco install ghostscript -y
choco install libreoffice -y
```

### Linux/Ubuntu:
```bash
sudo apt-get install -y ghostscript libreoffice
```

### macOS:
```bash
brew install ghostscript
brew install --cask libreoffice
```

---

## 🚀 Setup & Run

### Step 1 — Install all npm packages:
```bash
# From ROOT folder (pdfforge-fixed/):
npm run install-all
```

### Step 2 — Configure .env:
Open `server/.env` and set:
```env
GHOSTSCRIPT_PATH=C:\Program Files\gs\gs10.03.0\bin\gswin64c.exe
LIBREOFFICE_PATH=C:\Program Files\LibreOffice\program\soffice.exe
MONGO_URI=mongodb://localhost:27017/pdfforge
JWT_SECRET=your_strong_secret_here
```

> Find your Ghostscript version:
> `C:\Program Files\gs\` — check folder name for version number.

### Step 3 — Start MongoDB:
```bash
# Windows: Start MongoDB service from Services panel
# Or run: mongod --dbpath "C:\data\db"
```

### Step 4 — Seed the database (one time):
```bash
cd server
npm run seed
```

### Step 5 — Run the app:
```bash
# From ROOT folder:
npm run dev
```

- React: http://localhost:3000
- API:   http://localhost:5000/api

---

## 🛠️ What Each Tool Uses

| Tool | Library | Requires |
|------|---------|---------|
| Merge PDF | pdf-lib | npm only |
| Split PDF | pdf-lib + archiver | npm only |
| Rotate PDF | pdf-lib | npm only |
| Compress PDF | **Ghostscript** | System install |
| Watermark | pdf-lib | npm only |
| Page Numbers | pdf-lib | npm only |
| Protect PDF | Ghostscript | System install |
| Unlock PDF | pdf-lib | npm only |
| Repair PDF | pdf-lib | npm only |
| JPG → PDF | pdf-lib + sharp | npm only |
| Merge Image → PDF | sharp + pdf-lib | npm only |
| PDF → JPG | **Ghostscript** + pdf2pic | System install |
| Word/Excel/PPT → PDF | **LibreOffice** | System install |
| PDF → Word/Excel/PPT | Python microservice + Node fallback | Python service recommended |
| HTML → PDF | Puppeteer | npm only |
| Extract Text with OCR | Tesseract.js | npm only |
| PDF/A | LibreOffice | System install |

---

## 🔐 No API Key Needed

This version is **100% self-hosted**. No ILovePDF, no OpenAI, no monthly fees.
All processing happens on your own machine.

Generated files are served through signed download links and removed from the
configured uploads directory after 1 hour.

---

## 📡 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Current user |
| GET  | /api/tools | All tools |
| POST | /api/tools/:slug/process | **Process a file** |
| GET  | /api/downloads/:token | Download an output file with an expiring token |
| GET  | /api/history | Task history |
| GET  | /api/user/dashboard | Dashboard stats |
