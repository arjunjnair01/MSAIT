import sys
import os
import requests
import json
import re

# Set your Gemini API key here
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "api_key")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=" + GEMINI_API_KEY

def extract_json_from_markdown(text):
    """Extract JSON from markdown code blocks."""
    # Look for content between ```json and ```
    match = re.search(r'```json\n(.*?)\n```', text, re.DOTALL)
    if match:
        return match.group(1)
    return text

def extract_meeting_info(transcript):
    """
    Extracts people, events, plans, tasks, deadlines, and other relevant information from the transcript using Gemini API.
    """
    print("Starting NLP extraction...", file=sys.stderr)
    prompt = f"""
    Analyze the meeting transcript below and provide:
    1. A concise summary of the key points discussed
    2. Detailed information about:
    - People mentioned (with roles if possible)
    - Events
    - Plans
    - Tasks
    - Deadlines
    - Any other important information
    
    Return the result as a JSON object with the following structure:
    {{
        "summary": "A concise summary of the key points discussed",
        "details": {{
            "people": [],
            "events": [],
            "plans": [],
            "tasks": [],
            "deadlines": [],
            "other_info": []
        }}
    }}
    
    Transcript:
    {transcript}
    """
    print("Sending request to Gemini API...", file=sys.stderr)
    headers = {"Content-Type": "application/json"}
    data = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    response = requests.post(GEMINI_API_URL, headers=headers, data=json.dumps(data))
    print(f"Gemini API response status: {response.status_code}", file=sys.stderr)
    
    if response.status_code == 200:
        try:
            candidates = response.json().get("candidates", [])
            if candidates:
                text = candidates[0]["content"]["parts"][0]["text"]
                print(f"Raw API response: {text}", file=sys.stderr)
                
                # Extract JSON from markdown if present
                json_text = extract_json_from_markdown(text)
                print(f"Extracted JSON text: {json_text}", file=sys.stderr)
                
                result = json.loads(json_text)
                print(f"Parsed result: {json.dumps(result, indent=2)}", file=sys.stderr)
                
                # Extract just the summary if that's all we need
                if isinstance(result, dict) and "summary" in result and "details" in result:
                    print(f"Extracted summary: {result['summary']}", file=sys.stderr)
                    print(f"Extracted details: {json.dumps(result['details'], indent=2)}", file=sys.stderr)
                    return result
                return result
            else:
                print("No candidates in API response", file=sys.stderr)
                return {"error": "No candidates returned from Gemini API."}
        except Exception as e:
            print(f"Error parsing response: {str(e)}", file=sys.stderr)
            print(f"Raw response: {response.text}", file=sys.stderr)
            return {"error": f"Failed to parse Gemini response: {e}", "raw_response": response.text}
    else:
        print(f"API error: {response.status_code}", file=sys.stderr)
        print(f"Error details: {response.text}", file=sys.stderr)
        return {"error": f"Gemini API error: {response.status_code}", "details": response.text}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python nlp_extraction.py <transcript_file_or_text>")
        sys.exit(1)
    
    input_text = sys.argv[1]
    
    # If input is a file path, read from file
    if os.path.isfile(input_text):
        try:
            with open(input_text, "r", encoding="utf-8") as f:
                transcript = f.read()
        except Exception as e:
            print(json.dumps({"error": f"Failed to read file: {e}"}))
            sys.exit(1)
    else:
        # Otherwise, use the input text directly
        transcript = input_text
    
    result = extract_meeting_info(transcript)
    print(json.dumps(result, indent=2, ensure_ascii=False)) 