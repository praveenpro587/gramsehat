from pydantic import BaseModel
from typing import Optional


class SymptomRequest(BaseModel):
    patient_name: str
    age: int
    language: str       # "hindi", "marathi", "telugu", etc.
    symptoms_text: str
    season: Optional[str] = "monsoon"
    region: Optional[str] = "maharashtra"


class VisualAnalysisResponse(BaseModel):
    visual_findings: str
    translated_findings: str


class TriageResponse(BaseModel):
    patient: str
    triage_summary: str
    translated_response: str


class DiagnosisResponse(BaseModel):
    probable_diagnosis: str
    urgency_level: str
    urgency_reason: str
    recommended_action: str
    first_aid: str
    medicines: str
    medicine_warning: str
    home_remedies: str
    translated_advice: str
    asha_notified: bool = False


class VoiceTriageResponse(BaseModel):
    transcribed_text: str
    triage_summary: str
    translated_response: str
