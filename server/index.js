import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { query, getOne, run } from './db.js';
import { downloadFromDrive } from './driveHelper.js';
import { processAudioWithGemini } from './geminiHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Determine uploads directory (use /tmp in Vercel serverless environment)
const isVercel = Boolean(process.env.VERCEL);
const uploadsDir = isVercel ? '/tmp' : path.join(__dirname, '..', 'uploads');
if (!isVercel && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.mp3';
    cb(null, 'audio-' + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

// --- SETTINGS ROUTES ---

app.get('/api/settings', async (req, res) => {
  try {
    const apiKeyRow = await getOne(`SELECT value FROM settings WHERE key = 'gemini_api_key'`);
    const modelRow = await getOne(`SELECT value FROM settings WHERE key = 'gemini_model'`);
    
    res.json({
      apiKey: apiKeyRow ? apiKeyRow.value : process.env.GEMINI_API_KEY || '',
      model: modelRow ? modelRow.value : 'gemini-2.5-flash',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve settings: ' + error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { apiKey, model } = req.body;

    await run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('gemini_api_key', ?)`, [apiKey || '']);
    await run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('gemini_model', ?)`, [model || 'gemini-2.5-flash']);

    res.json({ success: true, message: 'Settings saved successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings: ' + error.message });
  }
});

// --- AUDIO STREAM ROUTE FOR BUILT-IN AUDIO PLAYER ---

app.get('/api/audio/:id', async (req, res) => {
  try {
    const record = await getOne(`SELECT audio_file_path FROM records WHERE id = ?`, [req.params.id]);
    if (!record || !record.audio_file_path || !fs.existsSync(record.audio_file_path)) {
      return res.status(404).send('Audio file not available.');
    }

    const filePath = record.audio_file_path;
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mp3',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mp3',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    res.status(500).send('Error streaming audio.');
  }
});

// --- AUDIO PROCESSING ROUTE ---

app.post('/api/process', upload.single('audioFile'), async (req, res) => {
  let targetFilePath = null;
  let originalFilename = '';
  let sourceType = 'local';
  let persistentAudioPath = null;

  try {
    const { title, recordedDate, notes, driveUrl } = req.body;

    const apiKeyRow = await getOne(`SELECT value FROM settings WHERE key = 'gemini_api_key'`);
    const modelRow = await getOne(`SELECT value FROM settings WHERE key = 'gemini_model'`);
    const apiKey = apiKeyRow?.value || process.env.GEMINI_API_KEY;
    const modelName = modelRow?.value || 'gemini-2.5-flash';

    if (!apiKey) {
      return res.status(400).json({
        error: 'Gemini API Key is not configured. Please click "Settings" and enter your API Key.',
      });
    }

    if (driveUrl && driveUrl.trim()) {
      sourceType = 'drive';
      originalFilename = 'Google Drive File';
      targetFilePath = path.join(uploadsDir, `drive-${Date.now()}.mp3`);
      console.log(`[Server] Processing Google Drive Link: ${driveUrl}`);
      await downloadFromDrive(driveUrl.trim(), targetFilePath);
      persistentAudioPath = targetFilePath;
    } else if (req.file) {
      sourceType = 'local';
      originalFilename = req.file.originalname;
      targetFilePath = req.file.path;
      persistentAudioPath = req.file.path;
      console.log(`[Server] Processing Local File: ${req.file.originalname}`);
    } else {
      return res.status(400).json({ error: 'Please upload an audio file or provide a Google Drive link.' });
    }

    // Process with Gemini Multimodal API
    const geminiResult = await processAudioWithGemini({
      apiKey,
      filePath: targetFilePath,
      modelName,
    });

    // Save to Database
    const keyTakeawaysStr = Array.isArray(geminiResult.key_takeaways)
      ? JSON.stringify(geminiResult.key_takeaways)
      : JSON.stringify([geminiResult.key_takeaways || '']);

    const actionItemsStr = Array.isArray(geminiResult.action_items)
      ? JSON.stringify(geminiResult.action_items)
      : JSON.stringify([geminiResult.action_items || '']);

    const dbResult = await run(
      `INSERT INTO records (
        title, recorded_date, notes, source_type, original_filename, drive_url, audio_file_path,
        detected_language, transcript_original, summary_english, transcript_english, key_takeaways, action_items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title || originalFilename || 'Untitled Audio',
        recordedDate || new Date().toISOString().split('T')[0],
        notes || '',
        sourceType,
        originalFilename,
        driveUrl || '',
        persistentAudioPath || '',
        geminiResult.detected_language || 'Auto-Detected',
        geminiResult.transcript_original || '',
        geminiResult.summary_english || '',
        geminiResult.transcript_english || '',
        keyTakeawaysStr,
        actionItemsStr,
      ]
    );

    const newRecord = await getOne(`SELECT * FROM records WHERE id = ?`, [dbResult.lastID]);

    res.json({
      success: true,
      record: {
        ...newRecord,
        key_takeaways: JSON.parse(newRecord.key_takeaways || '[]'),
        action_items: JSON.parse(newRecord.action_items || '[]'),
      },
    });

  } catch (error) {
    console.error('[Server Error]:', error);
    res.status(500).json({ error: error.message || 'An error occurred while processing the audio.' });
  }
});

// --- RECORDS DATABASE ROUTES ---

app.get('/api/records', async (req, res) => {
  try {
    const { search, date } = req.query;
    let sql = `SELECT * FROM records WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ` AND (title LIKE ? OR notes LIKE ? OR summary_english LIKE ? OR transcript_english LIKE ? OR transcript_original LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (date) {
      sql += ` AND recorded_date = ?`;
      params.push(date);
    }

    sql += ` ORDER BY recorded_date DESC, id DESC`;

    const rows = await query(sql, params);
    const parsedRows = rows.map((r) => ({
      ...r,
      key_takeaways: JSON.parse(r.key_takeaways || '[]'),
      action_items: JSON.parse(r.action_items || '[]'),
    }));

    res.json({ records: parsedRows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch records: ' + error.message });
  }
});

app.put('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, notes, recorded_date } = req.body;

    await run(
      `UPDATE records SET title = ?, notes = ?, recorded_date = ? WHERE id = ?`,
      [title, notes, recorded_date, id]
    );

    const updated = await getOne(`SELECT * FROM records WHERE id = ?`, [id]);
    res.json({
      success: true,
      record: {
        ...updated,
        key_takeaways: JSON.parse(updated.key_takeaways || '[]'),
        action_items: JSON.parse(updated.action_items || '[]'),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update record: ' + error.message });
  }
});

app.delete('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const record = await getOne(`SELECT audio_file_path FROM records WHERE id = ?`, [id]);
    if (record?.audio_file_path && fs.existsSync(record.audio_file_path)) {
      fs.unlink(record.audio_file_path, () => {});
    }
    await run(`DELETE FROM records WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete record: ' + error.message });
  }
});

// Serve static frontend in non-Vercel production
const distDir = path.join(__dirname, '..', 'dist');
if (!isVercel && fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distDir, 'index.html'));
    }
  });
}

if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`[Server] Audio Summarizer platform running on http://localhost:${PORT}`);
  });
}

export default app;
