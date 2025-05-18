import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import os from 'os';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { filename } = req.query;
  
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Dosya adı gerekli' });
  }
  
  try {
    // Güvenlik kontrolü - sadece lingroot_ ile başlayan MP3 dosyalarına izin ver
    if (!filename.startsWith('lingroot_') || !filename.endsWith('.mp3')) {
      return res.status(403).json({ error: 'İzin verilmeyen dosya' });
    }
    
    // Geçici dizinde dosyayı ara
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, filename);
    
    // Dosya var mı kontrol et
    if (!fs.existsSync(filePath)) {
      console.error(`Dosya bulunamadı: ${filePath}`);
      return res.status(404).json({ error: 'Dosya bulunamadı' });
    }
    
    // Dosya içeriğini oku
    const fileContent = fs.readFileSync(filePath);
    
    // Ses dosyası olarak gönder
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', fileContent.length);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.status(200).send(fileContent);
  } catch (error) {
    console.error('Ses dosyası erişim hatası:', error);
    res.status(500).json({ error: 'Ses dosyasına erişilemiyor' });
  }
} 