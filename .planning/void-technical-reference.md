# Void Screamer — Technical Reference

Reference material for PWA, Web Audio, Canvas/WebGL, and Haptic APIs. Structured for use as Claude Code skill context.

---

## 1. Web Audio API

### Core Concepts

The Web Audio API provides an audio-processing graph built from `AudioNode` objects connected within an `AudioContext`. All audio operations happen inside a context — create one per page and reuse it.

### AudioContext Lifecycle

```javascript
// MUST be created inside a user gesture handler (click/tap)
const audioCtx = new AudioContext();

// Safari and Chrome require explicit resume after user gesture
await audioCtx.resume();

// State can be: 'suspended', 'running', 'closed'
console.log(audioCtx.state);
```

**Critical gotcha:** Browsers suspend AudioContext created without a user gesture. Always create/resume inside a click or tap handler. This is the single biggest source of "no audio" bugs on mobile.

### getUserMedia — Mic Access

```javascript
// Request mic access — REQUIRES HTTPS or localhost
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: false,  // Raw input for our use case
    noiseSuppression: false,
    autoGainControl: false
  }
});

// Connect to audio graph
const source = audioCtx.createMediaStreamSource(stream);
```

**Constraints reference:**

| Constraint | Default | Void Screamer Setting | Reason |
|---|---|---|---|
| `echoCancellation` | `true` | `false` | We want the raw scream |
| `noiseSuppression` | `true` | `false` | Need ambient noise for calibration |
| `autoGainControl` | `true` | `false` | Volume analysis needs real levels |

**Permission handling:**

```javascript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Granted — proceed with mic pipeline
} catch (err) {
  if (err.name === 'NotAllowedError') {
    // User denied — switch to synth fallback
  } else if (err.name === 'NotFoundError') {
    // No mic available — switch to synth fallback
  } else {
    // Other error — switch to synth fallback
  }
}
```

**Security requirements:**
- `getUserMedia` only works in secure contexts (HTTPS, localhost, or `file://`)
- Must be called from top-level document context or an iframe with appropriate Permissions Policy
- The promise may never resolve if the user ignores the permission prompt

### AnalyserNode — Volume & Frequency Data

```javascript
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 2048;           // Power of 2, 32-32768
analyser.smoothingTimeConstant = 0.8; // 0-1, higher = smoother

source.connect(analyser);

// Time domain data (waveform)
const timeData = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteTimeDomainData(timeData);

// Frequency data
const freqData = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(freqData);
```

**RMS volume calculation:**

```javascript
function getRMSVolume(analyser) {
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}
```

### Echo Chain — Delay + Reverb + Decay

```javascript
// Multi-tap delay
function createEchoChain(audioCtx, taps = 4) {
  const delays = [];
  const gains = [];
  const input = audioCtx.createGain();

  for (let i = 0; i < taps; i++) {
    const delay = audioCtx.createDelay(5.0); // Max 5 seconds
    delay.delayTime.value = 0.3 * (i + 1);  // 0.3s, 0.6s, 0.9s, 1.2s

    const gain = audioCtx.createGain();
    gain.gain.value = Math.pow(0.5, i + 1);  // Exponential decay

    input.connect(delay);
    delay.connect(gain);
    // gain.connect(destination or next node)

    delays.push(delay);
    gains.push(gain);
  }

  return { input, delays, gains };
}
```

### ConvolverNode — Convolution Reverb

```javascript
async function createReverb(audioCtx, irUrl) {
  const response = await fetch(irUrl);
  const arrayBuffer = await response.arrayBuffer();
  const impulseResponse = await audioCtx.decodeAudioData(arrayBuffer);

  const convolver = audioCtx.createConvolver();
  convolver.buffer = impulseResponse;
  return convolver;
}

// Usage
const reverb = await createReverb(audioCtx, 'ir/cavern.wav');
source.connect(reverb);
reverb.connect(audioCtx.destination);
```

**Impulse Response (IR) files** are WAV recordings of acoustic spaces. The ConvolverNode convolves input audio with the IR to simulate that space's reverb character.

**Free IR sources for cavernous/dark spaces:**
- **OpenAir** (openairlib.net) — academic library of measured acoustic spaces, CC licensed, includes caves, tunnels, underpasses
- **EchoThief** (echothief.com) — community-recorded IRs from unusual spaces worldwide
- **Fokke van Saane** (fokkie.home.xs4all.nl/IR.htm) — includes claustrophobic/small spaces and unusual environments
- **Voxengo** — free impulse response pack, modelled spaces

For the void, look for: long-tail cave/tunnel IRs, cathedral IRs with 3-5 second decay, or synthesise one using a filtered noise burst with exponential decay.

**Tip:** IR files should be small (WAV or OGG, ideally under 500KB) for fast loading in a PWA context. Downsample long IRs to reduce size — 44.1kHz mono is fine.

