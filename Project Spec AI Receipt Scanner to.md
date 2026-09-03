# Project Spec: AI Receipt Scanner to Google Sheets

## 🎯 Objective
Build a full-stack, mobile-friendly web application for ~15 internal users to log in via Google, upload or take a photo of a receipt, extract structured financial data using **Google Gemini 2.5 Flash** with native **Structured Outputs**, verify and correct the extracted details in a responsive human-in-the-loop interface, and save the verified entry into their personal Google Sheet while automatically storing the receipt image in their Google Drive.

---

## ⚙️ Tech Stack & Key Libraries
- **Frontend:** React 19 (via Vite), Tailwind CSS, Lucide React (icons)
- **Backend:** Node.js (v20+) with Express.js
- **Database:** SQLite using `better-sqlite3` (zero-config, high performance, local persistent file)
- **AI / OCR:** Google Gemini 2.5 Flash via official `@google/genai` SDK using native **Structured Outputs** (`responseSchema`)
- **Integrations:**
  - Google OAuth 2.0 (Google Identity Services for Web)
  - Google Drive API v3 (Folder auto-creation, file uploads, permission setting)
  - Google Sheets API v4 (Spreadsheet auto-creation, row appending)
- **Session & File Upload:** `express-session` / signed HTTP-only cookies, `multer` (temporary disk storage with UUIDs)

---

## 🔄 End-to-End Application Workflow

```
[ User Device (Mobile/Desktop) ]
         │
         ▼ (1) Google OAuth 2.0 Sign-In
[ Express Backend ] ───► Auto-provision "Receipts" folder & "Receipt Tracker" Sheet if first login
         │
         ▼ (2) User uploads receipt photo
[ Backend Multer ] ───► Stores temp file in /uploads/temp/<uuid>.<ext>
         │
         ▼ (3) Backend calls Gemini 2.5 Flash with strict JSON Schema
[ Gemini 2.5 Flash ] ───► Returns validated JSON extraction
         │
         ▼ (4) Frontend renders side-by-side verification form (Mobile: stacked + zoom drawer)
[ Human Verification ] ───► User corrects data, selects category, clicks "Submit to Sheet"
         │
         ▼ (5) POST /api/submit-receipt with tempImageId + verified JSON
[ Backend ]
    ├── Uploads temp image to User's Google Drive folder
    ├── Sets file permission: "anyone with link can view"
    ├── Appends row (9 columns) to User's Google Sheet
    └── Deletes local temp image file
         │
         ▼ (6) Success Toast with direct clickable links to Sheet & Drive image
```

---

## 🔐 Authentication, Tokens & Session Lifecycle

1. **OAuth Scopes Required:**
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/drive.file` (Grants access only to files/folders created by this app)
   - `https://www.googleapis.com/auth/spreadsheets`
2. **Access Token & Refresh Token Flow:**
   - Backend exchanges OAuth authorization code for `access_token` and `refresh_token` (`access_type: 'offline'`, `prompt: 'consent'`).
   - SQLite stores user credentials: `google_id`, `email`, `name`, `access_token`, `refresh_token`, and token expiry timestamp.
   - An authenticated Axios/Google API client middleware automatically refreshes the `access_token` using the stored `refresh_token` whenever expired.
3. **Session Management:**
   - Authenticated sessions are managed via secure, HTTP-only signed session cookies. The frontend does not transmit raw user IDs.

---

## 📁 Auto-Provisioning Engine (Zero Configuration)

Upon first successful login, the backend automatically performs:
1. **Drive Folder Check:**
   - Queries Google Drive for an existing folder named `"Receipts (Reesivoo)"`.
   - If not found, creates the folder and stores its `target_folder_id` in the SQLite database.
2. **Google Sheet Check:**
   - Queries Google Drive for an existing spreadsheet named `"Receipt Tracker"`.
   - If not found, creates the spreadsheet inside the user's Drive, populates Row 1 with frozen headers, sets column formats, and stores `target_sheet_id` in SQLite.

---

## 🎨 Frontend UI/UX Specifications

### 1. Login Screen
- Centered, minimal card layout.
- "Sign in with Google" button utilizing Google Identity Services (GSI).
- Brief explanation of permissions requested (Drive & Sheets).

### 2. Dashboard View
- Header showing logged-in user profile, avatar, and a direct button: **"Open My Google Sheet ↗"**.
- Drag-and-drop file upload target supporting PDF, JPG, PNG, and HEIC/WEBP.
- Native mobile camera capture trigger: `<input type="file" accept="image/*" capture="environment" />`.
- Upload state with progress/spinner: *"Analyzing receipt with Gemini AI..."*.

### 3. Verification View (Human-in-the-Loop)
- **Desktop Layout:** 50/50 side-by-side split screen.
  - **Left Side:** Receipt image viewer with zoom, pan, and rotate controls.
  - **Right Side:** Verified editable form.
