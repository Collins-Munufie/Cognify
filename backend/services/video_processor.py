import re
import logging
import requests
import json
import xml.etree.ElementTree as ET
from youtube_transcript_api import YouTubeTranscriptApi
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)

def extract_video_id(url: str) -> str:
    """Extracts the YouTube video ID from various YouTube URL formats."""
    patterns = [
        r'(?:v=|\/v\/|embed\/|shorts\/|live\/|watch\/|youtu\.be\/)([^&\s?#]+)',
        r'(?:https?://)?(?:www\.)?youtube\.com/watch\?.*v=([^&\s?#]+)',
        r'(?:https?://)?(?:www\.)?youtu\.be/([^&\s?#]+)'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            video_id = match.group(1)
            if len(video_id) == 11:
                return video_id
                
    # Fallback to query parsing
    try:
        parsed_url = urlparse(url)
        if parsed_url.hostname in ['www.youtube.com', 'youtube.com', 'm.youtube.com']:
            query = parse_qs(parsed_url.query)
            if 'v' in query:
                return query['v'][0]
            # Try path split for formats like shorts or embed
            path_parts = parsed_url.path.strip('/').split('/')
            for part in path_parts:
                if len(part) == 11:
                    return part
        elif parsed_url.hostname in ['youtu.be']:
            return parsed_url.path.strip('/')
    except Exception:
        pass
    return None

def _extract_via_youtube_transcript_api(video_id: str) -> str:
    """Method A: Fetch using standard youtube-transcript-api."""
    ytt_api = YouTubeTranscriptApi()
    transcript_list_obj = ytt_api.list(video_id)
    
    # 1. Try to get native english transcript
    try:
        transcript_obj = transcript_list_obj.find_transcript(['en', 'en-US', 'en-GB'])
    except Exception:
        # 2. Try to get first available transcript
        try:
            transcript_obj = next(iter(transcript_list_obj))
        except StopIteration:
            raise ValueError("No captions found for this video.")
    
    # 3. If transcript is not in English but is translatable, translate it to English
    if transcript_obj.language_code not in ['en', 'en-US', 'en-GB'] and transcript_obj.is_translatable:
        try:
            transcript_obj = transcript_obj.translate('en')
        except Exception as trans_err:
            logger.warning(f"Translation failed, using original transcript language: {trans_err}")
            
    # 4. Fetch the transcript snippets
    transcript_data = transcript_obj.fetch()
    
    transcript_texts = []
    for t in transcript_data:
        if isinstance(t, dict) and 'text' in t:
            transcript_texts.append(t['text'])
        elif hasattr(t, 'text'):
            transcript_texts.append(t.text)
            
    if not transcript_texts:
        raise ValueError("Transcript content is empty.")
        
    return " ".join(transcript_texts)

def _extract_via_transcript_ai_endpoint(video_id: str) -> str:
    """Method B: Fetch using youtube-transcript.ai API with custom browser headers."""
    url = f"https://youtube-transcript.ai/transcript/{video_id}.txt"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/plain,text/html,*/*"
    }
    
    res = requests.get(url, headers=headers, timeout=10)
    res.raise_for_status()
    text = res.text
    
    if "you're calling this api at high volume" in text.lower():
        raise Exception("API rate limited")
        
    parts = text.split("## Transcript")
    transcript_body = parts[1] if len(parts) > 1 else text
    
    # Remove timestamps like [0:00], [12:34], [1:23:45]
    clean_text = re.sub(r'\[\d+(?::\d+)+\]', '', transcript_body)
    
    lines = [line.strip() for line in clean_text.splitlines() if line.strip()]
    if not lines:
        raise ValueError("Fetched empty transcript body.")
        
    return " ".join(lines)

def _extract_via_custom_html_scraper(video_id: str) -> str:
    """Method C: Extract captions directly from YouTube watch page HTML."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    res = requests.get(url, headers=headers, timeout=10)
    res.raise_for_status()
    
    match = re.search(r'ytInitialPlayerResponse\s*=\s*({.+?});', res.text)
    if not match:
        match = re.search(r'ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*var', res.text)
        
    if not match:
        raise ValueError("Could not extract player response from HTML.")
        
    player_data = json.loads(match.group(1))
    captions = player_data.get("captions", {}).get("playerCaptionsTracklistRenderer", {}).get("captionTracks", [])
    if not captions:
        raise ValueError("No caption tracks found in watch page.")
        
    selected_track = next((t for t in captions if t.get('languageCode') in ['en', 'en-US']), captions[0])
    base_url = selected_track.get('baseUrl')
    
    # We must append a format query param to timedtext URLs to get a non-empty response
    xml_res = requests.get(base_url + "&fmt=srv3", headers=headers, timeout=10)
    xml_res.raise_for_status()
    
    # Parse the XML format (srv3)
    root = ET.fromstring(xml_res.content)
    text_segments = [child.text for child in root.findall('text') if child.text]
    
    if not text_segments:
        raise ValueError("Decoded empty text tracks.")
        
    return " ".join(text_segments)

def extract_transcript(url: str) -> str:
    """Extracts transcript from a YouTube video URL with triple-fail-safe fallbacks."""
    video_id = extract_video_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube URL format. We support standard watch, mobile, Shorts, Live, and Embed links.")
        
    # Method A: YouTubeTranscriptApi
    try:
        logger.info(f"Method A: Fetching transcript for {video_id} using YouTubeTranscriptApi")
        return _extract_via_youtube_transcript_api(video_id)
    except Exception as e_a:
        logger.warning(f"Method A failed: {e_a}")
        
    # Method B: Transcript AI endpoint
    try:
        logger.info(f"Method B: Fetching transcript for {video_id} using youtube-transcript.ai API")
        return _extract_via_transcript_ai_endpoint(video_id)
    except Exception as e_b:
        logger.warning(f"Method B failed: {e_b}")
        
    # Method C: Custom HTML Scraper
    try:
        logger.info(f"Method C: Fetching transcript for {video_id} using custom HTML timedtext parser")
        return _extract_via_custom_html_scraper(video_id)
    except Exception as e_c:
        logger.error(f"Method C failed: {e_c}")
        
    # All methods failed
    raise Exception(
        "YouTube blocked automated transcript requests. To analyze this video, you can open it on YouTube, click 'Show Transcript', and copy-paste the text directly into the document uploader."
    )
