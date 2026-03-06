import os
import base64
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from services.llm_service import triage_symptoms, generate_diagnosis, analyze_with_answers
from services.vision_service import analyze_image
from services.translate_service import translate_to_local, translate_to_english
from services.speech_service import transcribe_audio, text_to_speech
from services.notify_service import notify_asha_worker
from models.schemas import TriageResponse, DiagnosisResponse

load_dotenv()

app = FastAPI(
    title="GramSehat API",
    description="AI-powered Rural Healthcare Assistant for India — Powered by Groq",
    version="1.0.0"
)

# Allow frontend to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


# ─────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {
        "status": "🏥 GramSehat is running!",
        "powered_by": "Groq (Llama 3.1 70B + Llama 3.2 Vision + Whisper)",
        "cost": "₹0 — 100% FREE APIs"
    }


# ─────────────────────────────────────────────
# STEP 1: SYMPTOM TRIAGE (Text Input)
# ─────────────────────────────────────────────

@app.post("/api/triage", response_model=TriageResponse)
async def triage_patient(
    patient_name: str = Form(...),
    age: int = Form(...),
    language: str = Form(...),
    symptoms_text: str = Form(...),
    region: str = Form("maharashtra"),
    season: str = Form("monsoon")
):
    """
    Triages patient symptoms and returns follow-up questions.
    Translates patient input from local language → English → processes → translates back.
    """
    if not symptoms_text.strip():
        raise HTTPException(status_code=400, detail="Symptoms text cannot be empty")

    # Translate local language symptoms to English for LLM
    symptoms_english = translate_to_english(symptoms_text, language)

    # Run Groq LLM triage
    triage_result = triage_symptoms(symptoms_english, age, season, region)

    # Translate result back to patient's language
    translated = translate_to_local(triage_result, language)

    return TriageResponse(
        patient=patient_name,
        triage_summary=triage_result,
        translated_response=translated
    )

@app.post("/api/analyze-answers")
async def analyze_answers(
    patient_name: str = Form(...),
    age: int = Form(...),
    language: str = Form(...),
    symptoms_text: str = Form(...),
    questions_and_answers: str = Form(...),
    region: str = Form("maharashtra"),
    season: str = Form("monsoon")
):
    """
    Takes patient's yes/no answers to follow-up questions
    and produces an updated detailed symptom analysis.
    """
    # Translate to English if needed
    symptoms_english = translate_to_english(symptoms_text, language)
    qa_english = translate_to_english(questions_and_answers, "english")

    # Analyze with answers
    updated_analysis = analyze_with_answers(
        symptoms_english, qa_english, age, season, region
    )

    # Translate back to local language
    translated = translate_to_local(updated_analysis, language)

    return {
        "updated_summary": updated_analysis,
        "translated_summary": translated,
        "patient": patient_name
    }


# ─────────────────────────────────────────────
# STEP 1B: SYMPTOM TRIAGE (Voice Input)
# ─────────────────────────────────────────────

@app.post("/api/voice-triage")
async def voice_triage(
    audio: UploadFile = File(...),
    patient_name: str = Form(...),
    age: int = Form(...),
    language: str = Form(...),
    region: str = Form("maharashtra"),
    season: str = Form("monsoon")
):
    """
    Accepts voice recording, transcribes it with Groq Whisper,
    then runs the same triage pipeline as text input.
    """
    # Save uploaded audio temporarily
    # audio_path = f"/tmp/gramsehat_audio_{audio.filename}"
    audio_path = os.path.join(tempfile.gettempdir(), f"gramsehat_audio_{audio.filename}")
    with open(audio_path, "wb") as f:
        shutil.copyfileobj(audio.file, f)

    try:
        # Groq Whisper transcription
        transcribed_text = transcribe_audio(audio_path)

        # Translate to English for LLM
        symptoms_english = translate_to_english(transcribed_text, language)

        # Run triage
        triage_result = triage_symptoms(symptoms_english, age, season, region)
        translated = translate_to_local(triage_result, language)

        # Generate audio response for patient
        audio_response_path = text_to_speech(translated, language)

        return {
            "patient": patient_name,
            "transcribed_text": transcribed_text,
            "triage_summary": triage_result,
            "translated_response": translated,
            "has_audio_response": os.path.exists(audio_response_path)
        }

    finally:
        # Clean up temp audio file
        if os.path.exists(audio_path):
            os.remove(audio_path)


# ─────────────────────────────────────────────
# STEP 2: IMAGE ANALYSIS (Vision)
# ─────────────────────────────────────────────

