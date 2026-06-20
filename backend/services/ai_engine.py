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

# Initialize API clients
clients = {}

# 1. Groq (Primary)
groq_api_key = os.getenv("GROQ_API_KEY")
if groq_api_key:
    clients["groq"] = AsyncOpenAI(api_key=groq_api_key, base_url="https://api.groq.com/openai/v1")
    logger.info("Groq API initialized.")
else:
    logger.warning("GROQ_API_KEY not found.")

# 2. Gemini (Secondary)
gemini_api_key = os.getenv("GEMINI_API_KEY")
if gemini_api_key:
    clients["gemini"] = AsyncOpenAI(api_key=gemini_api_key, base_url="https://generativelanguage.googleapis.com/v1beta/openai/")
    logger.info("Gemini API initialized.")
else:
    logger.warning("GEMINI_API_KEY not found.")

# 3. OpenRouter (Tertiary)
openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
if openrouter_api_key:
    clients["openrouter"] = AsyncOpenAI(api_key=openrouter_api_key, base_url="https://openrouter.ai/api/v1")
    logger.info("OpenRouter API initialized.")
else:
    logger.warning("OPENROUTER_API_KEY not found.")

# Provider and Model configurations in order of priority
FALLBACK_CONFIGS = [
    {"provider": "groq", "model": "llama-3.3-70b-versatile"},
    {"provider": "groq", "model": "llama-3.1-70b-versatile"},
    {"provider": "groq", "model": "mixtral-8x7b-32768"},
    {"provider": "gemini", "model": "gemini-1.5-flash"},
    {"provider": "gemini", "model": "gemini-1.5-pro"},
    {"provider": "openrouter", "model": "meta-llama/llama-3-8b-instruct:free"},
    {"provider": "openrouter", "model": "google/gemma-2-9b-it:free"}
]

async def _execute_with_fallback(messages: list, temperature: float = 0.5):
    """Executes a chat completion request across providers with fallback logic."""
    for config in FALLBACK_CONFIGS:
        provider = config["provider"]
        model_name = config["model"]
        
        if provider not in clients:
            continue
            
        try:
            client = clients[provider]
            response = await client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.warning(f"Fallback warning: {provider} model {model_name} failed: {str(e)}")
            continue
            
    raise Exception("All API providers failed.")

# Simple in-memory cache to prevent duplicate requests
TEXT_CACHE = {}

import asyncio

async def _generate_module_group(text: str, modules: list) -> dict:
    if not modules:
        return {}
        
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
GLOBAL ANTI-REPETITION RULE (VERY IMPORTANT)
----------------------------------------
- Do NOT repeat concepts across sections
- Each MCQ, Fill-in, Flashcard, and Written Question must test a UNIQUE idea
- Avoid semantic duplication (same idea reworded)
- If duplication occurs, internally regenerate before output

"""

    if any(m in modules for m in ["Multiple Choice (Quiz)", "Quiz", "Fill-in-the-Blank", "Written Test", "Flashcards"]):
        prompt += "----------------------------------------\n"
        prompt += "CRITICAL QUANTITY REQUIREMENTS\n"
        prompt += "----------------------------------------\n"
        if "Multiple Choice (Quiz)" in modules or "Quiz" in modules:
            prompt += "- ALWAYS generate EXACTLY 15 MCQs (`quiz`)\n"
        if "Fill-in-the-Blank" in modules:
            prompt += "- ALWAYS generate EXACTLY 20 Fill-in-the-Blanks (`fill_blanks`) to ensure enough unique answers can be filtered\n"
        if "Written Test" in modules:
            prompt += "- ALWAYS generate EXACTLY 15 Written Questions (`short_questions`)\n"
        if "Flashcards" in modules:
            prompt += "- ALWAYS generate EXACTLY 15 Flashcards (`flashcards`)\n"
        prompt += "- If text is too short, reduce intelligently without repetition or hallucination\n\n"

    if "Fill-in-the-Blank" in modules:
        prompt += """----------------------------------------
FILL-IN-THE-BLANK RULES
----------------------------------------
- MUST be intelligent, diverse, clean, and non-repetitive
- NEVER repeat any answer (`blank_word` must be unique)
- Avoid repeated phrases, lines, or consecutive words
- Extract from key concepts, definitions, names, steps, and important terms
- Do NOT blank random words
- Maintain sentence meaning and clarity

"""

    if "Notes" in modules:
        prompt += """----------------------------------------
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

"""

    if "Podcast" in modules:
        prompt += """----------------------------------------
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

"""

    if "Tutor Lesson" in modules:
        prompt += """----------------------------------------
