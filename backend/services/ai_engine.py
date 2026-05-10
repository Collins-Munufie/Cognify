import os
import json
import logging
from openai import AsyncOpenAI
from dotenv import load_dotenv
import hashlib

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Groq API client using OpenAI SDK compatibility layer
api_key = os.getenv("GROQ_API_KEY")
logger.info(f"GROQ_API_KEY loaded: {'Yes' if api_key else 'No API Key'}")

client = AsyncOpenAI(
    api_key=api_key,
    base_url="https://api.groq.com/openai/v1"
)

# Simple in-memory cache to prevent duplicate requests
TEXT_CACHE = {}

async def generate_flashcards(text: str, card_type: str = "Standard", selected_modules: list = None):
    """
    Calls Groq API to generate a complete study set from text.
    Implements caching to reduce identical calls.
    """
    # 1. Caching logic
    text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
    if text_hash in TEXT_CACHE:
        logger.info("Serving generated study set from memory CACHE.")
        return TEXT_CACHE[text_hash]

    logger.info(f"Generating flashcards with card_type: {card_type}, text length: {len(text)}")
    
    # Dynamically build the required JSON output based on selective processing
    modules = selected_modules or ["Notes", "Quiz", "Flashcards", "Fill-in-the-Blank", "Written Test", "True/False", "Tutor Lesson", "Podcast"]
    
    json_structure = "{\n"
    if "Notes" in modules:
        json_structure += '      "summary": "High-quality PowerPoint-style study notes formatted in Markdown. Use slide headings (## Slide X: Title) and bullet points. Must cover EVERYTHING from the material clearly.",\n'
        json_structure += '      "key_points": ["Key point 1", "Key point 2"],\n'
    if "Flashcards" in modules:
        json_structure += '      "flashcards": [{"question": "Q?", "answer": "A", "difficulty": "easy"}],\n'
    if "Multiple Choice (Quiz)" in modules or "Quiz" in modules:
        json_structure += '      "quiz": [{"question": "Q?", "options": ["A", "B", "C", "D"], "correct_answer": "A"}],\n'
    if "Fill-in-the-Blank" in modules:
        json_structure += '      "fill_blanks": [{"sentence": "The cell ____.", "blank_word": "mitochondria"}],\n'
    if "Written Test" in modules:
        json_structure += '      "short_questions": ["Short Q1?", "Short Q2?"],\n'
    if "True/False" in modules or "True / False" in modules or "True/False (Quiz)" in modules:
        json_structure += '      "true_false": [{"statement": "Statement.", "answer": true, "explanation": "Why"}],\n'
    if "Podcast" in modules:
        json_structure += '      "podcast_script": "A highly engaging, conversational, human-like educational podcast script covering the material.",\n'
    
    if "Tutor Lesson" in modules:
        json_structure += '      "tutor_lesson": "A structured, readable lesson formatted in Markdown. Organize into clear sections with headings and subheadings. Break content into paragraphs, explain concepts step-by-step, use bullet points where needed, include examples, and keep language simple and clear. Make lessons interactive and easy to study. SUGGESTED FORMAT: Topic Introduction, Core Explanation, Examples, Important Facts, Common Mistakes, Quick Quiz, Final Summary.",\n'
    
    json_structure += '      "definitions": [{"term": "Term", "definition": "Definition"}]\n    }'

    prompt = f"""
You are Cognify, an intelligent AI study assistant.

Your task is to transform the provided text into a complete, structured, high-quality learning module.

----------------------------------------
CRITICAL QUANTITY REQUIREMENTS
----------------------------------------
- ALWAYS generate EXACTLY 20 MCQs (`quiz`)
- ALWAYS generate EXACTLY 25 Fill-in-the-Blanks (`fill_blanks`) to ensure enough unique answers can be filtered
- ALWAYS generate EXACTLY 10 Written Questions (`short_questions`)
- ALWAYS generate EXACTLY 10 Flashcards (`flashcards`)
- If text is too short, reduce intelligently without repetition or hallucination

----------------------------------------
GLOBAL ANTI-REPETITION RULE (VERY IMPORTANT)
----------------------------------------
- Do NOT repeat concepts across sections
- Each MCQ, Fill-in, Flashcard, and Written Question must test a UNIQUE idea
- Avoid semantic duplication (same idea reworded)
- If duplication occurs, internally regenerate before output

----------------------------------------
FILL-IN-THE-BLANK RULES
----------------------------------------
- MUST be intelligent, diverse, clean, and non-repetitive
- NEVER repeat any answer (`blank_word` must be unique)
- Avoid repeated phrases, lines, or consecutive words
- Extract from:
  * key concepts
  * definitions
  * names
  * steps
  * important terms
- Do NOT blank random words
- Maintain sentence meaning and clarity

----------------------------------------
NOTES GENERATION (POWERPOINT STYLE)
----------------------------------------
Your task is to convert the provided material into high-quality PowerPoint-style study notes that are easy to learn, structured, and concept-focused. The "summary" JSON field MUST follow EXACTLY this format:

GOAL:
- Feel like real lecture slides or PowerPoint presentation notes
- Help students easily understand and remember the full concept
- Cover EVERYTHING important from the material clearly

STRUCTURE (MANDATORY):
Format the output like PowerPoint slides using Markdown:
Each section must look like a slide:

## Slide 1: Title
- Bullet point
- Bullet point
- Bullet point

## Slide 2: Topic Name
- Key explanation
- Important idea
- Supporting detail

CONTENT REQUIREMENTS:
Include:
1. Title Slide
2. Introduction / Overview
3. Main Topics (broken into multiple slides)
4. Key Concepts and Explanations
5. Important Terms and Definitions
6. Step-by-Step Processes (if applicable)
7. Examples (simple and clear)
8. Diagrams explanation (describe if needed)
9. Key Points to Remember
10. Common Exam Questions
11. Summary / Conclusion

STYLE RULES:
- Use bullet points (NOT long paragraphs)
- Keep each point short but meaningful
- Use simple and clear language
- Avoid unnecessary complexity
- Highlight important terms using **bold**
- Break complex ideas into multiple slides
- Ensure logical flow from one slide to another

LEARNING FOCUS:
- Make it easy for a student to revise quickly
- Ensure concepts are well explained, not just listed
- Avoid vague summaries
- Make it feel like a real classroom presentation

QUALITY RULES:
- No repetition
- No missing key concepts
- Content must strictly match the material
- Output must be clean and well-structured

----------------------------------------
PODCAST SCRIPT GENERATION
----------------------------------------
Turn the provided material into a highly engaging, human-like educational podcast transcript.

Requirements:
- Do NOT sound robotic or like a summary
- Explain concepts like a great teacher speaking to a student
- Use simple, clear language but still cover all important details
- Add natural expressions like: "Now, here's the interesting part...", "Let's break this down...", "You might be wondering..."
- Use storytelling where possible to explain ideas
- Include real-world examples and analogies to improve understanding
- Break content into short, smooth segments (like a real podcast episode)
- Occasionally recap key ideas naturally (not like bullet points)

Engagement Mode:
- Make the tone conversational, lively, and slightly informal
- Avoid long boring paragraphs-use rhythm and variation
- Add curiosity hooks and transitions to keep the listener interested
- Output the entire script as a single continuous text string in the `podcast_script` JSON field.

----------------------------------------
TUTOR LESSON SECTION (STRICT STRUCTURE)
----------------------------------------
The "tutor_lesson" MUST follow EXACTLY this format:

# Topic Introduction
# Core Explanation
# Examples
# Important Facts
# Common Mistakes
# Quick Quiz
# Final Summary

- Organize lessons into clear sections using headings and subheadings.
- Break content into paragraphs.
- Explain concepts step-by-step.
- Use bullet points where needed.
- Keep language simple and clear.
- Make lessons interactive and easy to study.

----------------------------------------
GENERAL QUALITY RULES
----------------------------------------
- Content MUST match the provided text strictly.
- No vague summaries
- No wall of text
- Must be readable on mobile and desktop
- Act like a real teacher, not a summarizer.

----------------------------------------
OUTPUT FORMAT
----------------------------------------
Return ONLY valid JSON using this exact structure:
{json_structure}

----------------------------------------
TEXT
----------------------------------------
{text[:15000]}
"""
    
    models_to_try = [
        "llama-3.3-70b-versatile",
        "llama-3.1-70b-versatile",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
        "llama-2-70b-chat",
    ]
    
    for model_name in models_to_try:
        try:
            logger.info(f"Calling Groq API with model: {model_name}...")
            # Only use response_format for models that definitely support it to prevent API errors
            api_kwargs = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": "You are a JSON-only API. You must output ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 4000
            }
            if "llama-3" in model_name or "mixtral" in model_name:
                api_kwargs["response_format"] = {"type": "json_object"}
                
            response = await client.chat.completions.create(**api_kwargs)
            
            logger.info(f"Groq API response received with model {model_name}: {response.choices[0].message.content[:100]}...")
            result_content = response.choices[0].message.content
            
            clean_content = result_content.strip()
            if clean_content.startswith("```json"):
                clean_content = clean_content[7:]
            if clean_content.startswith("```"):
                clean_content = clean_content[3:]
            if clean_content.endswith("```"):
                clean_content = clean_content[:-3]
                
            data = json.loads(clean_content.strip())
            
            # Programmatic Deduplication for Fill-in-the-Blanks
            import re
            if "fill_blanks" in data and isinstance(data["fill_blanks"], list):
                unique_blanks = []
                seen_answers = set()
                for fb in data["fill_blanks"]:
                    ans = str(fb.get("blank_word", "")).strip().lower()
                    if ans and ans not in seen_answers:
                        seen_answers.add(ans)
                        
                        # Fix AI formatting: replace multiple blanks (e.g. "____ ____") with a single "____"
                        sentence = fb.get("sentence", "")
                        sentence = re.sub(r'(_{2,}(?:\s+_{2,})*)', '____', sentence)
                        fb["sentence"] = sentence
                        
                        unique_blanks.append(fb)
                data["fill_blanks"] = unique_blanks[:20]  # Cap at exactly 20 unique blanks
            
            TEXT_CACHE[text_hash] = data
            
            logger.info(f"Successfully generated study set (flashcards, quiz, summary) with model {model_name}")
            return data
            
        except Exception as model_error:
            logger.warning(f"Model {model_name} failed: {str(model_error)}")
            continue
    
    logger.error(f"All Groq models failed. Last error will be reported.")
    raise Exception(f"Failed to generate flashcards with Groq API. Please check your API key and try again.")

