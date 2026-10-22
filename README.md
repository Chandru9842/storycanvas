# StoryCanvas 🎨📖

> **Illustrated Literary Narratives & Synchronized Spoken Audio Engine**  
> An immersive, editorial web experience transforming visual art into multi-chapter literary chronicles with bespoke vocal performances and frame-accurate audio chapter navigation.

[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.3-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Chandru9842/storycanvas)

---

## 🌟 Overview

**StoryCanvas** merges classical editorial design with generative AI media synthesis. It invites readers into an intimate, museum-grade salon where literary narratives are accompanied by high-resolution visual plates, synchronized ambient audio, and responsive audio navigation across story scenes.

Whether reading curated masterworks like *The Cartographer of Distant Nebulae* or crafting your own multi-scene chronicles in the **Studio**, StoryCanvas pairs visual pacing with spoken cadence.

---

## ✨ Key Features

### 1. 📖 Dedicated Immersive Story Reader
- **Cinematic Split-Screen Stage**: Displays high-fidelity artwork on the left, illuminated alongside rich prose on the right.
- **Synchronized Audio Scrubber & Stepper**: Jump between chapters seamlessly. The narrative text, heading, scene illustration, and audio transport stay locked in sync.
- **Editorial Typography**: Elegant serif typefaces, classical drop-caps, customizable font size controls, and an immersive focus mode.
- **Resilient Fallback Mode**: Graceful typography plates when visual generation rate limits occur.

### 2. 🎙️ Synchronized Spoken Narration Engine
- **Accurate Audio-Chapter Alignment**: Start times for every scene are calculated directly from decoded MPEG Layer III and RIFF WAVE frame headers, eliminating drifting or truncation.
- **Asynchronous Seek Queue**: Queues seeks performed during initial audio metadata loading, ensuring playback starts at the exact chapter timestamp.
- **Seamless Playback Controls**: Full transport dock with 15-second skip backward/forward, variable playback speed (`0.75x`, `1x`, `1.25x`, `1.5x`), and volume adjustment.
- **On-Demand Speech Regeneration**: Single-click audio re-synthesis directly from the reader interface.

### 3. 🎨 Multi-Image Creation Studio
- **Multi-Image Sequencing**: Upload multiple artwork plates to structure a 4-to-5 scene narrative.
- **Art Style & Genre Direction**: Direct stories across styles including *Classical Chiaroscuro Oil*, *Atmospheric Nocturne*, *Edo Woodblock*, and *Solarpunk Concept Art*.
- **Narrator Curation**: Assign distinguished voices such as *Eleanor Vance*, *Julian Vane*, *Sachi Takahashi*, and *Arthur Pendelton*.

### 4. 📻 Daily Notes & Audio Vignettes
- **Personal Audio Journal**: Create short-form reflections with an interactive status pipeline (`Draft` ➔ `Generating` ➔ `Ready`).
- **One-Click Narration**: Turn written thoughts into voice-narrated micro-vignettes powered by Google Gemini TTS or secondary speech fallbacks.
- **Client-Side Persistence**: Preserves user reflections across browser reloads via `localStorage`.

### 5. 🏛️ Curated Archive & Filter Salon
- **Genre-Categorized Gallery**: Browse by *Myth & Cosmos*, *Ancient Folklore*, *Gothic Mystery*, and *Solarpunk Odyssey*.
- **Real-Time Search**: Search by title, author, narrator, or thematic keyword.
- **Persistent Archive Management**: Full control to archive, restore defaults, or delete generated stories.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Core** | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Styling** | Vanilla CSS Design System with custom HSL tokens, dark-mode glassmorphism, and responsive CSS Grid/Flexbox |
| **Icons & Media** | [Lucide React](https://lucide.dev/), HTML5 Audio API with custom hooks |
| **Backend API** | [Node.js](https://nodejs.org/), [Express 5](https://expressjs.com/), [Dotenv](https://github.com/motdotla/dotenv) |
| **AI Integration** | Google Gemini 3.8 / 3.7 Flash API (Generative Language API), Pollinations AI Image API |
| **Linting & Quality** | [Oxlint](https://oxc.rs/) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 📁 Project Architecture

```
storycanvas/
├── public/
│   ├── audio/              # Curated static audio files (.mp3)
│   ├── generated/          # Runtime storage for generated audio & artwork
│   │   ├── audio/
│   │   └── images/
│   └── images/             # Editorial cover artwork & seed assets
├── server/
│   ├── config.mjs          # Environment configuration loader
│   └── index.mjs           # Express API server (TTS & Story generation)
├── src/
│   ├── components/         # Modular UI Components
│   │   ├── AudioDock.tsx         # Persistent bottom audio player
│   │   ├── AudioVignettes.tsx    # Daily Notes & Vignettes section
│   │   ├── DailyNoteModal.tsx    # Note creation & editing modal
│   │   ├── Navbar.tsx            # Sticky navigation & search
│   │   ├── ReadNoteModal.tsx     # Note reading view
│   │   ├── StoryHero.tsx         # Featured story hero showcase
│   │   ├── StoryReader.tsx       # Dedicated split-screen story reader
│   │   └── StudioModal.tsx       # Multi-image story creator studio
│   ├── data/
│   │   └── stories.ts      # Curated literature & default vignettes
│   ├── hooks/
│   │   └── useAudioPlayer.ts # Custom HTML5 audio hook with seek locking
│   ├── styles/             # Modular CSS design system tokens
│   ├── utils/
│   │   └── audioSync.ts    # Chapter timestamp calibration utility
│   ├── App.tsx             # Root application orchestrator
│   └── types.ts            # Core TypeScript interfaces & types
├── .env.example            # Template for environment variables
├── package.json            # Scripts & project dependencies
├── vercel.json             # Vercel SPA rewrites & build configuration
└── vite.config.ts          # Vite build & local dev proxy configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** `>= 18.0.0`
- **npm** or **pnpm**
- A **Google Gemini API Key** (available from [Google AI Studio](https://aistudio.google.com/app/apikey))

### 1. Clone the Repository
```bash
git clone https://github.com/Chandru9842/storycanvas.git
cd storycanvas
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the example environment file and add your credentials:
```bash
cp .env.example .env
```
Open `.env` and set your Gemini API key:
```ini
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
IMAGE_PROVIDER=pollinations
TTS_PROVIDER=gemini_tts
```

### 4. Run Locally
Start the backend Express server:
```bash
npm run server
```
In a second terminal, start the Vite frontend development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌐 Deploying to Vercel

The repository includes a ready-to-use [`vercel.json`](./vercel.json) that configures Vite Single-Page Application routing:

1. Push your repository to GitHub.
2. Sign in to [Vercel](https://vercel.com/) and click **Add New...** ➔ **Project**.
3. Import your `storycanvas` repository.
4. Set the **Framework Preset** to `Vite`.
5. Under **Environment Variables**, configure:
   - `GEMINI_API_KEY`: Your Gemini API key.
   - `IMAGE_PROVIDER`: `pollinations`
   - `TTS_PROVIDER`: `gemini_tts`
6. Click **Deploy**.

---

## 🧪 Testing & Verification

StoryCanvas includes an automated test script to verify story audio duration calibration and chapter selection:

```bash
# Run the automated chapter synchronization verification
node ./scripts/test-story-bug.cjs

# Verify TypeScript types and production build
npm run build
```

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👤 Author

**Chandru M**  
- GitHub: [@Chandru9842](https://github.com/Chandru9842)
