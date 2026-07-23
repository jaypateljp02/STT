import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

function getMimeType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  switch (ext) {
    case 'mp3': return 'audio/mp3';
    case 'wav': return 'audio/wav';
    case 'm4a': return 'audio/m4a';
    case 'aac': return 'audio/aac';
    case 'ogg': return 'audio/ogg';
    case 'flac': return 'audio/flac';
    case 'wma': return 'audio/x-ms-wma';
    case 'webm': return 'audio/webm';
    case 'mp4': return 'video/mp4';
    case 'mov': return 'video/quicktime';
    default: return 'audio/mp3';
  }
}

export async function processAudioWithGemini({ apiKey, filePath, modelName = 'gemini-2.5-flash' }) {
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please click "Settings" to enter your API Key.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const fileManager = new GoogleAIFileManager(apiKey);
  const mimeType = getMimeType(filePath);

  console.log(`[Gemini] Starting audio processing for ${filePath} (${mimeType}) using model ${modelName}`);

  let uploadResult;
  try {
    uploadResult = await fileManager.uploadFile(filePath, {
      mimeType: mimeType,
      displayName: 'Audio_Recording',
    });
  } catch (uploadErr) {
    const errMsg = uploadErr.message || '';
    if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota')) {
      throw new Error('QUOTA_EXHAUSTED: Your Gemini API quota or free credits have been exhausted. Please click Settings to use a new API Key or check Google AI Studio.');
    }
    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('400') || errMsg.includes('key not valid')) {
      throw new Error('INVALID_API_KEY: The Gemini API Key entered is invalid or expired. Please update it in Settings.');
    }
    throw new Error(`Upload Failed: ${uploadErr.message}`);
  }

  // Wait for file state to become ACTIVE
  let fileState = await fileManager.getFile(uploadResult.file.name);
  while (fileState.state === 'PROCESSING') {
    console.log('[Gemini] File is processing on Google servers, waiting 2 seconds...');
    await new Promise(res => setTimeout(res, 2000));
    fileState = await fileManager.getFile(uploadResult.file.name);
  }

  if (fileState.state === 'FAILED') {
    throw new Error('Audio file processing failed on Google Gemini servers.');
  }

  const selectedModel = modelName || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({ model: selectedModel });

  const prompt = `
You are an ultra-precise, verbatim multilingual scribe and audio analyst.
The attached audio file contains spoken speech (e.g. Japanese, English, French, Spanish, German, Hindi, etc.).

CRITICAL FAITHFULNESS MANDATE (ZERO HALLUCINATIONS):
1. Extract and transcribe ONLY information explicitly spoken in the audio.
2. DO NOT fabricate names, topics, dates, or details not present in the audio.
3. If parts of the audio are silent, noisy, or unintelligible, accurately note "[Unclear Audio]" instead of guessing.

YOUR REQUIRED OUTPUTS:
1. "detected_language": Primary spoken language (e.g. Japanese, English).
2. "transcript_original": Full verbatim transcript in the ORIGINAL spoken language script (e.g. Japanese Kanji/Kana script if Japanese).
3. "transcript_english": Full verbatim translation of the transcript into ENGLISH.
4. "summary_english": A concise, strictly factual summary of the audio contents in English.
5. "key_takeaways": Array of key facts explicitly stated in the audio.
6. "action_items": Array of specific decisions or next steps mentioned in the audio (if any, otherwise empty array).

YOU MUST RESPOND ONLY IN VALID JSON MATCHING THIS EXACT SCHEMA:
{
  "detected_language": "Japanese",
  "transcript_original": "Original spoken transcript...",
  "transcript_english": "English translation...",
  "summary_english": "Factual English summary...",
  "key_takeaways": ["Point 1", "Point 2"],
  "action_items": ["Action 1"]
}

DO NOT include markdown codeblocks like \`\`\`json. Output raw JSON string directly.
`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        },
      },
    ]);

    const responseText = result.response.text().trim();

    let cleanJsonStr = responseText;
    if (cleanJsonStr.startsWith('```')) {
      cleanJsonStr = cleanJsonStr.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanJsonStr);
    } catch (parseError) {
      console.warn('[Gemini] JSON parsing fallback applied:', parseError);
      parsed = {
        detected_language: 'Detected Audio',
        transcript_original: 'Transcript extracted from audio.',
        transcript_english: responseText,
        summary_english: responseText,
        key_takeaways: ['Audio processed.'],
        action_items: [],
      };
    }

    try {
      await fileManager.deleteFile(uploadResult.file.name);
    } catch (_) {}

    return parsed;

  } catch (error) {
    try {
      await fileManager.deleteFile(uploadResult.file.name);
    } catch (_) {}

    const msg = error.message || '';
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota')) {
      throw new Error('QUOTA_EXHAUSTED: Your Gemini API quota or free credits have been exhausted. Please click Settings to enter a new API Key.');
    }
    if (msg.includes('API_KEY_INVALID') || msg.includes('400')) {
      throw new Error('INVALID_API_KEY: The Gemini API Key entered is invalid. Please check your key in Settings.');
    }

    throw new Error(`Gemini Multimodal API Error: ${error.message}`);
  }
}