### OscillatorNode — Ambient Hum

```javascript
const osc = audioCtx.createOscillator();
osc.type = 'sine';          // 'sine', 'square', 'sawtooth', 'triangle'
osc.frequency.value = 45;   // Hz — sub-bass, felt more than heard

const oscGain = audioCtx.createGain();
oscGain.gain.value = 0.02;  // Very quiet

osc.connect(oscGain);
oscGain.connect(audioCtx.destination);
osc.start();

// Gradual frequency shift (void memory evolution)
osc.frequency.linearRampToValueAtTime(40, audioCtx.currentTime + 2);
```

### MediaRecorder — Capturing Scream Audio for Playback

```javascript
const mediaRecorder = new MediaRecorder(stream);
const chunks = [];

mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
mediaRecorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  // Play back through echo chain
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(echoChainInput);
  source.start();
};

// Start/stop based on volume threshold
mediaRecorder.start();
setTimeout(() => mediaRecorder.stop(), 3000); // or trigger on silence detection
```

### Full Audio Graph (Void Screamer)

```
getUserMedia (mic)
  │
  ├── AnalyserNode ──── [volume/frequency data → Canvas + Haptics]
  │
  └── MediaRecorder (capture buffer)
        │
        └── BufferSource (playback)
              │
              ├── DelayNode (tap 1, 0.3s) → GainNode (0.5)
              ├── DelayNode (tap 2, 0.6s) → GainNode (0.25)
              ├── DelayNode (tap 3, 0.9s) → GainNode (0.125)
              └── DelayNode (tap 4, 1.2s) → GainNode (0.0625)
                    │
                    └── ConvolverNode (cavern IR)
                          │
                          └── GainNode (master) → destination

OscillatorNode (ambient hum, 40-50Hz)
  └── GainNode (0.02) → destination
```

### Browser Compatibility Notes

| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| AudioContext | Yes | Yes | Yes (webkit prefix removed) | Yes |
| getUserMedia | Yes | Yes | Yes (14.5+) | Yes |
| AnalyserNode | Yes | Yes | Yes | Yes |
| ConvolverNode | Yes | Yes | Yes | Yes |
| MediaRecorder | Yes | Yes | Yes (14.6+) | Yes |
| AudioWorklet | Yes | Yes | Yes (14.5+) | Yes |

- **Safari/iOS:** AudioContext must be created/resumed inside a user gesture. This is non-negotiable. The tap-to-start flow in the first visit design handles this.
- **Chrome autoplay policy:** Same user gesture requirement. Applies to AudioContext creation.
- **Background tabs:** Browsers throttle or suspend audio processing in background tabs. Not an issue for this app (user is looking at the void).

---

## 2. Canvas / WebGL Rendering

### Canvas 2D — Simpler Approach (Recommended for MVP)

```javascript
const canvas = document.getElementById('void');
const ctx = canvas.getContext('2d');

// Full viewport sizing
function resize() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(devicePixelRatio, devicePixelRatio);
}
window.addEventListener('resize', resize);
resize();
```

**Ripple ring rendering (Canvas 2D):**

```javascript
class Ripple {
  constructor(x, y, amplitude) {
    this.x = x;
    this.y = y;
    this.amplitude = amplitude;  // 0-1, from normalised volume
    this.radius = 0;
    this.maxRadius = Math.max(canvas.width, canvas.height);
    this.opacity = amplitude * 0.6;
    this.birthTime = performance.now();
    this.speed = 150;  // px/sec
    this.lifetime = this.maxRadius / this.speed * 1000;
  }

  update(now) {
    const age = now - this.birthTime;
    const progress = age / this.lifetime;
    this.radius = progress * this.maxRadius;
    this.opacity = this.amplitude * 0.6 * (1 - progress);
    return progress < 1;  // alive?
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(26, 0, 53, ${this.opacity})`;
    ctx.lineWidth = 2 + this.amplitude * 4;
    ctx.stroke();
  }
}
```

**Render loop:**

```javascript
const ripples = [];

function render(now) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = '#010005';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Update and draw ripples (remove dead ones)
  for (let i = ripples.length - 1; i >= 0; i--) {
    if (!ripples[i].update(now)) {
      ripples.splice(i, 1);
    } else {
      ripples[i].draw(ctx);
    }
  }

  requestAnimationFrame(render);
}
requestAnimationFrame(render);
```

### WebGL — Higher Performance Option

Use WebGL if you need: many concurrent rings (50+), complex particle systems, or shader-based distortion effects. For the void screamer, WebGL is likely overkill for MVP but worth considering for the full enhancement layer.

**Minimal WebGL setup for fullscreen shader:**

```javascript
const gl = canvas.getContext('webgl');

