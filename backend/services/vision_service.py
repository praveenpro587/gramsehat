import os
import base64
import io
from groq import Groq
from dotenv import load_dotenv
from PIL import Image
import pillow_avif

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def convert_to_jpeg(image_bytes: bytes) -> str:
    """
    Converts any image format (AVIF, PNG, WEBP etc.) to JPEG base64.
    Groq only accepts JPEG/PNG/WEBP.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        # Convert to RGB (handles AVIF, RGBA, palette modes)
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")
        # Save as JPEG
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=85)
        output.seek(0)
        return base64.b64encode(output.read()).decode("utf-8")
    except Exception as e:
        raise ValueError(f"Could not convert image: {str(e)}")


def analyze_image(image_base64: str, symptom_context: str) -> str:
    """
    Analyzes a patient photo for visible medical signs.
    Auto-converts any image format to JPEG before sending to Groq.
    """
    # Clean base64 string
    if "," in image_base64:
        image_base64 = image_base64.split(",")[1]

    try:
        image_bytes = base64.b64decode(image_base64)
        # Auto convert to JPEG (handles AVIF, PNG, WEBP etc.)
        clean_base64 = convert_to_jpeg(image_bytes)
    except Exception as e:
        return f"FINDINGS: Could not process image — {str(e)}\nSEVERITY: unclear\nPOSSIBLE_CONDITION: Please retake photo\nCONFIDENCE: low"

    prompt = f"""You are a medical image analyst supporting rural healthcare workers in India.

Patient's reported symptoms: {symptom_context}

Please carefully analyze this image and look for any visible medical signs such as:
- Skin rashes, discoloration, or lesions
- Eye yellowing (jaundice) or redness
- Wounds, swelling, or infections
- Signs of malnutrition or anemia
- Any other visible abnormalities

Respond STRICTLY in this format:
FINDINGS: <describe exactly what you see>
SEVERITY: <mild / moderate / severe / unclear>
POSSIBLE_CONDITION: <what disease or condition this might indicate>
CONFIDENCE: <low / medium / high>
"""

    try:
        response = client.chat.completions.create(
            model="meta-llama/llama-4-maverick-17b-128e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{clean_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=400
        )
        return response.choices[0].message.content

    except Exception as e:
        return f"FINDINGS: Analysis failed — {str(e)}\nSEVERITY: unclear\nPOSSIBLE_CONDITION: Please try again\nCONFIDENCE: low"


def analyze_report_image(image_base64: str, report_type: str,
                          symptom_context: str) -> str:
    """Analyzes medical report images using Groq Vision."""

    # Clean base64
    if "," in image_base64:
        image_base64 = image_base64.split(",")[1]

    try:
        image_bytes  = base64.b64decode(image_base64)
        clean_base64 = base64.b64encode(image_bytes).decode("utf-8")
    except Exception as e:
        return f"REPORT_TYPE: {report_type}\nFINDINGS: Could not process image\nACTION: Please retake photo of report"

    report_labels = {
        "blood_test":   "Blood Test / CBC Report",
        "xray":         "X-Ray / Radiograph",
        "prescription": "Doctor Prescription",
        "discharge":    "Hospital Discharge Summary",
        "urine_test":   "Urine Test Report",
        "ecg":          "ECG / Heart Report",
        "other":        "Medical Document"
    }

    label = report_labels.get(report_type, "Medical Report")

    prompt = f"""You are a medical report analyst helping rural healthcare workers in India.

Report Type: {label}
Patient Symptoms Context: {symptom_context if symptom_context else "Not provided"}

Please analyze this medical report carefully and provide:
1. Key findings from the report
2. Any abnormal values or concerning results
3. What these results suggest about the patient's condition
4. Recommended next steps

Use simple language that a rural health worker can understand.
Highlight any CRITICAL or URGENT findings clearly.

Respond STRICTLY in this format:
REPORT_TYPE: {label}
KEY_FINDINGS: <main findings from the report>
ABNORMAL_VALUES: <any values outside normal range, or "None found">
INTERPRETATION: <what these results mean in simple terms>
URGENCY: <LOW / MEDIUM / HIGH>
RECOMMENDED_ACTION: <what should be done next>
"""

    try:
        response = client.chat.completions.create(
            model="meta-llama/llama-4-maverick-17b-128e-instruct",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url",
                     "image_url": {"url": f"data:image/jpeg;base64,{clean_base64}"}}
                ]
            }],
            max_tokens=600
        )
        return response.choices[0].message.content

    except Exception as e:
        return f"REPORT_TYPE: {label}\nKEY_FINDINGS: Analysis failed — {str(e)}\nRECOMMENDED_ACTION: Please try again with a clearer image"


def analyze_pdf_report(pdf_bytes: bytes, report_type: str,
                        symptom_context: str) -> str:
    """Analyzes PDF medical reports by extracting text."""
    try:
        import io
        # Try to extract text from PDF using basic method
        text = ""
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            for page in reader.pages:
                text += page.extract_text() + "\n"
        except ImportError:
            try:
                import PyPDF2
                reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
                for page in reader.pages:
                    text += page.extract_text() + "\n"
            except Exception:
                text = "Could not extract PDF text"

        if not text.strip() or text == "Could not extract PDF text":
            return f"REPORT_TYPE: {report_type}\nKEY_FINDINGS: Could not read PDF — please upload as image (JPG/PNG)\nRECOMMENDED_ACTION: Take a photo of the report and upload as image"

        # Use LLM to analyze extracted text
        prompt = f"""You are a medical report analyst for rural India healthcare.

Report Type: {report_type}
Patient Symptoms: {symptom_context}

Report Text:
{text[:3000]}

Analyze this report and respond STRICTLY in this format:
REPORT_TYPE: {report_type}
KEY_FINDINGS: <main findings>
ABNORMAL_VALUES: <abnormal values or "None found">
INTERPRETATION: <simple explanation>
URGENCY: <LOW / MEDIUM / HIGH>
RECOMMENDED_ACTION: <next steps>
"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.2
        )
        return response.choices[0].message.content

    except Exception as e:
        return f"REPORT_TYPE: {report_type}\nKEY_FINDINGS: PDF analysis failed\nRECOMMENDED_ACTION: Please upload report as image (JPG/PNG)"