Tutor Lesson SECTION (STRICT STRUCTURE)
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

"""

    prompt += f"""----------------------------------------
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
    
    for config in FALLBACK_CONFIGS:
        provider = config["provider"]
        model_name = config["model"]
        
        if provider not in clients:
            continue
            
        try:
            logger.info(f"Calling {provider.upper()} API with model: {model_name} for modules: {modules}")
            
            client = clients[provider]
            
            api_kwargs = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": "You are a JSON-only API. You must output ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
            }
            
            # Response formats differ by provider and model. 
            # Safest is to use response_format for Groq natively.
            if provider == "groq" and ("llama-3" in model_name or "mixtral" in model_name):
                api_kwargs["response_format"] = {"type": "json_object"}
                
            response = await client.chat.completions.create(**api_kwargs)
            
            logger.info(f"{provider.upper()} API response received with model {model_name} for {modules}")
            result_content = response.choices[0].message.content
            
            clean_content = result_content.strip()
            # Robust JSON extraction
            start_idx = clean_content.find('{')
            end_idx = clean_content.rfind('}')
            if start_idx != -1 and end_idx != -1:
                clean_content = clean_content[start_idx:end_idx+1]
                
            data = json.loads(clean_content)
            
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
                data["fill_blanks"] = unique_blanks[:15]  # Cap at exactly 15 unique blanks
            
            logger.info(f"Successfully generated study modules {modules} with model {model_name}")
            return data
            
        except Exception as model_error:
            logger.warning(f"Model {model_name} failed: {str(model_error)}")
            continue
    
    logger.error(f"All API fallback models failed. Group {modules} will be skipped.")
    return {}

async def generate_flashcards(text: str, card_type: str = "Standard", selected_modules: list = None):
    """
    Calls Groq API to generate a complete study set from text.
    Implements caching and parallel group execution to prevent LLM truncation.
    """
    # 1. Caching logic
    text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
    modules = selected_modules or ["Notes", "Quiz", "Flashcards", "Fill-in-the-Blank", "Written Test", "True/False", "Tutor Lesson", "Podcast"]
    
    module_key = "-".join(sorted(modules))
    cache_key = f"{text_hash}_{card_type}_{module_key}"
    if cache_key in TEXT_CACHE:
        logger.info("Serving generated study set from memory CACHE.")
        return TEXT_CACHE[cache_key]

    logger.info(f"Generating flashcards with card_type: {card_type}, text length: {len(text)}")
    
    # 2. Group the modules into Q&A vs Long-form to avoid hitting the 8000 token limit of a single call
    modules = selected_modules or ["Notes", "Quiz", "Flashcards", "Fill-in-the-Blank", "Written Test", "True/False", "Tutor Lesson", "Podcast"]
    
    group_a = [] # MCQs, Flashcards, True/False
    group_b = [] # Fill-in-the-Blanks, Written Test
    long_form_groups = [] # Notes, Tutor Lesson, Podcast
    
    for m in modules:
        if m in ["Notes", "Tutor Lesson", "Podcast"]:
            long_form_groups.append([m])
        elif m in ["Fill-in-the-Blank", "Written Test"]:
            group_b.append(m)
        else:
            group_a.append(m)
            
    # Execute all group generations concurrently
    tasks = []
    if group_a:
        tasks.append(_generate_module_group(text, group_a))
    if group_b:
        tasks.append(_generate_module_group(text, group_b))
    for g in long_form_groups:
        tasks.append(_generate_module_group(text, g))
        
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # 3. Merge outputs
    final_data = {}
    for res in results:
        if isinstance(res, dict):
            final_data.update(res)
        else:
            logger.error(f"Module generation group failed with error: {res}")
        
    # Ensure definitions list exists so frontend doesn't crash if it was entirely omitted
    if "definitions" not in final_data:
        final_data["definitions"] = []
            
    TEXT_CACHE[cache_key] = final_data
    
    logger.info(f"Successfully merged study modules.")
    return final_data

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
        response_text = await _execute_with_fallback(api_messages, temperature=0.5)
        return response_text
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
        result_content = await _execute_with_fallback([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt_str}
        ], temperature=0.2)
        
        result_content = result_content.strip()
        if result_content.startswith("```json"): result_content = result_content[7:]
        if result_content.startswith("```"): result_content = result_content[3:]
        if result_content.endswith("```"): result_content = result_content[:-3]
            
        return json.loads(result_content.strip())
    except Exception as e:
        logger.error(f"Grade API failed: {str(e)}")
        raise Exception("Failed to evaluate test answers.")