async def chat_with_ai(messages: list, context_text: str):
    """
    Passes conversational history and source context to the LLM to act as a study tutor.
    """
    system_prompt = f"""You are Cognify, an intelligent AI tutor.

Your primary responsibility is to answer questions based on the provided Source Material.

----------------------------------------
CORE BEHAVIOR
----------------------------------------

1. PRIORITY RULE:
- Always prioritize the Source Material when answering questions.
- If the answer exists in the material, use it strictly.

2. OUT-OF-SCOPE HANDLING:
- If the question is NOT covered in the Source Material:
  - You are allowed to answer using your general knowledge.
  - Clearly indicate that the answer is outside the provided material.

Example:
"This information is not explicitly in the provided material, but here is a general explanation: ..."

3. NO HALLUCINATION RULE:
- Do NOT invent information from the material.
- If unsure, say so clearly.

----------------------------------------
ANSWER STYLE
----------------------------------------

- Be clear, structured, and easy to understand
- Use step-by-step explanations where needed
- Use examples when helpful
- Avoid long, confusing paragraphs

----------------------------------------
CONTEXT USAGE
----------------------------------------

Source Material:
{context_text[:6000]}

----------------------------------------
FINAL INSTRUCTION
----------------------------------------

Always behave like a real tutor:
- Teach clearly
- Stay accurate
- Respect the material
- Provide helpful explanations even beyond the material when necessary
"""
    
    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        api_messages.append({"role": "user" if msg["sender"] == "user" else "assistant", "content": msg["text"]})
        
    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=api_messages,
            temperature=0.5
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Chat API failed: {str(e)}")
        raise Exception("Failed to generate AI response.")

