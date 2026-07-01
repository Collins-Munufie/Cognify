"""
Service to extract key information from documents for display alongside flashcards
"""
import json
import logging
from openai import AsyncOpenAI
from dotenv import load_dotenv
import os
import asyncio

load_dotenv()

logger = logging.getLogger(__name__)

api_key = os.getenv("GROQ_API_KEY")
AI_REQUEST_TIMEOUT_SECONDS = int(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "45"))

def _fallback_document_info(text: str):
    return {
        "title": "Document Information",
        "summary": "Unable to extract summary. Please review the document directly.",
        "key_concepts": [],
        "key_points": [],
        "word_count": len(text.split())
    }

async def extract_document_info(text: str):
    """
    Extract key information from document text for preview display.
    Returns: dict with title, summary, key_concepts, and key_points
    """
    logger.info("Extracting document information...")
    if not api_key:
        logger.warning("GROQ_API_KEY not found. Returning fallback document info.")
        return _fallback_document_info(text)

    client = AsyncOpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1"
    )
    
    prompt = f"""
    Analyze the following document and extract key information in JSON format.
    
    Return a JSON object with these exact keys:
    {{
        "title": "Document title or inferred title (max 100 chars)",
        "summary": "Executive summary in 3-4 sentences (max 300 chars)",
        "key_concepts": ["concept1", "concept2", "concept3", "concept4", "concept5"],
        "key_points": [
            "Important point 1",
            "Important point 2", 
            "Important point 3",
            "Important point 4"
        ],
        "word_count": estimated_word_count
    }}
    
    Be concise and academic. Focus on what a student needs to know.
    
    Document:
    {text[:3000]}
    """
    
    models_to_try = [
        "llama-3.3-70b-versatile",
        "llama-3.1-70b-versatile",
        "mixtral-8x7b-32768",
    ]
    
    for model_name in models_to_try:
        try:
            logger.info(f"Extracting info with model: {model_name}")
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": "You are a JSON-only API. Always return valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.5,
                    max_tokens=500
                ),
                timeout=AI_REQUEST_TIMEOUT_SECONDS,
            )
            
            result_content = response.choices[0].message.content
            
            # Clean up JSON if wrapped in markdown
            clean_content = result_content.strip()
            start_idx = clean_content.find('{')
            end_idx = clean_content.rfind('}')
            if start_idx != -1 and end_idx != -1:
                clean_content = clean_content[start_idx:end_idx+1]
                
            data = json.loads(clean_content)
            logger.info(f"Successfully extracted document info")
            return data
            
        except Exception as model_error:
            logger.warning(f"Model {model_name} failed for extraction: {str(model_error)}")
            continue
    
    # Fallback if all models fail
    logger.error("All models failed for extraction, returning minimal info")
    return _fallback_document_info(text)
