from playwright.sync_api import sync_playwright

def get_transcript_from_yttranscript_com(video_url: str) -> str:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://youtubetotranscript.com/", timeout=60000)

        # Linki input alanına yaz
        page.fill("input[name='videoURL']", video_url)
        page.click("button:has-text('Go')")

        # Transcript yüklenmesini bekle
        page.wait_for_selector("#transcript-container", timeout=30000)

        # Transcript'i al
        transcript = page.inner_text("#transcript-container")
        browser.close()
        return transcript.strip() 