async def grade_written_test(questions: list, user_answers: list, context_text: str):
    """
    Uses LLM to grade a written test, returning strict JSON structure with scores and feedback.
    """
    system_prompt = f"""
    You are an expert AI grader. 
    Evaluate the student's written answers to the following questions based strictly on the source material.
    
    Source Material: {context_text[:5000]}
    
    Output strictly as a JSON object with this exact structure:
    {{
       "score": 85,
       "evaluations": [
           {{
              "question": "The question asked...",
              "model_answer": "The ideal correct answer...",
              "user_answer": "What the user wrote...",
              "feedback": "Direct advice on how they can improve..."
           }}
       ]
    }}
    Do NOT output any conversational text outside of the JSON block.
    """
    
    prompt_str = f"Questions: {json.dumps(questions)}\nStudent Answers: {json.dumps(user_answers)}"
    
    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt_str}
            ],
            temperature=0.2
        )
        
        result_content = response.choices[0].message.content.strip()
        if result_content.startswith("```json"): result_content = result_content[7:]
        if result_content.startswith("```"): result_content = result_content[3:]
        if result_content.endswith("```"): result_content = result_content[:-3]
            
        return json.loads(result_content.strip())
    except Exception as e:
        logger.error(f"Grade API failed: {str(e)}")
        raise Exception("Failed to evaluate test answers.")