// Vertex shader — fullscreen quad
const vertSrc = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// Fragment shader — ripple effect
const fragSrc = `
  precision highp float;
  uniform vec2 resolution;
  uniform float time;
  uniform float volume;       // Current normalised volume
  uniform vec2 rippleCenter;  // Centre of ripple
  uniform float rippleTime;   // Time since ripple started

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 center = rippleCenter / resolution;
    float dist = distance(uv, center);

    // Ripple wave
    float wave = sin(dist * 40.0 - rippleTime * 5.0) * 0.5 + 0.5;
    float falloff = exp(-dist * 3.0) * exp(-rippleTime * 0.5);
    float ripple = wave * falloff * volume;

    // Dark purple palette
    vec3 bg = vec3(0.004, 0.0, 0.02);
    vec3 rippleColor = vec3(0.04, 0.0, 0.08);
    vec3 color = mix(bg, rippleColor, ripple);

    gl_FragColor = vec4(color, 1.0);
  }
`;
```

**Ripple effect approaches:**
- **Sinc function** (`sin(x)/x`): Classic ripple shape, creates concentric rings that decay with distance
- **Verlet integration**: More physically accurate wave simulation, uses height maps and discrete Laplace operator — overkill for this but visually stunning
- **Simple sine-based**: `sin(dist * freq - time * speed) * amplitude * falloff` — fast, looks good

### Particle System (Ambient Idle)

For the idle particle drift, Canvas 2D is sufficient:

```javascript
class Particle {
  constructor(w, h) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.vx = (Math.random() - 0.5) * 0.2;  // Very slow drift
    this.vy = (Math.random() - 0.5) * 0.2;
    this.opacity = Math.random() * 0.03;      // Barely visible
    this.size = Math.random() * 1.5 + 0.5;
  }
}
```

### Reduced Motion

```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReducedMotion) {
  // Disable particle drift
  // Reduce or disable ripple animation
  // Keep audio experience unchanged
}
```

---

## 3. Vibration API (Haptic Feedback)

### API Surface

```javascript
// Feature detection
if ('vibrate' in navigator) {
  // Vibration supported (Android Chrome/Firefox, NOT Safari)
}

// Simple vibration (milliseconds)
navigator.vibrate(200);

// Pattern: [vibrate, pause, vibrate, pause, ...]
navigator.vibrate([100, 50, 200, 50, 300]);

// Stop vibration
navigator.vibrate(0);
// or
navigator.vibrate([]);
```

### Browser Support

| Browser | Support | Notes |
|---|---|---|
| Chrome (Android) | Yes | Must be triggered from user gesture in cross-origin iframes |
| Firefox (Android) | Yes | Full support |
| Safari (iOS) | **No** | Not supported at all |
| Safari (macOS) | **No** | No vibration hardware |
| Chrome (desktop) | API exists | No vibration hardware on most devices |
| Edge (Android) | Yes | Chromium-based |

**Key constraints:**
- Not supported in Safari — no iOS haptic path via this API
- Must be triggered from user gesture context in some browsers
- Pattern too long will be truncated (max length is implementation-dependent)
- Silent mode / DND may suppress vibration
- Cannot control vibration intensity — only duration and pattern
- Only works on devices with vibration hardware

### Mapping Volume to Haptic Patterns

```javascript
function vibrateForVolume(normalisedVolume) {
  if (!('vibrate' in navigator)) return;

  // Map 0-1 volume to 50-500ms vibration
  const duration = Math.floor(50 + normalisedVolume * 450);
  navigator.vibrate(duration);
}

function vibrateEchoDecay(normalisedVolume, taps = 4) {
  if (!('vibrate' in navigator)) return;

  const pattern = [];
  for (let i = 0; i < taps; i++) {
    const intensity = normalisedVolume * Math.pow(0.5, i);
    pattern.push(Math.floor(intensity * 300));  // vibrate
    pattern.push(Math.floor(300 * (i + 1)));    // pause (increasing)
  }
  navigator.vibrate(pattern);
}

function vibrateMilestone() {
  if (!('vibrate' in navigator)) return;
  navigator.vibrate([100, 30, 100, 30, 300]);  // Distinctive burst
}
```

---

## 4. PWA Setup

### Web App Manifest

```json
{
  "name": "The Void",
  "short_name": "Void",
  "description": "Scream into the void.",
  "start_url": "/void/",
  "display": "standalone",
  "background_color": "#010005",
  "theme_color": "#010005",
  "orientation": "any",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**Manifest fields for this app:**

| Field | Value | Reason |
|---|---|---|
| `display` | `standalone` | No browser chrome — pure void |
| `background_color` | `#010005` | Matches app background, seamless splash |
| `theme_color` | `#010005` | Status bar colour on Android |
| `orientation` | `any` | Works in any orientation |

### HTML Meta Tags

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#010005">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icon-192.png">
```

### Service Worker — Cache-First Strategy

```javascript
// sw.js
const CACHE_NAME = 'void-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/ir/cavern.wav'   // Impulse response file
];