- **Mobile Layout:**
  - Stacked layout with sticky thumbnail/drawer header.
  - Tap-to-expand modal/bottom-sheet with pinch-to-zoom for checking fine receipt details on mobile.
- **Form Fields & Validation:**
  1. **Date:** `<input type="date" />` (YYYY-MM-DD)
  2. **Payee:** `<input type="text" placeholder="Merchant or Store Name" />`
  3. **TIN:** `<input type="text" placeholder="000-000-000-000" />`
  4. **Address:** `<input type="text" placeholder="Merchant Address" />`
  5. **Invoice / OR #:** `<input type="text" placeholder="Receipt or Invoice No." />`
  6. **Category:** Dropdown `<select>` strictly matching standard Philippine accounting categories:
     - `Repair Maintenance`
     - `De Minimis`
     - `Utilities`
     - `Subscription`
     - `Transportation`
     - `Miscellaneous`
     - `Gasoline`
     - `Representation`
     - `Pantry`
     - `Medicine/Office Others`
     - `Others` *(Default fallback if AI cannot determine)*
  7. **Remarks / Description:** `<input type="text" placeholder="e.g., Client meeting lunch, Printer ink" />`
  8. **Amount:** `<input type="number" step="0.01" min="0" placeholder="0.00" />`
- **Visual Error / Attention Highlights:**
  - If a required field is extracted as `null`, render an amber/yellow warning border around the input to guide the user's attention.
- **Actions:**
  - `Cancel / Discard` button (cleans up temp file and returns to dashboard).
  - `Submit to Sheet` button (primary, disabled while submitting, with spinner).

### 4. Post-Submission Feedback
- Non-blocking success toast notification:
  - *"Receipt saved! Row appended to Google Sheet."*
  - Direct links: **[View in Sheet]** and **[View Drive Photo]**.
- Resets form state back to Dashboard upload screen ready for next receipt.

---

## 🗄️ Database Schema (SQLite via `better-sqlite3`)

