import re
import logging
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

def extract_transcript(url: str) -> str:
    """Extracts transcript from a YouTube video URL with fallback language and translations."""
    video_id = extract_video_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube URL format. We support standard watch, mobile, Shorts, Live, and Embed links.")
        
    try:
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
                raise ValueError("No captions found for this video. Please enable closed captions on YouTube.")
        
        # 3. If transcript is not in English but is translatable, translate it to English
        if transcript_obj.language_code not in ['en', 'en-US', 'en-GB'] and transcript_obj.is_translatable:
            try:
                transcript_obj = transcript_obj.translate('en')
            except Exception as trans_err:
                logger.warning(f"Translation failed, using original transcript language: {trans_err}")
                
        # 4. Fetch the transcript snippets
        transcript_data = transcript_obj.fetch()
        
        # Construct full transcript text
        transcript_texts = []
        for t in transcript_data:
            if isinstance(t, dict) and 'text' in t:
                transcript_texts.append(t['text'])
            elif hasattr(t, 'text'):
                transcript_texts.append(t.text)
                
        if not transcript_texts:
            raise ValueError("Transcript content is empty.")
            
        return " ".join(transcript_texts)
        
    except Exception as e:
        err_msg = str(e).lower()
        if "blocked" in err_msg or "ip" in err_msg or "too many requests" in err_msg:
            raise Exception("YouTube blocked the automated transcript request from our server. To continue, you can open the video on YouTube, click 'Show Transcript', and copy-paste the text directly into the document uploader.")
        elif "disabled" in err_msg or "no transcript" in err_msg:
            raise Exception("This YouTube video does not have closed captions (subtitles) enabled. Please choose a video with subtitles, or copy-paste the text content directly.")
        else:
            raise Exception(f"Failed to fetch YouTube transcript: {str(e)}")
