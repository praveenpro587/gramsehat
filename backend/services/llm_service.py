import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def triage_symptoms(symptoms_text: str, age: int, season: str, region: str) -> str:
    """
    Takes patient symptoms and returns triage analysis with follow-up questions.
    Uses Groq Llama 3.1 70B for fast, accurate responses.
    """
    prompt = f"""You are a rural healthcare assistant in India helping ASHA workers triage patients.

Patient Age: {age}
Region: {region}
Season: {season}
Symptoms described: {symptoms_text}

Your job:
1. Summarize what the patient is experiencing
2. Ask 3 smart follow-up questions to better understand the condition
3. Assign an initial concern level

Focus on diseases common in rural India: Malaria, Dengue, Typhoid, Diarrhea, Tuberculosis, Anemia, Snake bite.
Consider the season (monsoon = higher malaria/dengue risk) and region.

Respond STRICTLY in this format:
SUMMARY: <one line summary of symptoms>
QUESTIONS: <question 1> | <question 2> | <question 3>
CONCERN_LEVEL: <low/medium/high>
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500,
        temperature=0.3   # Low temp for consistent medical responses
    )
    return response.choices[0].message.content


def generate_diagnosis(symptoms_summary: str, visual_findings: str,
                       age: int, region: str) -> dict:

    prompt = f"""You are an experienced rural doctor in India. A patient needs assessment.

Patient Age: {age}
Region: {region}
Symptoms Summary: {symptoms_summary}
Visual Findings: {visual_findings if visual_findings else "None"}

Urgency Levels:
- GREEN: Minor issue, home care is sufficient
- YELLOW: Needs PHC visit within 24 hours
- RED: Emergency — go to hospital immediately

Medicine Guidelines:
- Only suggest BASIC medicines available at rural medical shops
- Include COMMON Indian brand names patients will recognize
- Always mention correct dosage and frequency
- Always add "consult doctor before taking" warning
- For RED cases suggest emergency medicines only until they reach hospital
- Consider patient age for dosage (child vs adult)

Respond STRICTLY in this exact format (one value per line):
DIAGNOSIS: <most probable diagnosis>
URGENCY: <GREEN or YELLOW or RED>
URGENCY_REASON: <brief reason for this urgency level>
FIRST_AID: <2-3 simple first aid steps using items available in a village>
ACTION: <exact next step the patient should take>
MEDICINES: <list medicines in this format: MedicineName (BrandName) - Dosage - Frequency - Purpose | separate each medicine with pipe symbol>
MEDICINE_WARNING: <important warnings about the medicines>
HOME_REMEDIES: <2-3 simple home remedies using kitchen items>
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=900,
        temperature=0.2
    )

    text = response.choices[0].message.content
    result = {}
    for line in text.strip().split('\n'):
        line = line.strip()
        if ':' in line:
            key, value = line.split(':', 1)
            result[key.strip()] = value.strip()

    # Safe defaults
    result.setdefault("DIAGNOSIS", "Unable to determine — please see a doctor")
    result.setdefault("URGENCY", "YELLOW")
    result.setdefault("URGENCY_REASON", "Precautionary measure")
    result.setdefault("FIRST_AID", "Rest, drink clean water, avoid solid food if vomiting")
    result.setdefault("ACTION", "Visit your nearest Primary Health Centre (PHC)")
    result.setdefault("MEDICINES", "Paracetamol (Crocin) - 500mg - Every 6 hours - For fever/pain")
    result.setdefault("MEDICINE_WARNING", "Always consult a doctor before taking any medicine")
    result.setdefault("HOME_REMEDIES", "Drink warm water with tulsi leaves | Rest in cool place | Stay hydrated")

    return result
