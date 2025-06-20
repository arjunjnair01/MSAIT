# Install the assemblyai package by executing the command "pip install assemblyai"

import sys
import os
import pathlib


try:
    import assemblyai as aai
except ImportError as e:
    print(f"Failed to import assemblyai: {e}")
    print("Please install assemblyai using: pip install assemblyai")
    sys.exit(1)

# Get API key from environment variable or use default
aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY", "api_key")

def transcribe(audio_path, language="en"):
    try:
        # Convert path to absolute path and normalize
        audio_path = str(pathlib.Path(audio_path).resolve())
        
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        # Map language codes to AssemblyAI supported codes
        language_map = {
            "eng": "en",
            "en": "en",
            "es": "es",
            "fr": "fr",
            "de": "de",
            "it": "it",
            "pt": "pt",
            "nl": "nl",
            "ja": "ja",
            "ko": "ko",
            "zh": "zh"
        }
        
        # Get the correct language code
        language_code = language_map.get(language.lower(), "en")
        
        config = aai.TranscriptionConfig(
            speech_model=aai.SpeechModel.best,
            language_code=language_code
        )

        transcript = aai.Transcriber(config=config).transcribe(audio_path)

        if transcript.status == "error":
            raise RuntimeError(f"Transcription failed: {transcript.error}")

        return transcript.text
    except Exception as e:
        print(f"Error in transcription: {e}", file=sys.stderr)
        raise

if __name__ == "__main__":
    if len(sys.argv) < 2: 
       sys.exit(1)
    
    audio_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "en"
    
    try:
        transcript = transcribe(audio_path, language)
        print(transcript)
    except Exception as e:
        print(f"Error during transcription: {e}", file=sys.stderr)
        sys.exit(1)