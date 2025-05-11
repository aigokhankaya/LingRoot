from playwright.sync_api import sync_playwright
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='backend/logs/transcript_scraper.log'
)

def get_transcript_from_yttranscript_com(video_url: str) -> str:
    """
    Extract transcript from youtubetotranscript.com using Playwright
    
    Args:
        video_url (str): YouTube video URL
        
    Returns:
        str: Extracted transcript text
    """
    try:
        with sync_playwright() as p:
            # Launch browser
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()
            
            # Navigate to the website
            logging.info(f"Navigating to youtubetotranscript.com")
            page.goto("https://youtubetotranscript.com/", timeout=60000)
            
            # Fill in the video URL
            logging.info(f"Entering video URL: {video_url}")
            page.fill("input[name='videoURL']", video_url)
            
            # Click the submit button
            logging.info("Clicking submit button")
            page.click("button:has-text('Go')")
            
            # Wait for transcript to load
            logging.info("Waiting for transcript to load")
            page.wait_for_selector("#transcript-container", timeout=30000)
            
            # Get the transcript text
            logging.info("Extracting transcript text")
            transcript = page.inner_text("#transcript-container")
            
            # Close browser
            browser.close()
            
            logging.info("Successfully extracted transcript")
            return transcript.strip()
            
    except Exception as e:
        logging.error(f"Error extracting transcript: {str(e)}")
        raise Exception(f"Failed to extract transcript: {str(e)}")

if __name__ == "__main__":
    # Test the function
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    try:
        transcript = get_transcript_from_yttranscript_com(test_url)
        print("Transcript:", transcript)
    except Exception as e:
        print("Error:", str(e)) 