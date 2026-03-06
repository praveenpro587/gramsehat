from deep_translator import GoogleTranslator

# Supported Indian language codes
LANGUAGE_CODES = {
    "hindi":    "hi",
    "marathi":  "mr",
    "telugu":   "te",
    "tamil":    "ta",
    "bengali":  "bn",
    "odia":     "or",
    "kannada":  "kn",
    "gujarati": "gu",
    "punjabi":  "pa",
    "malayalam":"ml",
    "english":  "en"
}


def translate_to_local(text: str, language: str) -> str:
    """
    Translates English text to the patient's local Indian language.
    Uses deep-translator (Google Translate under the hood) — FREE.
    Falls back to English if translation fails.
    """
    lang_code = LANGUAGE_CODES.get(language.lower(), "hi")

    if lang_code == "en":
        return text  # No translation needed

    try:
        translated = GoogleTranslator(source='en', target=lang_code).translate(text)
        return translated
    except Exception as e:
        print(f"Translation error (to {language}): {e}")
        return text  # Fallback to English


def translate_to_english(text: str, language: str) -> str:
    """
    Translates patient's local language input to English for LLM processing.
    Falls back to original text if translation fails.
    """
    lang_code = LANGUAGE_CODES.get(language.lower(), "hi")

    if lang_code == "en":
        return text  # Already English

    try:
        translated = GoogleTranslator(source=lang_code, target='en').translate(text)
        return translated
    except Exception as e:
        print(f"Translation error (from {language}): {e}")
        return text  # Fallback to original
