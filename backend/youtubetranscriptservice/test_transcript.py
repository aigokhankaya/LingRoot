import asyncio
import sys
import os
import logging
from playwright.async_api import async_playwright
import re

# Configure logging to console
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)

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
            raise Exception("Geçersiz YouTube URL'si")
        
        video_id = video_id_match.group(1)
        logging.info(f"Video ID: {video_id}")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(viewport={"width": 1280, "height": 720})
            page = await context.new_page()
            
            # Doğrudan transkript sayfasına git
            transcript_url = f"https://youtubetotranscript.com/transcript?v={video_id}&current_language_code={language_code}"
            logging.info(f"Transcript URL: {transcript_url}")
            
            await page.goto(transcript_url, wait_until="networkidle", timeout=90000)
            
            # Sayfa başlığını kontrol et
            title = await page.title()
            logging.info(f"Sayfa başlığı: {title}")
            
            # Mevcut URL'yi kontrol et - yönlendirme olmuş olabilir
            current_url = page.url
            logging.info(f"Mevcut URL: {current_url}")
            
            # Transkripti bulma denemelerinden önce sayfanın ekran görüntüsünü al
            await page.screenshot(path="debug_transcript_page_before.png")
            logging.info("İlk ekran görüntüsü kaydedildi: debug_transcript_page_before.png")
            
            # Transkript içeriğini bekle - daha fazla seçici dene
            selectors = [
                '.transcript-text', 
                'div.card-body .card-text',
                'div[class*="transcript"]',
                '#transcript-text',
                '.yt-transcript',
                'pre.transcript',
                'div.transcript',
                'div[id*="transcript"]',
                'div.card-body',  # Daha genel bir seçici
                'main'  # Ana içerik kısmı
            ]
            
            transcript = ""
            for selector in selectors:
                try:
                    logging.info(f"Selector deneniyor: {selector}")
                    element = await page.wait_for_selector(selector, timeout=10000)  # Timeout'u azalttık
                    if element:
                        transcript = await element.inner_text()
                        if transcript and transcript.strip():
                            logging.info(f"Selector başarılı: {selector}")
                            break
                except Exception as selector_error:
                    logging.warning(f"Selector hatası ({selector}): {str(selector_error)}")
            
            # Hala transkript bulunamadıysa detaylı HTML içeriğini kontrol et
            if not transcript.strip():
                logging.warning("Seçiciler başarısız oldu, sayfa içeriğini kontrol ediyorum")
                page_content = await page.content()
                
                # HTML içeriğini dosyaya kaydet
                with open("page_content.html", "w", encoding="utf-8") as f:
                    f.write(page_content)
                logging.info("HTML içeriği page_content.html dosyasına kaydedildi")
                
                # Şimdi manuel olarak içeriği kontrol et - görünür metin içeriğini al
                body_text = await page.evaluate('() => document.body.innerText')
                
                # Metin içeriği bir dosyaya kaydet
                with open("body_text.txt", "w", encoding="utf-8") as f:
                    f.write(body_text)
                logging.info("Sayfa metni body_text.txt dosyasına kaydedildi")
                
                # Sayfanın ekran görüntüsünü al (debug için)
                await page.screenshot(path="debug_transcript_page_after.png")
                logging.info("Son ekran görüntüsü kaydedildi: debug_transcript_page_after.png")
                
                # İçerik yoksa language_code="tr" ile tekrar dene
                if language_code != "tr":
                    logging.info("İngilizce transkript bulunamadı, Türkçe transkripti deniyorum...")
                    return await get_transcript_from_yttranscript_com(video_url, "tr")
                
                # Hala transkript bulunamadıysa ve bu ikinci deneme ise
                # Sayfadaki herhangi bir metin içeriğini döndürmeyi dene
                if body_text and len(body_text) > 100:  # En azından biraz metin varsa
                    logging.info("Transkript bulunamadı ancak sayfa içeriği var, bunu kullanıyorum")
                    
                    # Gereksiz bölümleri kaldır (başlıklar, menüler vb.)
                    lines = body_text.split('\n')
                    filtered_lines = []
                    in_transcript = False
                    
                    for line in lines:
                        # Transkript bölümüne geldiğimizi tespit etmeye çalış
                        if "transcript" in line.lower() or "transkript" in line.lower():
                            in_transcript = True
                            continue
                            
                        if in_transcript and line.strip() and len(line) > 10:
                            filtered_lines.append(line)
                    
                    if filtered_lines:
                        processed_text = '\n'.join(filtered_lines)
                        return processed_text
                
                await browser.close()
                raise Exception("Transkript bulunamadı, seçiciler eşleşmedi ve sayfa içeriği yetersiz")
            
            await browser.close()
            return transcript.strip()
    except Exception as e:
        logging.error(f"Transcript çekme hatası: {str(e)}")
        raise Exception(f"Transcript çekilemedi: {str(e)}")

async def test_transcript():
    video_url = "https://www.youtube.com/watch?v=auXXdzlKbOY"
    try:
        print(f"Transcript çekmeye başlanıyor: {video_url}")
        transcript = await get_transcript_from_yttranscript_com(video_url, "en")
        print("\n=== TRANSCRIPT ===\n")
        print(transcript)
        print("\n=== TRANSCRIPT SONU ===\n")
        print(f"Toplam karakter: {len(transcript)}")
        return True
    except Exception as e:
        print(f"Hata: {str(e)}")
        return False

if __name__ == "__main__":
    print("Transcript test betiği başlatılıyor...")
    result = asyncio.run(test_transcript())
    print(f"Test sonucu: {'BAŞARILI' if result else 'BAŞARISIZ'}") 