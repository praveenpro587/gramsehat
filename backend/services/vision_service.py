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