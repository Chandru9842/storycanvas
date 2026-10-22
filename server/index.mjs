import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect Vercel serverless environment
const isVercel = Boolean(process.env.VERCEL);

// Ensure generated storage directories exist (use /tmp in serverless environments)
const generatedAudioDir = isVercel
  ? path.resolve('/tmp/generated/audio')
  : path.resolve(__dirname, '../public/generated/audio');
const generatedImagesDir = isVercel
  ? path.resolve('/tmp/generated/images')
  : path.resolve(__dirname, '../public/generated/images');

try {
  if (!fs.existsSync(generatedAudioDir)) {
    fs.mkdirSync(generatedAudioDir, { recursive: true });
  }
  if (!fs.existsSync(generatedImagesDir)) {
    fs.mkdirSync(generatedImagesDir, { recursive: true });
  }
} catch (dirErr) {
  console.warn('Storage directory initialization notice:', dirErr.message);
}

const app = express();

// Middleware: CORS & large payload limit for multi-image base64 payloads (up to 40MB)
app.use(cors());
app.use(express.json({ limit: '40mb' }));

// Serve generated assets statically as fallback for direct Express access
app.use('/generated', express.static(path.resolve(__dirname, '../public/generated')));

/**
 * Helper: Create standard 44-byte RIFF WAVE header for 16-bit PCM audio
 */
function createWavHeader(dataLength, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22); // NumChannels (1 for mono)
  header.writeUInt32LE(sampleRate, 24); // SampleRate
  header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // ByteRate
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34); // BitsPerSample
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40); // Subchunk2Size
  return header;
}

/**
 * Helper: Format seconds to mm:ss timestamp string
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Helper: Decode the exact audio duration in seconds from WAV (RIFF) or MP3 frames.
 * Does not guess or estimate from word counts or arbitrary byte rates.
 */
function getAudioBufferDurationSec(buf) {
  if (!buf || buf.length < 4) return 0;

  // Check if it's a WAV file (starts with 'RIFF')
  if (buf.slice(0, 4).toString() === 'RIFF') {
    if (buf.length < 44) return 0;
    const numChannels = buf.readUInt16LE(22);
    const sampleRate = buf.readUInt32LE(24);
    const bitsPerSample = buf.readUInt16LE(34);
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);

    // Locate 'data' subchunk
    let dataOffset = 12;
    let dataLength = 0;
    while (dataOffset + 8 <= buf.length) {
      const chunkId = buf.slice(dataOffset, dataOffset + 4).toString();
      const chunkSize = buf.readUInt32LE(dataOffset + 4);
      if (chunkId === 'data') {
        dataLength = chunkSize;
        break;
      }
      dataOffset += 8 + chunkSize;
    }

    if (byteRate > 0 && dataLength > 0) {
      return dataLength / byteRate;
    }
    if (byteRate > 0) {
      return Math.max(0, (buf.length - 44) / byteRate);
    }
  }

  // Parse standard MPEG Layer III audio frames (supports MPEG 1, MPEG 2, MPEG 2.5)
  const bitratesV2L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
  const bitratesV1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
  const sampleRatesV1 = [44100, 48000, 32000];
  const sampleRatesV2 = [22050, 24000, 16000];
  const sampleRatesV25 = [11025, 12000, 8000];

  let offset = 0;

  // Skip ID3v2 tag if present
  if (buf.length >= 10 && buf.slice(0, 3).toString() === 'ID3') {
    const id3Size =
      ((buf[6] & 0x7f) << 21) |
      ((buf[7] & 0x7f) << 14) |
      ((buf[8] & 0x7f) << 7) |
      (buf[9] & 0x7f);
    offset = 10 + id3Size;
  }

  let totalSamples = 0;
  let detectedSampleRate = 0;

  while (offset + 4 <= buf.length) {
    if (buf[offset] === 0xff && (buf[offset + 1] & 0xe0) === 0xe0) {
      const b1 = buf[offset + 1];
      const b2 = buf[offset + 2];

      const versionBits = (b1 >> 3) & 3; // 00=2.5, 01=reserved, 10=2, 11=1
      const layerBits = (b1 >> 1) & 3;   // 01=Layer III
      if (versionBits === 1 || layerBits === 0) {
        offset++;
        continue;
      }

      const bitrateIdx = (b2 >> 4) & 15;
      const srIdx = (b2 >> 2) & 3;
      const padding = (b2 >> 1) & 1;

      let sr = 0;
      if (versionBits === 3) sr = sampleRatesV1[srIdx];
      else if (versionBits === 2) sr = sampleRatesV2[srIdx];
      else if (versionBits === 0) sr = sampleRatesV25[srIdx];

      let br = 0;
      if (versionBits === 3) br = bitratesV1L3[bitrateIdx];
      else br = bitratesV2L3[bitrateIdx];

      if (sr && br) {
        detectedSampleRate = sr;
        const samplesPerFrame = versionBits === 3 ? 1152 : 576;
        const frameSize = Math.floor((samplesPerFrame / 8 * br * 1000) / sr) + padding;
        if (frameSize <= 0) {
          offset++;
          continue;
        }
        totalSamples += samplesPerFrame;
        offset += frameSize;
        continue;
      }
    }
    offset++;
  }

  if (detectedSampleRate > 0 && totalSamples > 0) {
    return totalSamples / detectedSampleRate;
  }

  return 0;
}

