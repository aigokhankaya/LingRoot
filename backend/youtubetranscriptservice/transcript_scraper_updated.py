from playwright.async_api import async_playwright
import re
import os
import sys
import asyncio
from datetime import datetime

# Script çalıştırma başlangıcı
print("YouTube Transcript Scraper başlatılıyor...")

async def get_transcript_from_yttranscript_com(video_url: str, language_code: str = "en") -> str:
    """
    youtubetotranscript.com sitesinden Playwright ile transcript çeker (async)
    Args:
        video_url (str): YouTube video URL
        language_code (str): Transkript dil kodu (default: "en")
    Returns:
        str: Transcript metni
    """
    try:
        # YouTube URL'sinden video ID'sini çıkar
        video_id_match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", video_url)
        if not video_id_match:
            print("Geçersiz YouTube URL'si")
            return "Geçersiz YouTube URL'si. Lütfen doğru bir URL girin."
        
        video_id = video_id_match.group(1)
        print(f"Video ID: {video_id}")
        
        # Gerçek transcript çekme işlemini aktif et
        try:
            print(f"Playwright ile transcript çekme başlatılıyor: {video_id}")
            
            async with async_playwright() as p:
                print("Browser başlatılıyor...")
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(viewport={"width": 1280, "height": 720})
                page = await context.new_page()
                
                # Doğrudan transkript sayfasına git
                transcript_url = f"https://youtubetotranscript.com/transcript?v={video_id}&current_language_code={language_code}"
                print(f"Şu URL'ye gidiliyor: {transcript_url}")
                
                await page.goto(transcript_url, wait_until="networkidle", timeout=90000)
                
                # Sayfa başlığını kontrol et
                title = await page.title()
                print(f"Sayfa başlığı: {title}")
                
                # Screenshot al
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                screenshot_path = f"screenshot_{video_id}_{timestamp}.png"
                await page.screenshot(path=screenshot_path)
                print(f"Ekran görüntüsü kaydedildi: {screenshot_path}")
                
                # HTML içeriğini kaydet
                html_content = await page.content()
                html_path = f"page_{video_id}_{timestamp}.html"
                with open(html_path, "w", encoding="utf-8") as f:
                    f.write(html_content)
                print(f"HTML içeriği kaydedildi: {html_path}")
                
                # Transkript içeriğini bekle - farklı seçicileri dene
                selectors = [
                    '.transcript-text', 
                    'div.card-body .card-text', 
                    'div[class*="transcript"]',
                    '#transcript-text',
                    '.yt-transcript',
                    '.transcript',
                    '#content-right .card-body',
                    '.card-body p'
                ]
                
                transcript = ""
                for selector in selectors:
                    try:
                        print(f"Seçici deneniyor: {selector}")
                        element = await page.wait_for_selector(selector, timeout=5000)
                        if element:
                            transcript = await element.inner_text()
                            if transcript and transcript.strip():
                                print(f"Transcript bulundu! Seçici: {selector}")
                                print(f"İlk 100 karakter: {transcript[:100]}...")
                                break
                    except Exception as se:
                        print(f"Seçici başarısız: {selector} - {str(se)}")
                
                # Transkript bulunamadıysa, sayfadaki tüm metni al
                if not transcript or not transcript.strip():
                    print("Hiçbir seçici transcript bulamadı, sayfa içeriğini alıyorum")
                    transcript = await page.inner_text('body')
                
                await browser.close()
                return transcript.strip()
        except Exception as crawler_error:
            print(f"Playwright hatası: {str(crawler_error)}")
            
            # Hata durumunda demo transkript döndür
            demo_transcript = f"""
Bu videodan alınan örnek transkript içeriğidir (fallback).
Video ID: {video_id} 
Dil: {language_code}

Gerçek çekme hatası: {str(crawler_error)}

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Proin euismod, nunc in aliquam ultrices, nisi enim aliquam ipsum,
vitae luctus nisl nunc in lectus. Donec auctor, nisl eget aliquam
ultrices, nisi enim aliquam ipsum, vitae luctus nisl nunc in lectus.
"""
            return demo_transcript
    except Exception as e:
        print(f"Genel hata: {str(e)}")
        # Genel hata durumunda demo transkript döndür
        return f"""
HATA: Transcript çekilemedi - {str(e)}
        
Bu bir fallback örnek metindir. Gerçek transkript servisinde bir sorun oluştu.
""" 

# Script doğrudan çalıştırıldığında test için
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Kullanım: python transcript_scraper.py <youtube_url>")
        sys.exit(1)
    
    video_url = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "en"
    
    print(f"Video için transcript alınıyor: {video_url}, dil: {language}")
    
    async def main():
        transcript = await get_transcript_from_yttranscript_com(video_url, language)
        print("\nTranscript:\n" + "="*50)
        print(transcript)
        print("="*50)
    
    asyncio.run(main()) 