// Install — cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
```

**Registration in main HTML:**

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.log('SW registration failed:', err));
  });
}
```

### GitHub Pages Deployment

- Repository: `username/void`
- Enable GitHub Pages in repo settings → Source: main branch, root
- URL: `https://username.github.io/void/`
- HTTPS provided automatically (required for getUserMedia and Service Worker)
- `start_url` in manifest should match the deployed path

**Gotcha:** GitHub Pages serves from a subdirectory (`/void/`), so all paths in the service worker and manifest must be relative or account for the base path.

### PWA Install Criteria (Chrome)

For Chrome to show the install prompt, the app needs:
- Valid manifest with `name`, `icons` (192px + 512px), `start_url`, `display`
- Served over HTTPS
- Registered service worker with a `fetch` handler
- User engagement heuristic met (varies)

### Lighthouse PWA Audit Checklist

- [ ] Responds with 200 when offline
- [ ] Has a `<meta name="viewport">` tag
- [ ] Uses HTTPS
- [ ] Registers a service worker with `fetch` handler
- [ ] Contains a web app manifest meeting installability requirements
- [ ] Sets `theme_color` in manifest and meta tag
- [ ] Provides a custom splash screen (via manifest icons + background_color)
- [ ] Viewport configured for mobile

---

## 5. localStorage — Void Memory Persistence

```javascript
const VOID_STATE_KEY = 'void_state';

const defaultState = {
  visits: 0,
  cumulativeEnergy: 0,
  firstVisit: null,
  lastVisit: null,
  hasSeenIntro: false
};

function loadVoidState() {
  try {
    const stored = localStorage.getItem(VOID_STATE_KEY);
    return stored ? { ...defaultState, ...JSON.parse(stored) } : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

function saveVoidState(state) {
  try {
    localStorage.setItem(VOID_STATE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or private browsing — fail silently
  }
}
```

**Private browsing note:** Safari's private mode throws on `localStorage.setItem` when storage quota is exceeded (which is 0 in older versions). Always wrap in try/catch.

---

## 6. Key API Documentation Links

### MDN References
- [AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)
- [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)
- [ConvolverNode](https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode)
- [DelayNode](https://developer.mozilla.org/en-US/docs/Web/API/DelayNode)
- [GainNode](https://developer.mozilla.org/en-US/docs/Web/API/GainNode)
- [OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode)
- [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Web Audio API overview](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)
- [Canvas 2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)
- [WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Tutorial (CycleTracker)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/CycleTracker/Service_workers)
- [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)

### Browser Compatibility
- [Can I Use: Web Audio API](https://caniuse.com/audio-api)
- [Can I Use: getUserMedia](https://caniuse.com/stream)
- [Can I Use: Vibration API](https://caniuse.com/mdn-api_navigator_vibrate)
- [Can I Use: Service Workers](https://caniuse.com/serviceworkers)

### Impulse Response Libraries (Free)
- [OpenAir](https://openairlib.net/) — academic IR library, CC licensed
- [EchoThief](http://www.echothief.com/) — community-recorded IRs from unusual spaces
- [Fokke van Saane IRs](https://fokkie.home.xs4all.nl/IR.htm) — small/unusual spaces
- [Voxengo Free IR Pack](https://www.voxengo.com/impulses/) — modelled spaces

### WebGL Ripple References
- [Codrops: WebGL Shader Ripples with GSAP](https://tympanus.net/codrops/2025/10/08/how-to-animate-webgl-shaders-with-gsap-ripples-reveals-and-dynamic-blur-effects/)
- [Adrian Boeing: Ripple effect in WebGL](http://adrianboeing.blogspot.com/2011/02/ripple-effect-in-webgl.html) — sinc function approach
- [Almeros: Water Ripple with Canvas](https://code.almeros.com/water-ripple-canvas-and-javascript/) — Canvas 2D approach
- [webgl-ripple (GitHub)](https://github.com/DCtheTall/webgl-ripple) — Verlet integration approach

### Cross-browser Audio Library (Optional)
- [standardized-audio-context](https://github.com/chrisguttandin/standardized-audio-context) — polyfill/wrapper that normalises Web Audio API across browsers, worth considering if Safari quirks become a pain

### Testing Tools
- [BrowserStack](https://www.browserstack.com/) — real device testing, free tier available for iOS Safari verification
- [LambdaTest](https://www.lambdatest.com/) — similar, free tier with real iOS sessions
- [Chrome Lighthouse](https://developer.chrome.com/docs/lighthouse/) — PWA audit