/**
 * Health check endpoint (never exposes secret key values)
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    configured: {
      hasGeminiKey: Boolean(config.geminiApiKey && config.geminiApiKey.length > 10),
      imageProvider: config.imageProvider,
      ttsProvider: config.ttsProvider,
    },
  });
});

/**
 * Helper: Call Gemini API with retry and model fallback for demand spikes
 */
async function callGemini(preferredModel, payload) {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env. Please set a valid key.');
  }

  // Model cascade: try preferred model first, then fallback to other active flash models
  const candidateModels = preferredModel.includes('tts')
    ? [preferredModel, 'gemini-3.8-flash-tts']
    : [preferredModel, 'gemini-3.7-flash', 'gemini-flash-latest'];

  let lastError = null;

  for (const model of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMsg = data.error?.message || `HTTP ${response.status}: ${response.statusText}`;
          // If 503 or 429 demand spike, retry or switch model
          if (response.status === 503 || response.status === 429) {
            throw new Error(`Demand spike (${response.status}): ${errorMsg}`);
          }
          throw new Error(errorMsg);
        }

        return data;
      } catch (err) {
        lastError = err;
        // Wait 1.5s before next attempt
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  throw lastError;
}

/**
 * Step 1: Multi-Image Grounded Story Generation Endpoint
 * Accepts: { images: Array<{ imageBase64, mimeType, name, order }>, genre, artStyle, narrator, generateAdditionalScenes }
 * Analyzes all uploaded images in user sequence and auto-detects genre if requested.
 */
