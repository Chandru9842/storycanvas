import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: process.env.PORT || 3001,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  imageProvider: process.env.IMAGE_PROVIDER || 'pollinations',
  hfToken: process.env.HF_TOKEN || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  ttsProvider: process.env.TTS_PROVIDER || 'gemini_tts',
};
