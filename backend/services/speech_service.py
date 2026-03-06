import os
import shutil
import tempfile
from groq import Groq
from gtts import gTTS
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Supported Indian language codes for gTTS
LANGUAGE_CODES = {
    "hindi":   "hi",
    "marathi": "mr",
    "telugu":  "te",
    "tamil":   "ta",
    "bengali": "bn",
    "odia":    "or",
    "kannada": "kn",
    "gujarati":"gu",
    "punjabi": "pa",
    "malayalam":"ml"
}


def transcribe_audio(audio_file_path: str) -> str:
    """
    Converts patient voice recording to text using Groq Whisper Large V3.
    Supports all Indian languages automatically.
    FREE — up to 7,200 minutes/day on Groq free tier.
    """
    with open(audio_file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=audio_file,
            response_format="text"
        )
    return transcript


def text_to_speech(text: str, language: str = "hindi") -> str:
    """
    Converts diagnosis text to spoken audio in patient's local language.
    Uses gTTS (Google Text-to-Speech) — completely FREE, no API key needed.
    Returns path to the generated MP3 file.
    """
    lang_code = LANGUAGE_CODES.get(language.lower(), "hi")

    try:
        tts = gTTS(text=text, lang=lang_code, slow=False)
        # output_path = "/tmp/gramsehat_response.mp3"
        output_path = os.path.join(tempfile.gettempdir(), "gramsehat_response.mp3")
        tts.save(output_path)
        return output_path
    except Exception as e:
        print(f"TTS error: {e}")
        # Fallback to Hindi if language not supported
        tts = gTTS(text=text, lang="hi", slow=False)
        # output_path = "/tmp/gramsehat_response_fallback.mp3"
        output_path = os.path.join(tempfile.gettempdir(), "gramsehat_response_fallback.mp3")
        tts.save(output_path)
        return output_path
