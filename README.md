# 🏥 Med Gemma AI — Complete Setup Guide

## 📁 Project File Structure

```
medgemma/
├── public/
│   └── index.html
├── src/
│   ├── App.js                          ← Main router
│   ├── index.js                        ← Entry point + fonts
│   ├── firebase.js                     ← Firebase config (ADD YOUR KEYS)
│   ├── context/
│   │   └── AppContext.js               ← Language, auth state, global context
│   ├── hooks/
│   │   └── useVoice.js                 ← Voice recognition + TTS (all 4 languages)
│   ├── i18n/
│   │   └── translations.js             ← All translations: EN, HI, TA, TE
│   ├── pages/
│   │   ├── LanguageSelect.jsx          ← First screen: choose language
│   │   ├── LoginPage.jsx               ← Login (patient+doctor), captcha, remember me
│   │   ├── RegisterPage.jsx            ← Registration with full profile
│   │   ├── PatientDashboard.jsx        ← Voice input, AI analysis, QR, history
│   │   └── DoctorDashboard.jsx         ← QR scanner, patient reports, doctor notes
│   ├── components/
│   │   └── shared/
│   │       └── ProtectedRoute.jsx      ← Auth guard
│   └── utils/
│       └── geminiService.js            ← Google Gemini API integration
├── firestore.rules                     ← Firebase security rules
├── package.json
└── README.md
```

---

## 🚀 Step-by-Step Setup

### STEP 1: Install Node.js
Download from https://nodejs.org (v18+ recommended)

### STEP 2: Create React App & Install Packages
```bash
npx create-react-app medgemma
cd medgemma

# Install ALL required packages:
npm install firebase qrcode qrcode.react jsqr react-router-dom react-hot-toast framer-motion lucide-react html5-qrcode
```

### STEP 3: Replace src/ files
Copy ALL the provided files into the src/ folder, replacing defaults.

### STEP 4: Setup Firebase
1. Go to https://console.firebase.google.com
2. Create a new project: "medgemma-ai"
3. Enable **Authentication** → Email/Password provider
4. Enable **Firestore Database** → Start in production mode
5. Go to **Project Settings** → Web App → Copy config
6. Paste into `src/firebase.js`

### STEP 5: Setup Google Gemini API
1. Go to https://makersuite.google.com/app/apikey
2. Create an API key
3. Paste into `src/utils/geminiService.js` → replace `YOUR_GEMINI_API_KEY_HERE`

### STEP 6: Enable Firestore Indexes
In Firebase Console → Firestore → Indexes, add:
- Collection: `reports`
- Fields: `uid` (Ascending), `createdAt` (Descending)

### STEP 7: Deploy Firestore Security Rules
```bash
npm install -g firebase-tools
firebase login
firebase init firestore
# Copy firestore.rules content → deploy:
firebase deploy --only firestore:rules
```

### STEP 8: Run the App
```bash
npm start
```
App opens at http://localhost:3000

---

## 🔑 API Keys Needed (Free Tiers Available)

| API | Where to Get | Cost |
|-----|-------------|------|
| Firebase Auth | console.firebase.google.com | Free |
| Firestore DB | console.firebase.google.com | Free (1GB) |
| Google Gemini | makersuite.google.com | Free (60 req/min) |

---

## 🌐 Voice Recognition Languages

| Language | Code Used | Notes |
|---------|-----------|-------|
| English | en-IN | Works in Chrome |
| Hindi | hi-IN | Works in Chrome |
| Tamil | ta-IN | Works in Chrome |
| Telugu | te-IN | Works in Chrome |

**⚠️ Voice recognition requires Chrome browser.**

---

## 📱 How QR Code Works

1. **Patient** → Goes to "Your QR Code" tab → Shows QR
2. **Doctor** → Logs in → Clicks "Scan QR Code" → Scans patient QR
3. **Doctor** sees full patient history, AI reports, adds notes
4. Doctor notes are saved to Firebase and visible to patient

The QR contains:
- Patient ID (Firebase UID)
- Patient name, age, gender, village
- Direct URL to patient records

---

## 🔒 Security Rules Summary

- ✅ Patients can READ and CREATE their own reports
- ✅ Doctors can READ all reports
- ✅ Doctors can UPDATE only the `doctorNotes` field
- ❌ Nobody can DELETE reports
- ❌ Patients cannot modify reports after creation

---

## 🌍 Multilingual Reports

The Gemini API is prompted to respond **only in the patient's selected language**.
- Select Hindi → Report comes in Hindi
- Select Tamil → Report comes in Tamil  
- Select Telugu → Report comes in Telugu
- The entire UI also switches language when selected

---

## 🔊 Text-to-Speech

The app uses the Web Speech API (built into Chrome/browsers) to read reports aloud in the correct language. No external API needed.

---

## 📦 All npm Packages & Their Purpose

| Package | Purpose |
|---------|---------|
| firebase | Firebase Auth + Firestore |
| qrcode.react | Generate QR codes for patients |
| html5-qrcode | Scan QR codes via camera (doctor side) |
| react-router-dom | Page navigation |
| react-hot-toast | Beautiful notifications |
| lucide-react | Icons |

---

## 🛠️ Common Issues & Fixes

**Voice not working?**
→ Use Chrome browser. Allow microphone permission when prompted.

**Gemini API error?**  
→ Check your API key in geminiService.js. Enable Gemini API in Google Cloud Console.

**Firebase permission denied?**
→ Deploy firestore.rules. Make sure Firestore is in production mode.

**QR not scanning?**
→ Allow camera permission. Ensure good lighting. QR must be at least 200x200px.

**Report always in English?**
→ The language is passed to Gemini prompt. Ensure user selected language before analyzing.
