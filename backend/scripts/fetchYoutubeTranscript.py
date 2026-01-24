#!/usr/bin/env python3
"""
YouTube Transcript Fetcher Script
Called from Node.js backend via child_process
"""

import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

def extract_video_id(url):
    """Extract video ID from YouTube URL"""
    import re
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})',
        r'^([a-zA-Z0-9_-]{11})$'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def fetch_transcript(video_id, language='en'):
    """Fetch transcript for a video"""
    try:
        api = YouTubeTranscriptApi()
        
        # Try with preferred language first
        try:
            transcript = api.fetch(video_id, languages=[language])
        except:
            # Fallback to any available language
            transcript = api.fetch(video_id)
        
        # Combine all segments
        full_text = ' '.join([s.text for s in transcript.snippets])
        
        # Clean up
        full_text = ' '.join(full_text.split())  # Normalize whitespace
        
        return {
            'success': True,
            'text': full_text,
            'metadata': {
                'videoId': video_id,
                'segmentCount': len(transcript.snippets),
                'charCount': len(full_text),
                'language': language
            }
        }
    except Exception as e:
        error_msg = str(e)
        if 'disabled' in error_msg.lower():
            return {'success': False, 'error': 'TRANSCRIPT_DISABLED', 'message': 'Bu video için altyazılar devre dışı'}
        elif 'no transcript' in error_msg.lower() or 'not found' in error_msg.lower():
            return {'success': False, 'error': 'NO_SUBTITLES', 'message': 'Bu videoda altyazı bulunmamaktadır'}
        else:
            return {'success': False, 'error': 'FETCH_ERROR', 'message': error_msg}

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'MISSING_URL', 'message': 'URL gerekli'}))
        sys.exit(1)
    
    url = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else 'en'
    
    video_id = extract_video_id(url)
    if not video_id:
        print(json.dumps({'success': False, 'error': 'INVALID_URL', 'message': 'Geçersiz YouTube URL'}))
        sys.exit(1)
    
    result = fetch_transcript(video_id, language)
    print(json.dumps(result, ensure_ascii=False))
