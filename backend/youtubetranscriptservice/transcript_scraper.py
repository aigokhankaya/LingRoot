from playwright.async_api import async_playwright
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='backend/logs/transcript_scraper.log'
)

async def get_transcript_from_yttranscript_com(video_url: str) -> str:
    """
    youtubetotranscript.com sitesinden Playwright ile transcript çeker (async)
    Args:
        video_url (str): YouTube video URL
    Returns:
        str: Transcript metni
    """
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()
            await page.goto("https://youtubetotranscript.com/")
            await page.fill('input[name="youtube-url"]', video_url)
            await page.click('button[type="submit"]')
            await page.wait_for_selector('.transcript-text', timeout=60000)
            transcript = await page.inner_text('.transcript-text')
            await browser.close()
            return transcript
    except Exception as e:
        logging.error(f"Transcript çekme hatası: {str(e)}")
        raise Exception(f"Transcript çekilemedi: {str(e)}")

if __name__ == "__main__":
    # Test the function
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    try:
        transcript = get_transcript_from_yttranscript_com(test_url)
        print("Transcript:", transcript)
    except Exception as e:
        print("Error:", str(e)) 