app.post('/api/generate-story', async (req, res) => {
  try {
    const {
      images = [],
      imageBase64,
      mimeType = 'image/jpeg',
      genre = 'auto',
      artStyle = 'Classical Chiaroscuro Oil',
      narrator = 'Eleanor Vance',
      generateAdditionalScenes = false,
    } = req.body;

    // Normalize images: accept new multi-image array or legacy single imageBase64
    let rawImages = Array.isArray(images) && images.length > 0
      ? [...images]
      : (imageBase64 ? [{ imageBase64, mimeType, name: 'Seed Artwork', order: 0 }] : []);

    // Sort by user's intended order
    rawImages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (rawImages.length === 0) {
      return res.status(400).json({ error: 'Please upload at least one image.' });
    }

    // Limit to max 5 images
    if (rawImages.length > 5) {
      rawImages = rawImages.slice(0, 5);
    }

    const N = rawImages.length;
    const isAutoGenre = !genre || genre === 'auto' || genre === 'all';

    const promptText = `
You are the master literary storyteller and artistic curator of StoryCanvas, an editorial salon for illustrated narratives and spoken literature.

PRIMARY DIRECTIVE: THE USER HAS UPLOADED EXACTLY ${N} SEQUENTIAL IMAGES.
Every single uploaded image (${N} total) must be an active visual anchor for its corresponding scene. The user's order reflects their intended story progression.

VISUAL GROUNDING DIRECTIVE:
Examine all ${N} images carefully:
- Identify visible subjects, clothing, postures, facial expressions, and physical actions in each image.
- Identify the physical environment, setting, specific objects, tools, screens, and lighting in each image.
- Ground the story firmly in what is visible. If images show disparate subjects, create an imaginative, plausible connecting narrative (e.g. an investigative pursuit, a memory, a journey, a shared chronicle, or unexpected consequence) without claiming that unseen elements are physically present in the scenes.
- Scene 1 MUST directly begin with the exact subject and setting of Image 1.
- Scene 2 MUST depict the transition or development shown in Image 2.
${N >= 3 ? `- Subsequent scenes MUST progressively connect through Image 3${N >= 4 ? ', Image 4' : ''}${N >= 5 ? ', Image 5' : ''}.` : ''}

${isAutoGenre ? `
AUTOMATIC GENRE SELECTION:
The user selected 'Auto-detect from Images'.
Analyze the collective visual content, tone, atmosphere, setting, and mood across all ${N} images.
Determine the most fitting literary genre from:
- 'mystery' (e.g. corporate thrillers, enigmatic findings, nocturnal investigations, cryptic artifacts)
- 'scifi' (e.g. speculative technology, futuristic cities, anomalous data, astral exploration)
- 'folklore' (e.g. nature, enchanted animals, ancient forests, rustic cottages, mythic spirits)
- 'victorian' (e.g. 19th-century architecture, classical scholars, stone parapets, period attire)
- 'mythology' (e.g. cosmic observatories, celestial realms, divine heralds)
Set "genre" to one of ('mystery', 'scifi', 'folklore', 'victorian', 'mythology').
Set "genreLabel" to an evocative editorial genre title (e.g. "Gothic Mystery", "Solarpunk Sci-Fi", "Dark Folklore", "Victorian Atelier", "Mythic Cosmos", or another poetic title fitting the mood).
Do NOT arbitrarily force Mythic Cosmos or any unrelated genre. Let the imagery dictate the genre!
` : `
SELECTED GENRE:
The user explicitly selected the genre '${genre}'.
Let this genre tint the mood, stakes, thematic tension, and prose style, but always prioritize the physical reality visible in the images.
`}

ARTISTIC MOVEMENT: "${artStyle}"
SPOKEN NARRATOR: "${narrator}"

STORY STRUCTURE REQUIREMENTS:
Provide a captivating, coherent literary chronicle with EXACTLY ${generateAdditionalScenes ? N + 1 : N} chapters:
${rawImages.map((img, i) => `- Chapter ${i + 1}: Visually anchored directly to Image ${i + 1} ("${img.name || 'Image ' + (i + 1)}").`).join('\n')}
${generateAdditionalScenes ? `- Chapter ${N + 1}: A newly imagined concluding scene maintaining visual continuity with the protagonist, setting, and ${artStyle} art style.` : ''}

Each chapter must contain:
- "title": Evocative chapter title (e.g., "I. The Obsidian Horizon")
- "imageIndex": The 0-based index of the corresponding uploaded image (0 to ${N - 1})${generateAdditionalScenes ? `, or -1 for the concluding scene` : ''}
- "content": An array of 2 rich, sensory paragraphs with deep emotional resonance and evocative literary prose
- "imageCaption": A short, elegant editorial caption for this scene in quotes
- "scenePrompt": A detailed descriptive prompt for this scene in the style of ${artStyle} to preserve continuity.

Return ONLY a valid raw JSON object strictly conforming to this structure:
{
  "visualGrounding": [
    ${rawImages.map((_, i) => `{"imageIndex": ${i}, "subjects": "Visible subjects and actions in Image ${i + 1}", "setting": "Environment and objects in Image ${i + 1}", "mood": "Lighting and atmosphere"}`).join(',\n    ')}
  ],
  "title": "Evocative editorial book title",
  "subtitle": "Poetic one-line subtitle",
  "synopsis": "Atmospheric 2-sentence synopsis capturing the emotional heart of the chronicle.",
  "author": "Evocative pen name (e.g., Julian Vane, Clara Finch, Rowan Voss)",
  "narrator": "${narrator}",
  "genre": "${isAutoGenre ? 'inferred_genre_id' : genre}",
  "genreLabel": "${isAutoGenre ? 'Inferred Genre Label' : genre.charAt(0).toUpperCase() + genre.slice(1)}",
  "artStyle": "${artStyle}",
  "tags": ["3 to 5 poetic atmospheric tags"],
  "chapters": [
    {
      "id": "chap-1",
      "title": "I. Title",
      "imageIndex": 0,
      "content": [
        "First literary paragraph...",
        "Second literary paragraph..."
      ],
      "scenePrompt": "Detailed prompt describing Image 1...",
      "imageCaption": "Short editorial caption in quotes."
    }
  ]
}
`;

    // Construct multi-image Gemini Vision payload
    const parts = [{ text: promptText }];
    rawImages.forEach((img, idx) => {
      const cleanB64 = img.imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      parts.push({
        text: `\n=== SEED IMAGE ${idx + 1} of ${N} (Scene ${idx + 1} Anchor: "${img.name || 'Image ' + (idx + 1)}") ===\n`,
      });
      parts.push({
        inline_data: {
          mime_type: img.mimeType || 'image/jpeg',
          data: cleanB64,
        },
      });
    });

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.8,
        maxOutputTokens: 4096,
      },
    };

    const result = await callGemini('gemini-3.5-flash', payload);
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Gemini API did not return story content. Please retry.');
    }

    // Clean accidental markdown wraps
    const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const storyData = JSON.parse(cleanedJson);

    // Assign story metadata & cover image from Image 1
    const storyId = 'gen-' + Date.now();
    storyData.id = storyId;
    const firstImg = rawImages[0];
    storyData.coverImage = firstImg.imageBase64.startsWith('data:')
      ? firstImg.imageBase64
      : `data:${firstImg.mimeType || 'image/jpeg'};base64,${firstImg.imageBase64}`;
    storyData.rating = 4.95;
    storyData.reviewCount = 1;
    storyData.isPlayable = true;

    // Normalize and validate genre for clean app filtering
    const validGenres = ['mystery', 'scifi', 'folklore', 'victorian', 'mythology'];
    const rawGenre = String(storyData.genre || '').toLowerCase();
    if (!validGenres.includes(rawGenre)) {
      if (rawGenre.includes('sci') || rawGenre.includes('tech') || rawGenre.includes('space') || rawGenre.includes('solar')) {
        storyData.genre = 'scifi';
      } else if (rawGenre.includes('folk') || rawGenre.includes('fair') || rawGenre.includes('nature') || rawGenre.includes('forest')) {
        storyData.genre = 'folklore';
      } else if (rawGenre.includes('victor') || rawGenre.includes('steamp') || rawGenre.includes('period') || rawGenre.includes('atelier')) {
        storyData.genre = 'victorian';
      } else if (rawGenre.includes('myth') || rawGenre.includes('god') || rawGenre.includes('cosm') || rawGenre.includes('divine')) {
        storyData.genre = 'mythology';
      } else {
        storyData.genre = 'mystery';
      }
    }
    if (!storyData.genreLabel) {
      const labels = {
        mystery: 'Gothic Mystery',
        scifi: 'Solarpunk Sci-Fi',
        folklore: 'Dark Folklore',
        victorian: 'Victorian Atelier',
        mythology: 'Mythic Cosmos',
      };
      storyData.genreLabel = labels[storyData.genre] || 'Original Narrative';
    }

    // Calculate initial estimated scene times and attach uploaded images directly
    let accumulatedSec = 0;
    storyData.chapters = (storyData.chapters || []).map((ch, idx) => {
      const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
      const num = romanNumerals[idx] || `${idx + 1}`;
      const titleWithNum = ch.title.startsWith(num + '.')
        ? ch.title
        : `${num}. ${ch.title.replace(/^[IVXLC0-9]+\.\s*/, '')}`;

      const mins = Math.floor(accumulatedSec / 60);
      const secs = accumulatedSec % 60;
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      const chapterSec = accumulatedSec;
      accumulatedSec += 40;

      // Match corresponding uploaded image by imageIndex or fallback to idx
      const imgIdx = typeof ch.imageIndex === 'number' && ch.imageIndex >= 0
        ? ch.imageIndex
        : (idx < rawImages.length ? idx : -1);

      let sceneImg = null;
      if (imgIdx >= 0 && imgIdx < rawImages.length) {
        const matched = rawImages[imgIdx];
        sceneImg = matched.imageBase64.startsWith('data:')
          ? matched.imageBase64
          : `data:${matched.mimeType || 'image/jpeg'};base64,${matched.imageBase64}`;
      }

      return {
        id: `chap-${idx + 1}`,
        title: titleWithNum,
        time: timeStr,
        timeSec: chapterSec,
        content: Array.isArray(ch.content) ? ch.content : [ch.content],
        scenePrompt: ch.scenePrompt,
        imageCaption: ch.imageCaption || `Scene ${idx + 1} illustration`,
        artMovement: artStyle,
        imageIndex: imgIdx,
        sceneImage: sceneImg, // Direct image reference for scenes 0..N-1
      };
    });

    const totalMins = Math.ceil(accumulatedSec / 60);
    storyData.duration = `${totalMins} min listen`;
    storyData.durationSec = accumulatedSec;

    res.json({ success: true, story: storyData });
  } catch (error) {
    console.error('Story generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate story with Gemini.',
      details: error.stack,
    });
  }
});

