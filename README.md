# 🏥 GramSehat — Rural AI Health Assistant

> AI-powered healthcare for India's 800 million rural citizens
> Powered by Groq · 100% Free APIs · Works on 2G

---

## 🚀 Quick Start (5 Minutes)

### Step 1 — Get Your Free API Key
1. Go to **console.groq.com**
2. Sign up (free, takes 2 minutes)
3. Go to API Keys → Create new key
4. Copy the key (starts with `gsk_`)

### Step 2 — Setup Environment
```bash
cd gramsehat/backend
cp ../.env.example .env
# Open .env and paste your GROQ_API_KEY
```

### Step 3 — Install & Run Backend
```bash
cd gramsehat/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Step 4 — Open Frontend
```bash
cd gramsehat/frontend
python -m http.server 3000
# Open http://localhost:3000 in browser
```

### Step 5 — Test It Works
```bash
curl http://localhost:8000/health
# Should return: {"status": "🏥 GramSehat is running!"}
```

---

## 🏗️ Architecture

```
Patient/ASHA Worker (Mobile Browser)
            ↓
    [Voice / Text / Photo]
            ↓
    ┌───────────────────────────────┐
    │      FastAPI Backend          │
    │                               │
    │  ① Speech → Groq Whisper     │
    │  ② Translate → Google Trans  │
    │  ③ Triage → Groq Llama 70B   │
    │  ④ Vision → Groq Llama Vision│
    │  ⑤ Diagnose → Groq Llama 70B │
    │  ⑥ Translate back → Local    │
    │  ⑦ TTS → gTTS               │
    │  ⑧ Notify → Twilio WhatsApp  │
    └───────────────────────────────┘
            ↓
    Doctor Dashboard / ASHA Worker Alert
```

---

## 💰 Cost Breakdown

| Service | Usage | Cost |
|---------|-------|------|
| Groq Llama 3.1 70B | Triage + Diagnosis | FREE |
| Groq Llama 3.2 Vision | Image Analysis | FREE |
| Groq Whisper Large V3 | Voice Transcription | FREE |
| gTTS | Text to Speech | FREE |
| Google Translate | Translation | FREE |
| Twilio WhatsApp | ASHA Notifications | $15 free trial |
| **TOTAL** | | **₹0** |

---

## 📁 Project Structure

```
gramsehat/
├── backend/
│   ├── main.py                    # FastAPI app + all routes
│   ├── requirements.txt           # Python dependencies
│   ├── services/
│   │   ├── llm_service.py         # Groq Llama — triage & diagnosis
│   │   ├── vision_service.py      # Groq Vision — image analysis
│   │   ├── speech_service.py      # Groq Whisper STT + gTTS
│   │   ├── translate_service.py   # Google Translate
│   │   └── notify_service.py      # Twilio WhatsApp alerts
│   └── models/
│       └── schemas.py             # Pydantic data models
├── frontend/
│   ├── index.html                 # Main UI
│   ├── styles.css                 # All styles
│   └── app.js                     # All frontend logic
├── demo/
│   └── sample_cases/
│       └── README.md              # Demo script + test cases
├── .env.example                   # Environment variable template
└── README.md                      # This file
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/triage` | Text symptom analysis |
| POST | `/api/voice-triage` | Voice symptom analysis |
| POST | `/api/analyze-image` | Photo medical analysis |
| POST | `/api/diagnose` | Final diagnosis + urgency |
| GET | `/api/audio-response` | TTS audio response |

---

## 🗣️ Supported Languages

Hindi, Marathi, Telugu, Tamil, Bengali, Kannada, Gujarati, Odia, Malayalam, Punjabi

---

## ⚠️ Disclaimer

GramSehat is an AI-assisted triage tool designed to support ASHA workers and rural communities.
It is NOT a replacement for professional medical diagnosis.
Always consult a qualified doctor for serious medical conditions.

---

## 🏆 Built for Hackathon

This project demonstrates multi-model AI solving a real Indian healthcare crisis:
- **Groq Llama 3.1 70B** — Medical reasoning at 500ms
- **Groq Llama 3.2 Vision** — Visual symptom detection
- **Groq Whisper** — Voice in 10 Indian languages
- **gTTS + Google Translate** — Multilingual accessibility

*GramSehat — Because every life matters, regardless of postal code.*
