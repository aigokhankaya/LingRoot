const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/common/logger.js');

/**
 * Kullanıcıdan gelen senkronizasyon feedback'ini loglar
 * YES: Senkronizasyon doğru
 * NO: Senkronizasyon yanlış
 */
exports.logSyncFeedback = async (req, res) => {
  try {
    const feedback = req.body;
    const logDir = path.join(__dirname, '../logs');
    const logFile = path.join(logDir, 'sync-feedback.log');
    
    // Log dizini yoksa oluştur
    await fs.mkdir(logDir, { recursive: true });
    
    // Detaylı analiz
    const currentWordTiming = feedback.wordTimings?.[feedback.currentWordIndex];
    const expectedTime = currentWordTiming?.timeSeconds || 0;
    const timeDiff = feedback.currentTime - expectedTime;
    
    // Log entry oluştur
    const logEntry = {
      timestamp: new Date().toISOString(),
      feedback: feedback.feedback, // YES or NO
      trackId: feedback.trackId,
      
      // Current state
      currentWordIndex: feedback.currentWordIndex,
      currentTime: feedback.currentTime,
      expectedWord: feedback.expectedWord,
      
      // Timing analysis
      analysis: {
        totalWords: feedback.wordTimings?.length || 0,
        expectedTime: expectedTime,
        timeDiff: timeDiff,
        timeDiffMs: Math.round(timeDiff * 1000),
        isAhead: timeDiff > 0, // Ses kelimeden önde mi?
        isBehind: timeDiff < 0, // Ses kelimeden geride mi?
        
        // Önceki ve sonraki kelimeler
        previousWord: feedback.wordTimings?.[feedback.currentWordIndex - 1],
        currentWord: currentWordTiming,
        nextWord: feedback.wordTimings?.[feedback.currentWordIndex + 1],
      },
      
      // Tüm word timings (sorun analizi için)
      wordTimings: feedback.wordTimings,
      
      // Metadata
      userAgent: req.headers['user-agent'],
      ip: req.ip
    };
    
    // Konsola da yazdır
    if (feedback.feedback === 'NO') {
      logger.warn(`❌ SYNC PROBLEM DETECTED - Track: ${feedback.trackId}, Word: ${feedback.expectedWord}, Time Diff: ${Math.round(timeDiff * 1000)}ms`);
    } else {
      logger.info(`✅ SYNC OK - Track: ${feedback.trackId}, Word: ${feedback.expectedWord}`);
    }
    
    // Dosyaya yaz
    await fs.appendFile(
      logFile, 
      JSON.stringify(logEntry, null, 2) + '\n' + '='.repeat(80) + '\n\n'
    );
    
    res.json({ 
      success: true, 
      message: 'Feedback logged successfully',
      analysis: logEntry.analysis 
    });
    
  } catch (error) {
    logger.error(`Error logging sync feedback: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * Sync feedback loglarını analiz eder ve özet döner
 */
exports.analyzeSyncFeedback = async (req, res) => {
  try {
    const logFile = path.join(__dirname, '../logs/sync-feedback.log');
    
    // Log dosyası var mı kontrol et
    try {
      await fs.access(logFile);
    } catch {
      return res.json({
        success: true,
        message: 'No feedback logs found yet',
        stats: { total: 0, yes: 0, no: 0 }
      });
    }
    
    // Log dosyasını oku
    const logContent = await fs.readFile(logFile, 'utf-8');
    const entries = logContent.split('='.repeat(80)).filter(e => e.trim());
    
    const stats = {
      total: entries.length,
      yes: 0,
      no: 0,
      avgTimeDiff: 0,
      problems: []
    };
    
    let totalTimeDiff = 0;
    
    entries.forEach(entry => {
      try {
        const data = JSON.parse(entry.trim());
        if (data.feedback === 'YES') stats.yes++;
        if (data.feedback === 'NO') {
          stats.no++;
          stats.problems.push({
            timestamp: data.timestamp,
            trackId: data.trackId,
            word: data.expectedWord,
            timeDiff: data.analysis.timeDiffMs
          });
        }
        totalTimeDiff += Math.abs(data.analysis.timeDiff || 0);
      } catch (e) {
        // Skip invalid entries
      }
    });
    
    stats.avgTimeDiff = stats.total > 0 ? Math.round((totalTimeDiff / stats.total) * 1000) : 0;
    stats.accuracy = stats.total > 0 ? Math.round((stats.yes / stats.total) * 100) : 0;
    
    res.json({
      success: true,
      stats: stats,
      recentProblems: stats.problems.slice(-10) // Son 10 sorun
    });
    
  } catch (error) {
    logger.error(`Error analyzing sync feedback: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
