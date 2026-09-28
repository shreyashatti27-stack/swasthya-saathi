# SwasthyaSaathi (स्वास्थ्य साथी)

**An Intelligent Follow-up & Adherence Tracker for ASHA Workers and PHC Officers in Rural India**

---

## 📌 Problem Statement
In rural India, screening for non-communicable diseases (NCDs) like **Hypertension** and **Diabetes** happens during community camps, but regular clinical follow-up frequently fails. As a result, **only ~14.5% of hypertensive patients achieve blood pressure control**. 

Clinical research demonstrates that an active follow-up clinic visit roughly **doubles the chance of disease control**. 

**SwasthyaSaathi** solves the follow-up gap by automatically transforming every diagnosis and clinical reading into a risk-stratified scheduled follow-up, alerting ASHA workers to due and overdue visits, sending automated multi-lingual reminders to patients, and giving Primary Health Centre (PHC) Medical Officers complete jurisdiction-wide visibility.

---

## ✨ Key Features

### 1. For ASHA Workers (Field Operations)
- **Today's Visits Queue**: Prioritized list of patients due today or overdue, dynamically sorted by clinical risk (`Severe` &rarr; `Uncontrolled` &rarr; `Controlled`) and days overdue.
- **Instant Risk Classification & Auto-Scheduler**: Automatic clinical risk calculation based on Systolic/Diastolic BP and Fasting/Random Blood Sugar with automatic scheduling (+2 days for Severe, +14 days for Uncontrolled, +30 days for Controlled).
- **Patient Profile & Longitudinal Recharts**: Interactive timeline tracking systolic/diastolic BP (with 140/90 mmHg guideline reference lines) and blood sugar history.
- **One-Touch Actions**: Direct phone dialing (`tel:` links), one-click visit completion with vitals entry, and regional reminder dispatch.
- **Multilingual Support**: Fully localized interface in **English**, **Hindi (हिंदी)**, and **Kannada (ಕನ್ನಡ)**.
- **Offline Resilience**: LocalStorage caching with ambient offline detection banner.

### 2. For PHC Medical Officers (Command Center)
- **Population Health KPIs**: Total enrolled patients, % under control, overdue follow-ups, and severe cases requiring urgent referral.
- **Monthly Control Rate Progression**: Longitudinal trend chart visualizing control rate improvement as follow-up adherence climbs.
- **Risk & Disease Distribution**: Interactive Donut and Pie charts breaking down the cohort by clinical severity and comorbidity.
- **ASHA Performance Scorecard**: Worker-level leaderboard comparing patient load, visit adherence %, and cohort control rate.
- **Critical Case Triage**: Actionable list of severe and overdue patients with village names and assigned ASHA contacts for immediate medical intervention.

### 3. Regional Reminder Engine
- Multi-lingual SMS & IVR Voice Call templates in English, Hindi, and Kannada.
- Automated daily batch cron job creating reminders for all visits due the next day.
- Interactive smartphone simulation viewer to demo how rural patients receive alerts.

---

## 🛠️ Architecture & Tech Stack

```
swasthya-saathi/
├── client/                     # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── api/client.js       # REST API client wrapper
│   │   ├── components/         # Reusable UI (Navbar, RiskBadge, Modals, StatCard, PhoneSimulator)
│   │   ├── context/            # AuthContext & OfflineContext
│   │   ├── i18n/               # Multi-language translation dictionaries (EN, HI, KN)
│   │   ├── pages/              # ASHA (Today's Visits, Add Patient, Profile, Reminders) & PHC Dashboard
│   │   ├── App.jsx             # React Router routing & role guards
│   │   └── index.css           # Tailwind directives & healthcare design system
├── server/                     # Node.js + Express REST API Backend
│   ├── src/
│   │   ├── db.js               # SQLite embedded database (node:sqlite DatabaseSync)
│   │   ├── services/risk.js    # Clinical risk classification & auto-scheduler engine
│   │   ├── tests/risk.test.js  # Node test runner unit tests
│   │   ├── routes/             # Auth, Patients, Visits, Reminders, Dashboard
│   │   ├── seed.js             # 40 patients, 4 users, longitudinal history seed generator
│   │   └── server.js           # Main Express server & Node-Cron background job
├── package.json                # Root package for concurrently running dev server & client
└── README.md
```

- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Lucide Icons, React Router v6
- **Backend**: Node.js, Express, `node:sqlite` (zero-setup embedded SQLite database), Zod, JWT, BCrypt, Node-Cron
- **Tests**: Built-in Node test runner (`node --test`)

---

## 🚀 Quickstart & Setup Instructions

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm

### 2. Install & Seed
Clone the repository and run:

```bash
# 1. Install all dependencies across root, server, and client
npm run install:all

# 2. Seed database with realistic clinical datasets (40 patients, 4 users, longitudinal vitals)
npm run seed
```

### 3. Run the Unit Tests
```bash
npm run test:risk
```

### 4. Start the Application
```bash
npm run dev
```
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 Demo Credentials

Convenient 1-click login buttons are available on the login page, or use these credentials:

| Role | Name | Email | Password | Assigned Area / Villages |
| :--- | :--- | :--- | :--- | :--- |
| **PHC Medical Officer** | Dr. Ramesh Sharma | `dr.sharma@swasthya.org` | `password123` | Kengeri Primary Health Centre |
| **ASHA Worker** | Sunita Devi | `asha.sunita@swasthya.org` | `password123` | Kumbalgodu & Doddabele |
| **ASHA Worker** | Lakshmi Gowda | `asha.lakshmi@swasthya.org` | `password123` | Ramohalli & Anchepalya |
| **ASHA Worker** | Meena Bai | `asha.meena@swasthya.org` | `password123` | Sulikere & Channasandra |

---

## 🧪 Clinical Risk Classification Matrix

| Condition | Severe (Follow-up in 2 Days) | Uncontrolled (Follow-up in 14 Days) | Controlled (Follow-up in 30 Days) |
| :--- | :--- | :--- | :--- |
| **Hypertension (BP)** | Systolic ≥ 180 **OR** Diastolic ≥ 110 | Systolic ≥ 140 **OR** Diastolic ≥ 90 | Systolic < 140 **AND** Diastolic < 90 |
| **Diabetes (Blood Sugar)** | Fasting ≥ 300 **OR** Random ≥ 400 | Fasting ≥ 126 **OR** Random ≥ 200 | Otherwise |
| **Both (HTN + Diabetes)** | *Highest severity level wins (Severe > Uncontrolled > Controlled)* |

*Visits with no completion recorded 3 days past the scheduled date automatically transition to `missed`.*

---

## 🔮 Future Scope & Roadmap

1. **Production SMS/IVR Gateway (MSG91 / Twilio)**: Direct integration with government SMS headers (e.g. `NHM-GOV`) and automated interactive voice response calls with regional voice synthesis.
2. **ABHA (Ayushman Bharat Health Account) Integration**: Seamless linkage of patient records with National Digital Health Mission (NDHM) ABHA IDs and QR codes.
3. **PWA & Offline Background Sync**: Service Worker with IndexedDB storage enabling full offline data entry during deep rural field visits with automated conflict-free sync upon cell connectivity.
4. **Medicine Adherence & Refill Tracking**: Tracking antihypertensive and oral hypoglycemic pill counts with refill alerts sent 3 days before medication depletion.
5. **AI Prescription OCR & Voice Notes**: Speech-to-text in local dialects for ASHA workers to record field observations hands-free.

---

*Built with ❤️ for Indian Primary Healthcare.*