@app.post("/api/analyze-image")
async def analyze_patient_image(
    file: UploadFile = File(...),
    symptom_context: str = Form(...),
    language: str = Form(...)
):
    """
    Analyzes patient photo for visible medical signs.
    Uses Groq Llama 3.2 Vision — FREE.
    """
    # Validate file is an image
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await file.read()
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')

    # Run Groq Vision analysis
    findings = analyze_image(image_base64, symptom_context)

    # Translate findings to patient language
    translated_findings = translate_to_local(findings, language)

    return {
        "visual_findings": findings,
        "translated_findings": translated_findings
    }


# ─────────────────────────────────────────────
# STEP 3: FINAL DIAGNOSIS
# ─────────────────────────────────────────────

@app.post("/api/diagnose", response_model=DiagnosisResponse)
async def full_diagnosis(
    patient_name: str = Form(...),
    age: int = Form(...),
    symptoms_summary: str = Form(...),
    visual_findings: str = Form(""),
    language: str = Form(...),
    region: str = Form("maharashtra"),
    asha_email: str = Form(""),
    asha_phone: str = Form("")  # backward compat
):
    """
    Generates final diagnosis with urgency level.
    If urgency is RED and ASHA phone provided, sends WhatsApp alert.
    """
    if not symptoms_summary.strip():
        raise HTTPException(status_code=400, detail="Symptoms summary cannot be empty")

    # Generate diagnosis using Groq Llama
    diagnosis = generate_diagnosis(symptoms_summary, visual_findings, age, region)

    urgency         = diagnosis.get("URGENCY", "YELLOW")
    probable_dx     = diagnosis.get("DIAGNOSIS", "Unknown condition")
    first_aid       = diagnosis.get("FIRST_AID", "Rest and drink clean water")
    action          = diagnosis.get("ACTION", "Visit your nearest PHC")
    urgency_reason  = diagnosis.get("URGENCY_REASON", "")
    medicines       = diagnosis.get("MEDICINES", "Paracetamol (Crocin) - 500mg - Every 6 hours")
    medicine_warning= diagnosis.get("MEDICINE_WARNING", "Consult doctor before taking any medicine")
    home_remedies   = diagnosis.get("HOME_REMEDIES", "Drink warm water, rest well")

    # Build patient-friendly advice
    # full_advice = f"Sambhavit bimari: {probable_dx}. {first_aid}. {action}"
    # translated_advice = translate_to_local(full_advice, language)
    full_advice_english = f"Diagnosis: {probable_dx}. First Aid: {first_aid}. Action: {action}. Medicines: {medicines}"
    translated_advice = translate_to_local(full_advice_english, language)

    # Alert ASHA worker if emergency
    asha_notified = False
    # if urgency == "RED" and asha_phone.strip():
    #     result = notify_asha_worker(patient_name, urgency, probable_dx, asha_phone)
    #     asha_notified = bool(result)

    # Accept either asha_email or asha_phone
    contact = asha_email.strip() or asha_phone.strip()
    if urgency == "RED" and contact:
        result = notify_asha_worker(patient_name, urgency, probable_dx, contact)
        asha_notified = bool(result)

    return DiagnosisResponse(
        probable_diagnosis=probable_dx,
        urgency_level=urgency,
        urgency_reason=urgency_reason,
        recommended_action=action,
        first_aid=first_aid,
        medicines=medicines,
        medicine_warning=medicine_warning,
        home_remedies=home_remedies,
        translated_advice=translated_advice,
        asha_notified=asha_notified
    )


# ─────────────────────────────────────────────
# AUDIO RESPONSE ENDPOINT
# ─────────────────────────────────────────────

@app.get("/api/audio-response")
def get_audio_response():
    """Returns the generated TTS audio file for the patient."""
    # audio_path = "/tmp/gramsehat_response.mp3"
    audio_path = os.path.join(tempfile.gettempdir(), "gramsehat_response.mp3")
    if os.path.exists(audio_path):
        return FileResponse(audio_path, media_type="audio/mpeg")
    raise HTTPException(status_code=404, detail="No audio response available")


@app.post("/api/transcribe-only")
async def transcribe_only(
    audio: UploadFile = File(...),
    patient_name: str = Form(...),
    age: int = Form(...),
    language: str = Form(...),
    region: str = Form("maharashtra"),
    season: str = Form("monsoon")
):
    """
    Only transcribes audio — does NOT run triage.
    Used to show transcription to user for review before submitting.
    """
    import tempfile
    audio_path = os.path.join(tempfile.gettempdir(), f"gramsehat_preview_{audio.filename}")

    with open(audio_path, "wb") as f:
        shutil.copyfileobj(audio.file, f)

    try:
        transcribed_text = transcribe_audio(audio_path)
        return {
            "transcribed_text": transcribed_text,
            "language": language
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)