/**
 * Step 2: Scene Illustrations Endpoint
 * Preserves existing uploaded images and only synthesizes artwork for unanchored additional scenes.
 */
app.post('/api/generate-images', async (req, res) => {
  try {
    const {
      storyId = 'story-' + Date.now(),
      chapters,
      artStyle = 'Classical Chiaroscuro Oil',
      seedCoverImage,
    } = req.body;

    if (!Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ error: 'Invalid or missing chapters list.' });
    }

    const provider = config.imageProvider;
    const baseSeed = Math.floor(Math.random() * 100000);

    const updatedChapters = await Promise.all(
      chapters.map(async (chapter, index) => {
        // If chapter already has its uploaded image attached, preserve it!
        if (chapter.sceneImage) {
          return chapter;
        }

        // Scenes 2-4: Generate genuinely distinct illustrations
        try {
          if (provider === 'pollinations') {
            const prompt = `${chapter.scenePrompt || chapter.title}, painted in ${artStyle} art style, masterpiece, cinematic lighting, editorial storytelling, 8k resolution, oil on canvas texture`;
            const encodedPrompt = encodeURIComponent(prompt.slice(0, 380));
            const remoteUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true&seed=${baseSeed + index * 137}&enhance=true`;

            // Download on server to verify it's a real image and cache locally
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 12000);
              const imgRes = await fetch(remoteUrl, { signal: controller.signal });
              clearTimeout(timeoutId);

              const contentType = imgRes.headers.get('content-type') || '';
              if (imgRes.ok && contentType.startsWith('image/')) {
                const filename = `${storyId}-scene-${index + 1}.jpg`;
                if (!isVercel) {
                  try {
                    const arrayBuf = await imgRes.arrayBuffer();
                    const localPath = path.join(generatedImagesDir, filename);
                    fs.writeFileSync(localPath, Buffer.from(arrayBuf));
                  } catch (writeErr) {
                    console.warn('Could not write image to disk:', writeErr.message);
                  }
                }
                return {
                  ...chapter,
                  sceneImage: isVercel ? remoteUrl : `/generated/images/${filename}`,
                };
              } else {
                console.warn(
                  `Scene ${index + 1} artwork provider returned non-image status ${imgRes.status}. Activating honest fallback.`
                );
                return {
                  ...chapter,
                  sceneImage: null,
                  imageGenerationFailed: true,
                };
              }
            } catch (fetchErr) {
              console.warn(
                `Scene ${index + 1} artwork generation fetch error:`,
                fetchErr.message
              );
              return {
                ...chapter,
                sceneImage: null,
                imageGenerationFailed: true,
              };
            }
          } else if (provider === 'openai' && config.openaiApiKey) {
            // OpenAI DALL-E adapter
            const response = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.openaiApiKey}`,
              },
              body: JSON.stringify({
                model: 'dall-e-3',
                prompt: `${chapter.scenePrompt}, in the style of ${artStyle}`,
                n: 1,
                size: '1024x1024',
              }),
            });
            const data = await response.json();
            const imageUrl = data.data?.[0]?.url;
            if (imageUrl) {
              return { ...chapter, sceneImage: imageUrl };
            }
            throw new Error(data.error?.message || 'OpenAI image generation failed');
          } else {
            // Unconfigured provider fallback
            return {
              ...chapter,
              sceneImage: null,
              imageGenerationFailed: true,
            };
          }
        } catch (err) {
          console.error(`Failed to generate image for chapter ${index + 1}:`, err);
          return {
            ...chapter,
            sceneImage: null,
            imageGenerationFailed: true,
          };
        }
      })
    );

    res.json({ success: true, chapters: updatedChapters });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error.message || 'Image generation failed.' });
  }
});