File location: `server/data/app.db`

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry INTEGER,
  target_sheet_id TEXT,
  target_folder_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS temp_uploads (
  id TEXT PRIMARY KEY,               -- UUID v4
  user_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🔌 Backend API Routes

### `GET /api/auth/url`
Returns Google OAuth consent URL configured with required scopes, `access_type=offline`, and `prompt=consent`.

### `POST /api/auth/callback`
- Body: `{ code }`
- Exchanges authorization code for tokens.
- Retrieves user profile via Google People/Userinfo API.
- Upserts user record in SQLite.
- Triggers background auto-provisioning of Drive folder and Google Sheet if empty.
- Establishes HTTP-only session cookie.

### `GET /api/auth/me`
Returns currently authenticated user data and their target Sheet/Folder URLs.

### `POST /api/auth/logout`
Destroys session cookie.

### `POST /api/analyze-receipt`
- Authentication: Requires active session cookie.
- Payload: `multipart/form-data` with field `receipt` (image file).
- Backend steps:
  1. Saves file to `server/uploads/temp/<uuid>.<ext>` and records in `temp_uploads`.
  2. Sends image buffer to Gemini 2.5 Flash with Structured Outputs JSON schema.
  3. Returns `{ tempImageId: "<uuid>", data: { date, payee, tin, address, invoiceNo, category, remarks, amount } }`.

### `POST /api/submit-receipt`
- Authentication: Requires active session cookie.
- Body: `{ tempImageId: "<uuid>", verifiedData: { date, payee, tin, address, invoiceNo, category, remarks, amount } }`
- Backend steps:
  1. Validates session and checks existence of `tempImageId` in `temp_uploads`.
  2. Uploads image stream to user's Google Drive folder (`target_folder_id`).
  3. Updates Drive permission: `{ role: 'reader', type: 'anyone' }`.
  4. Obtains file `webViewLink`.
  5. Appends row to user's Google Sheet (`target_sheet_id`).
  6. Deletes local temp file from disk and database.
  7. Returns `{ success: true, sheetUrl: string, driveFileUrl: string }`.

---

## 📊 Google Sheet Structure & Formulas

### Header Row (Row 1):
| Col | Header | Data Format | Description |
|---|---|---|---|
| **A** | `Date` | Date (YYYY-MM-DD) | Date of transaction |
| **B** | `Payee` | Plain Text | Store or merchant name |
| **C** | `TIN` | Plain Text | Tax Identification Number |
| **D** | `Address` | Plain Text | Merchant address |
| **E** | `Invoice / OR #` | Plain Text | Official Receipt or Sales Invoice number |
| **F** | `Category` | Plain Text | Expense category |
| **G** | `Remarks / Description`| Plain Text | Items or purpose |
| **H** | `Amount` | Currency / Number | Total amount paid (PHP / local currency) |
| **I** | `Receipt Link` | Hyperlink (`=HYPERLINK(...)`) | Direct view link to Google Drive image |

### Native Google Sheet Summaries (Handled by Sheet Formulas):
Row 1 is frozen with bold headers. Users can add a separate summary sheet or top-level cells using native formulas, e.g.:
```excel
=SUMIFS(H:H, F:F, "Transportation", A:A, ">=2026-09-01", A:A, "<=2026-09-30")
```

---

## 🧠 AI Vision & Extraction Strategy (Gemini 2.5 Flash)

### SDK & Implementation:
Using `@google/genai` with `response_mime_type: 'application/json'` and `response_schema`:

```typescript
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    date: { 
      type: Type.STRING, 
      description: "Transaction date in YYYY-MM-DD format. If year is ambiguous, use current year. Return null if not found.",
      nullable: true 
    },
    payee: { 
      type: Type.STRING, 
      description: "Name of the merchant, vendor, or store.",
      nullable: true 
    },
    tin: { 
      type: Type.STRING, 
      description: "Tax Identification Number (TIN) of merchant, e.g. 123-456-789-000.",
      nullable: true 
    },
    address: { 
      type: Type.STRING, 
      description: "Physical street address of the merchant.",
      nullable: true 
    },
    invoiceNo: { 
      type: Type.STRING, 
      description: "Sales Invoice (SI) #, Official Receipt (OR) #, or Invoice reference number.",
      nullable: true 
    },
    category: { 
      type: Type.STRING, 
      enum: [
        "Repair Maintenance",
        "De Minimis",
        "Utilities",
        "Subscription",
        "Transportation",
        "Miscellaneous",
        "Gasoline",
        "Representation",
        "Pantry",
        "Medicine/Office Others",
        "Others"
      ],
      description: "Classify into exactly one of these expense categories based on line items and merchant."
    },
    remarks: {
      type: Type.STRING,
      description: "Short summary of main items purchased or primary purpose.",
      nullable: true
    },
    amount: { 
      type: Type.NUMBER, 
      description: "Total gross amount paid as a floating number. Exclude currency symbols. Return null if unclear.",
      nullable: true 
    }
  },
  required: ["category"]
};
```

---

## 🛑 Prerequisites & Google Cloud Console Setup

1. **Google Cloud Project:**
   - Create project in Google Cloud Console.
   - Enable: **Google Drive API**, **Google Sheets API**, **Gemini API**.
2. **OAuth Consent Screen:**
   - User type: External (in Testing status).
   - Add the ~15 users' Google account emails to the **Test Users** list.
   - Add scopes: `userinfo.email`, `userinfo.profile`, `drive.file`, `spreadsheets`.
3. **OAuth 2.0 Credentials:**
   - Create OAuth 2.0 Client ID (Type: Web Application).
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:3001/api/auth/callback` (or frontend redirect `http://localhost:5173/auth/callback`).
4. **Environment Variables (`.env`):**
   ```env
   PORT=3001
   CLIENT_URL=http://localhost:5173
   SESSION_SECRET=super_secret_session_key_change_me
   GEMINI_API_KEY=AIzaSy...
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
   GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback
   ```

---

## 🚀 Implementation Phases

- **Phase 1: Project Setup & Authentication**
  - Initialize Vite React client and Express server workspace.
  - Setup SQLite database (`better-sqlite3`) and migrations.
  - Configure Google OAuth 2.0 flow with session cookies and auto-token refresh middleware.
- **Phase 2: Drive & Sheet Auto-Provisioning**
  - Implement Drive folder creation (`"Receipts (Reesivoo)"`).
  - Implement Sheet creation (`"Receipt Tracker"`) with frozen header formatting and link generation.
- **Phase 3: Image Upload & Gemini 2.5 Flash Extraction**
  - Setup `multer` temporary upload pipeline.
  - Connect `@google/genai` with Structured Output JSON schema.
- **Phase 4: Responsive Verification UI**
  - Build desktop split-screen (receipt viewer on left, editable form on right).
  - Build mobile layout with tap-to-zoom modal / collapsible preview drawer.
  - Implement field error highlighting (yellow borders for null fields).
- **Phase 5: Final Submission Pipeline & Link Handling**
  - Stream image from temp storage to user's Google Drive.
  - Set public viewer permissions on the image.
  - Append formatted 9-column row with `=HYPERLINK()` formula to Google Sheet.
  - Cleanup temp file and display success toast with quick links.
- **Phase 6: Verification & End-to-End Testing**
  - Test end-to-end receipt scanning with real samples.
  - Verify token auto-refresh when access tokens expire.
  - Test on both desktop browsers and mobile screen dimensions.