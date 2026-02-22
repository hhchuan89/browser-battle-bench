# Browser Battle Bench

[![CI](https://img.shields.io/github/actions/workflow/status/hhchuan89/browser-battle-bench/ci.yml?branch=main&label=ci)](https://github.com/hhchuan89/browser-battle-bench/actions/workflows/ci.yml)
[![Stars](https://img.shields.io/github/stars/hhchuan89/browser-battle-bench?style=social)](https://github.com/hhchuan89/browser-battle-bench/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vercel](https://img.shields.io/badge/Vercel-Live-111111?logo=vercel)](https://browserbattlebench.vercel.app/)
[![Vue 3](https://img.shields.io/badge/Vue-3.4-brightgreen.svg)](https://vuejs.org/)

> ⚔️ **A pure client-side AI benchmarking platform designed to stress-test local models and agents.**

Browser Battle Bench is a zero-cost, edge-first benchmarking tool that runs entirely in your browser. It stress-tests AI models using challenging logic traps, JSON constraints, and endurance scenarios.

**We welcome evil JSON schemas and logic paradoxes. Send a PR!**

[Contributing Guide](./CONTRIBUTING.md) · [Submit a Torture Test Issue](https://github.com/hhchuan89/browser-battle-bench/issues/new?template=torture-test.yml&labels=torture-test&title=%5BTorture%20Test%5D%20)

![Model run getting wasted in BBB](docs/media/bbb-wasted-demo.gif)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/hhchuan89/browser-battle-bench.git
cd browser-battle-bench

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open your browser to `http://localhost:5173` to see the app.

## ✨ Features

### 🎯 Battle Arena
- **Logic Traps**: Test reasoning with misleading premises
- **JSON Straitjacket**: Strict output format validation
- **Real-time Scoring**: Animated score counter with performance badges
- **Card Flip Animations**: Smooth transitions between challenges

### 🔥 Endurance Arena
- **Memory Monitoring**: Track heap usage with Chrome/Edge
- **Concurrent Testing**: Run parallel inference batches
- **Visual Charts**: Gradient memory and latency visualizations
- **Leak Detection**: Automatic memory leak rate calculation

### 🛡️ Warden System
- **Automated Judging**: No human intervention required
- **Panic Mode**: Emergency halt for runaway processes
- **Robust JSON Parsing**: Handles markdown, comments, and edge cases

## 🛠️ Tech Stack

- **Framework**: [Vue 3](https://vuejs.org/) with Composition API
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/)
- **AI Engine**: [WebLLM](https://github.com/mlc-ai/web-llm) (@mlc-ai/web-llm)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Type Safety**: TypeScript 5.2

## 📁 Project Structure

```
browser-battle-bench/
├── src/
│   ├── components/          # Vue components
│   │   ├── BattleArena.vue  # Battle mode UI
│   │   ├── EnduranceArena.vue # Endurance test UI
│   │   ├── shared/          # Reusable components
│   │   │   ├── CountUp.vue  # Animated number counter
│   │   │   ├── FadeTransition.vue
│   │   │   ├── SlideTransition.vue
│   │   │   └── PulseRing.vue
│   │   └── ...
│   ├── stores/              # Pinia stores
│   │   ├── systemStore.ts   # Model & inference state
│   │   ├── battleStore.ts   # Battle mode state
│   │   └── enduranceStore.ts # Endurance test state
│   ├── services/            # Core services
│   │   ├── llm/             # LLM engine
│   │   │   └── engine.ts
│   │   ├── performance/     # Memory monitoring
│   │   │   └── MemoryMonitor.ts
│   │   └── warden/          # Judging & safety
│   │       ├── JudgeLogic.ts
│   │       ├── guillotine.ts
│   │       └── schema.ts
│   ├── data/                # Test data
│   │   ├── traps.ts         # Logic trap challenges
│   │   └── enduranceScenarios.ts
│   ├── types/               # TypeScript types
│   ├── workers/             # Web Workers
│   │   └── llm.worker.ts
│   ├── App.vue
│   └── main.ts
├── public/                  # Static assets
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🌐 Supported Browsers

| Browser | Memory Monitoring | WebGPU | Notes |
|---------|------------------|--------|-------|
| Chrome  | ✅ Full Support | ✅ | Recommended for best experience |
| Edge    | ✅ Full Support | ✅ | Recommended |
| Firefox | ⚠️ Limited | ⚠️ Partial | Memory API not available |
| Safari  | ⚠️ Limited | ❌ | No WebGPU support yet |
| Opera   | ⚠️ Limited | ⚠️ Partial | Memory API not available |

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (includes type checking) |
| `npm run preview` | Preview production build locally |
| `npm run test:ui` | Run Playwright UI smoke tests (requires local Playwright deps) |

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Optional: Custom model catalog URL
VITE_MODEL_CATALOG_URL=https://your-custom-catalog.json

# Optional: Enable debug logging
VITE_DEBUG_MODE=true

# Optional: App base URL for share links
VITE_APP_BASE_URL=https://browserbattlebench.vercel.app
```

For Vercel serverless APIs (`/api/report`, `/api/share/:id`, `/api/og/:id.png`, `/api/leaderboard/global`), configure these project-level environment variables:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
APP_BASE_URL=https://browserbattlebench.vercel.app
BBB_UPLOAD_LIMIT=20
BBB_UPLOAD_WINDOW_MINUTES=10
BBB_RATE_LIMIT_SALT=optional_random_string
```

Run SQL migration before first deploy:

`/Volumes/Hoh/openclaw_isolation/workspace/projects/browser-battle-bench/supabase/migrations/20260222_000001_bbb_reports_public.sql`

### Vite Configuration

Key settings in `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/browser-battle-bench/', // Change for custom deployment path
  build: {
    target: 'esnext', // Required for WebGPU
    chunkSizeWarningLimit: 2000, // WebLLM is large
  },
  // ...
})
```

## 🧪 Testing Modes

### UI Smoke Tests
Run the minimal Playwright smoke suite against a running dev server.

```bash
# In one terminal
npm run dev

# In another terminal (uses local Playwright deps only)
npm run test:ui

# Optional: point at a different target
BBB_BASE_URL=https://browserbattlebench.vercel.app npm run test:ui
```

### Battle Arena
Tests model's ability to:
- Follow strict JSON output formats
- Avoid logic traps with misleading premises
- Maintain consistency across multiple rounds

### Endurance Arena
Stress-tests model through:
- Sequential inference rounds (100-1000+)
- Concurrent batch processing
- Memory leak detection
- Latency tracking

## 📊 Understanding Results

### Battle Scoring
- **Legendary (95%+)**: Exceptional performance
- **Expert (85-94%)**: Strong reasoning
- **Skilled (70-84%)**: Solid but imperfect
- **Needs Practice (<70%)**: Struggles with traps

### Endurance Verdicts
- **STABLE**: No memory leaks, consistent latency
- **MEMORY_LEAK**: Heap growth > 1MB per round
- **CONCURRENCY_ISSUES**: <90% pass rate in parallel mode
- **UNSTABLE**: <80% overall pass rate

## 🤝 Contributing

Contributions are welcome through issues and pull requests.

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [WebLLM](https://github.com/mlc-ai/web-llm) team for the incredible engine
- [DaisyUI](https://daisyui.com/) for the beautiful component library
- All the open-source models being tested

## 🔗 Links

- [Live Demo](https://browserbattlebench.vercel.app/)
- [Repository](https://github.com/hhchuan89/browser-battle-bench)
- [Issues](https://github.com/hhchuan89/browser-battle-bench/issues)

---

<p align="center">Built with ⚔️ by the Browser Battle Bench Team</p>