/**
 * Helper: Split text into natural, zero-truncation chunks <= maxLen characters
 * respects sentence and clause boundaries for smooth speech synthesis.
 */
function chunkTextForTTS(text, maxLen = 175) {
  const chunks = [];
  if (!text || typeof text !== 'string') return chunks;

  // Split into sentences including trailing quotes
  const rawSentences = text.match(/[^.!?]+(?:[.!?]+["'”’]?|$)/g) || [text];

  for (const raw of rawSentences) {
    const s = raw.trim();
    if (!s || s === '"' || s === "'") continue;

    if (s.length <= maxLen) {
      chunks.push(s);
      continue;
    }

    // Sentence is longer than maxLen, split on clause boundaries (, ; : — -)
    const clauses = s.split(/(?<=[,;:—])\s+/);
    let currentClause = '';

    for (const c of clauses) {
      const trimmedC = c.trim();
      if (!trimmedC) continue;

      if ((currentClause + ' ' + trimmedC).trim().length <= maxLen) {
        currentClause = (currentClause + ' ' + trimmedC).trim();
      } else {
        if (currentClause) {
          chunks.push(currentClause);
          currentClause = '';
        }

        if (trimmedC.length <= maxLen) {
          currentClause = trimmedC;
        } else {
          // Clause itself is longer than maxLen, split by words
          const words = trimmedC.split(/\s+/);
          let wordChunk = '';
          for (const w of words) {
            if ((wordChunk + ' ' + w).trim().length <= maxLen) {
              wordChunk = (wordChunk + ' ' + w).trim();
            } else {
              if (wordChunk) chunks.push(wordChunk);
              wordChunk = w;
            }
          }
          if (wordChunk) currentClause = wordChunk;
        }
      }
    }
    if (currentClause) chunks.push(currentClause);
  }

  return chunks;
}

/**
 * Step 3: Narration Audio Endpoint with Accurate Scene Synchronization
 * Synthesizes spoken narration for each scene and calculates exact timestamps.
 */
app.post('/api/generate-speech', async (req, res) => {
  try {
    const { storyId = 'story-' + Date.now(), title, synopsis = '', chapters, narrator, isNote = false } = req.body;

    if (!Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ error: 'No chapters provided for narration.' });
    }

    // Build scene-specific narration scripts containing the exact displayed story prose
    // Without prepending synthetic metadata or UI labels so the spoken audio matches displayed text
    const sceneScripts = chapters.map((chap) => {
      const contentText = Array.isArray(chap.content) ? chap.content.join(' ') : (chap.content || '');
      return contentText.trim();
    });

    let pcmBuffers = [];
    let isPerChapterSuccess = false;

    // TIER 1: Primary Gemini 3.8 Flash TTS (Parallel per-chapter calls)
    if (config.geminiApiKey) {
      try {
        const ttsPromises = sceneScripts.map(async (scriptText) => {
          const payload = {
            contents: [{ parts: [{ text: scriptText }] }],
            generationConfig: { responseModalities: ['AUDIO'] },
          };
          const result = await callGemini('gemini-3.8-flash-tts', payload);
          const b64Data = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!b64Data) throw new Error('No audio data returned from Gemini TTS for chapter');
          const fullBuf = Buffer.from(b64Data, 'base64');
          return fullBuf.slice(0, 4).toString() === 'RIFF' ? fullBuf.slice(44) : fullBuf;
        });

        pcmBuffers = await Promise.all(ttsPromises);
        if (pcmBuffers.length === chapters.length && pcmBuffers.every((b) => b && b.length > 1000)) {
          isPerChapterSuccess = true;
        }
      } catch (parallelErr) {
        console.warn(
          'Gemini TTS call failed (quota or network), activating resilient fallback:',
          parallelErr.message
        );
      }
    }

    if (isPerChapterSuccess && pcmBuffers.length === chapters.length) {
      // 0.4s of gentle silence between chapters (24000 * 2 * 0.4 = 19200 bytes)
      const pauseSec = 0.4;
      const silenceBytes = Math.round(24000 * 2 * pauseSec);
      const silenceBuf = Buffer.alloc(silenceBytes % 2 === 0 ? silenceBytes : silenceBytes + 1);

      let currentSec = 0;
      const calibratedChapters = [];
      const stitchedPcmParts = [];

      for (let i = 0; i < chapters.length; i++) {
        const pcm = pcmBuffers[i];
        // 24000Hz 16-bit mono = 48000 bytes/sec
        const sceneDur = pcm.length / 48000;
        const startSec = Math.round(currentSec * 100) / 100;

        calibratedChapters.push({
          ...chapters[i],
          timeSec: startSec,
          time: formatTime(startSec),
        });

        stitchedPcmParts.push(pcm);
        if (i < chapters.length - 1) {
          stitchedPcmParts.push(silenceBuf);
          currentSec += sceneDur + pauseSec;
        } else {
          currentSec += sceneDur;
        }
      }

      const totalPcm = Buffer.concat(stitchedPcmParts);
      const wavHeader = createWavHeader(totalPcm.length, 24000, 1, 16);
      const finalWav = Buffer.concat([wavHeader, totalPcm]);

      const filename = `${storyId}.wav`;
      const localPath = path.join(generatedAudioDir, filename);
      let audioUrl = `/generated/audio/${filename}`;

      try {
        fs.writeFileSync(localPath, finalWav);
      } catch (writeErr) {
        console.warn('Could not write WAV file to disk:', writeErr.message);
      }

      if (isVercel) {
        audioUrl = `data:audio/wav;base64,${finalWav.toString('base64')}`;
      }

      const totalDurSec = Math.round(getAudioBufferDurationSec(finalWav) * 100) / 100;

      // Verify that final chapter timestamp is strictly less than total duration
      const lastChapter = calibratedChapters[calibratedChapters.length - 1];
      if (lastChapter && lastChapter.timeSec >= totalDurSec) {
        throw new Error('Calculated final chapter timestamp exceeds total audio duration');
      }

      return res.json({
        success: true,
        audioUrl,
        duration: `${Math.ceil(totalDurSec / 60)} min listen`,
        durationSec: totalDurSec,
        chapters: calibratedChapters,
      });
    }

    // TIER 2: Secondary Resilient TTS Engine (MP3 synthesis per chapter)
    try {
      console.log('Synthesizing spoken audio via secondary TTS engine for story:', storyId);
      const chapterMp3Buffers = [];

      for (let i = 0; i < chapters.length; i++) {
        const text = sceneScripts[i];
        const chunks = chunkTextForTTS(text, 175);
        const sentenceBuffers = [];

        // Synthesize all text chunks for this scene in order to ensure zero truncation
        for (const chunk of chunks) {
          if (!chunk) continue;
          try {
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(chunk)}`;
            const ttsRes = await fetch(ttsUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
            });
            if (ttsRes.ok) {
              const ab = await ttsRes.arrayBuffer();
              const b = Buffer.from(ab);
              if (b.length > 50) {
                sentenceBuffers.push(b);
              }
            }
          } catch (e) {
            console.warn('Chunk TTS error:', e.message);
          }
        }

        const chapterMp3 = Buffer.concat(sentenceBuffers);
        if (chapterMp3.length < 500) {
          throw new Error(`Narration synthesis failed for chapter ${i + 1}`);
        }
        chapterMp3Buffers.push(chapterMp3);
      }

      if (chapterMp3Buffers.length === chapters.length) {
        // Calculate exact start times and durations for every chapter segment from real MP3 frames
        let currentSec = 0;
        const calibratedChapters = [];

        for (let i = 0; i < chapters.length; i++) {
          const segDur = getAudioBufferDurationSec(chapterMp3Buffers[i]);
          if (segDur <= 0) {
            throw new Error(`Unable to determine audio frame duration for chapter ${i + 1}`);
          }
          const startSec = Math.round(currentSec * 100) / 100;
          calibratedChapters.push({
            ...chapters[i],
            timeSec: startSec,
            time: formatTime(startSec),
          });
          currentSec += segDur;
        }

        const totalMp3 = Buffer.concat(chapterMp3Buffers);
        const totalDurSec = Math.round(getAudioBufferDurationSec(totalMp3) * 100) / 100;

        // Verify that the final chapter timestamp is strictly less than total duration
        const lastChapter = calibratedChapters[calibratedChapters.length - 1];
        if (lastChapter && lastChapter.timeSec >= totalDurSec) {
          throw new Error('Audio duration calculation mismatch: last chapter exceeds audio duration');
        }

        const filename = `${storyId}.mp3`;
        const localPath = path.join(generatedAudioDir, filename);
        let audioUrl = `/generated/audio/${filename}`;

        try {
          fs.writeFileSync(localPath, totalMp3);
        } catch (writeErr) {
          console.warn('Could not write MP3 file to disk:', writeErr.message);
        }

        if (isVercel) {
          audioUrl = `data:audio/mp3;base64,${totalMp3.toString('base64')}`;
        }

        return res.json({
          success: true,
          audioUrl,
          duration: `${Math.ceil(totalDurSec / 60)} min listen`,
          durationSec: totalDurSec,
          chapters: calibratedChapters,
          notice: 'Spoken narration generated with synchronized scene timestamps.',
        });
      }
    } catch (fallbackErr) {
      console.warn('Secondary TTS engine failed:', fallbackErr.message);
    }

    // If both engines fail, return an actionable 502 error instead of silently returning mismatched sample audio!
    return res.status(502).json({
      success: false,
      error: 'Spoken narration generation failed to produce complete audio for all scenes. Please retry.',
    });
  } catch (error) {
    console.error('TTS generation error:', error);
    res.status(500).json({
      error: error.message || 'Speech generation failed.',
    });
  }
});

// Start Express server if running as standalone process
if (!process.env.VERCEL) {
  const PORT = config.port;
  app.listen(PORT, () => {
    console.log(`StoryCanvas AI Server running on http://localhost:${PORT}`);
    console.log(`- Health Check: http://localhost:${PORT}/api/health`);
    console.log(`- Image Provider: ${config.imageProvider}`);
    console.log(`- TTS Provider: ${config.ttsProvider}`);
  });
}

export default app;

