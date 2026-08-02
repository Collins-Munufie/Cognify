import requests
from bs4 import BeautifulSoup
import socket
import ipaddress
from urllib.parse import urlparse

def is_safe_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        
        # Prevent DNS rebinding or direct IP targeting
        # Resolve all IPs for hostname
        ips = socket.getaddrinfo(hostname, None)
        for family, _, _, _, sockaddr in ips:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)
            if ip.is_loopback or ip.is_private or ip.is_link_local:
                return False
        return True
    except Exception:
        return False

def extract_text_from_url(url: str) -> str:
    """Fetches a generic URL and extracts readable text."""
    if not is_safe_url(url):
        raise ValueError("SSRF Protection: Access to this URL is blocked (private/local subnet or invalid schema).")
        
    try:
        # Using a standard browser user-agent to prevent basic 403 blocks
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36"
        }
        res = requests.get(url, headers=headers, timeout=10)
        res.raise_for_status()
        
        soup = BeautifulSoup(res.content, "html.parser")
        
        # Remove script, style, header, footer, and nav tags before extracting text
        for element in soup(["script", "style", "header", "footer", "nav"]):
            element.extract()
            
        text = soup.get_text(separator=' ')
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        return text
    except Exception as e:
        raise Exception(f"Failed to extract text from URL: {str(e)}")
