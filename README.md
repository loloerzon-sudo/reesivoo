# Reesivoo 🧾✨
> **AI Receipt Scanner to Google Sheets & Google Drive**

Reesivoo is a full-stack, mobile-friendly web application designed for smart expense tracking. Users log in with **Google Sign-In**, snap a photo of any receipt on their phone, extract structured data using **Google Gemini 3.5 Flash** vision OCR, verify the fields side-by-side, and save the data and photo directly to their personal **Google Sheet** and **Google Drive** folder with auto-provisioning.

---

## 🌟 Key Features

- **Google Sign-In:** Official OAuth 2.0 with automatic token refresh and encrypted cookie sessions.
- **Zero-Config Google Auto-Provisioning:** On first login, automatically creates a `"Receipts (Reesivoo)"` folder in Google Drive and a pre-formatted `"Receipt Tracker"` Google Sheet with frozen headers if not already present.
- **Gemini 3.5 Flash Vision OCR:** Extracts Date, Payee/Merchant, TIN, Address, Invoice/OR #, Category, Remarks, and Amount with high precision.
- **🤣 Witty Tagalog Scanning Lines:** Entertaining loading quotes while AI analyzes the receipt (e.g., *"Gumastos ka na naman?! 💸"*, *"Resibo check! Baka puro kape at milk tea na naman 'to ha? 🧋"*).
- **🇵🇭 Philippine Peso (₱) Styling:** Built-in ₱ symbol formatting for Philippine accounting standards.
- **💰 Cash Register "Ka-ching!" Chime:** Web Audio API sound effect on successful submission alongside celebratory confetti.
- **Human-in-the-Loop Split-Screen:** Desktop 50/50 side-by-side view with zoom/rotate controls; mobile-adaptive drawer with tap-to-zoom modal.
- **Native Drive Hyperlinks:** Appends rows with `=HYPERLINK(driveUrl, "View Receipt")` pointing directly to the photo in Google Drive.
- **👨‍💻 Developed by [nerzon.online](https://nerzon.online)**

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide Icons, Sonner toasts, Canvas Confetti.
- **Backend:** Node.js (v20+), Express.js.
- **Database:** SQLite (`better-sqlite3`) with WAL mode.
- **AI Model:** Google Gemini 3.5 Flash via official `@google/genai` SDK.
- **Google APIs:** Google OAuth 2.0, Google Drive API v3, Google Sheets API v4.

---

## 💻 Local Development

```powershell
# 1. Install dependencies
npm run install:all

# 2. Start frontend & backend concurrently
npm run dev
```

- **Frontend:** `http://localhost:5173`
- **Backend:** `http://localhost:3001`
- **Mobile on same Wi-Fi:** `http://<your-pc-ip>:5173`

---

## 🌐 Deploying Online (Render, Railway, or VPS)

The app is fully prepared for unified single-service online deployment (Express serves the built React app from `client/dist`).

### Option A: Free Deployment on [Render.com](https://render.com) (Recommended)

1. Push this project to GitHub.
2. Go to **Render Dashboard > New > Web Service**.
3. Connect your GitHub repository.
4. Render will automatically detect `render.yaml` or use these settings:
   - **Environment:** Node
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: Your working Gemini API key.
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret.
   - `CLIENT_URL`: `https://your-app-name.onrender.com`
   - `GOOGLE_REDIRECT_URI`: `https://your-app-name.onrender.com/api/auth/callback`
   - `SESSION_SECRET`: Any random secure secret string.
6. Click **Deploy Web Service**!
7. In [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials):
   - Add `https://your-app-name.onrender.com` to **Authorized JavaScript origins**.
   - Add `https://your-app-name.onrender.com/api/auth/callback` to **Authorized redirect URIs**.
