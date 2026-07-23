import axios from 'axios';
import fs from 'fs';
import path from 'path';

/**
 * Extracts Google Drive File ID from various link formats
 */
export function extractDriveFileId(url) {
  if (!url) return null;
  
  // Format: https://drive.google.com/file/d/FILE_ID/view...
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // Format: https://drive.google.com/open?id=FILE_ID or uc?id=FILE_ID
  const matchQueryId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchQueryId && matchQueryId[1]) return matchQueryId[1];

  // Raw ID passed directly
  if (/^[a-zA-Z0-9_-]{25,}$/.test(url.trim())) {
    return url.trim();
  }

  return null;
}

/**
 * Downloads audio file from public Google Drive link to a local file
 */
export async function downloadFromDrive(driveUrl, destPath) {
  const fileId = extractDriveFileId(driveUrl);
  if (!fileId) {
    throw new Error('Invalid Google Drive URL or File ID format.');
  }

  // Direct download link format for public/shared files
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  try {
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve({ filePath: destPath, fileId }));
      writer.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });
  } catch (error) {
    fs.unlink(destPath, () => {});
    throw new Error(`Failed to download audio from Google Drive: ${error.message}. Please ensure link sharing is set to 'Anyone with the link'.`);
  }
}
