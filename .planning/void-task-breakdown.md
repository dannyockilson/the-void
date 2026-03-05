# Void Screamer — Task Breakdown & Dependencies

## Task Dependency Graph

```
T1 (Project Setup)
├── T2 (Audio Pipeline) ──────────────────┐
│   ├── T3 (Echo/Reverb Chain)            │
│   │   └── T7 (Synth Fallback)           │
│   └── T4 (Volume Analysis)              │
│       ├── T5 (Canvas Ripple) ◄──────────┘
│       ├── T9 (Haptic Layer)
│       └── T11 (Volume Milestones)
├── T6 (First Visit Flow)
│   └── T7 (Synth Fallback)
├── T8 (Ambient Idle State)
├── T10 (Silence Detection)
├── T12 (Void Memory System)
├── T13 (Rare Events)
├── T14 (Temporal Awareness)
├── T15 (PWA & Service Worker)
└── T16 (Cross-Browser Testing)
```

---

## Phase 1: Foundation

### T1 — Project Scaffolding

**Depends on:** nothing
**Blocks:** everything

- [ ] Create repo, GitHub Pages config
- [ ] Single `index.html` with inline CSS/JS (or minimal build if preferred)
- [ ] Full-viewport dark canvas element
- [ ] Near-black background (`#010005`)
- [ ] Meta tags: viewport, theme-color, description
- [ ] Basic PWA manifest stub (fleshed out in T15)

**Acceptance:** blank dark page renders correctly on desktop and mobile browsers.

---

### T2 — Audio Capture Pipeline

**Depends on:** T1
**Blocks:** T3, T4, T7

- [ ] `AudioContext` creation with user-gesture gating (tap/click to initialise)
- [ ] `getUserMedia({ audio: true })` request
- [ ] Connect mic stream to `AnalyserNode`
- [ ] Handle permission granted / denied / error states
- [ ] Handle `AudioContext.resume()` requirement (Safari, Chrome autoplay policy)
- [ ] Verify stream is live and producing data

**Acceptance:** console logs real-time audio level from mic input. Permission denial is caught gracefully.

**Notes:**
- AudioContext MUST be created inside a user gesture handler
- Safari requires explicit `resume()` call
- Consider `audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }` constraints for raw input

---

### T3 — Echo & Reverb Chain

**Depends on:** T2
**Blocks:** T7 (shares reverb infrastructure)

- [ ] Capture short audio buffer from mic input (MediaRecorder or ScriptProcessorNode/AudioWorklet)
- [ ] Multi-tap delay: `DelayNode` chain (3-5 taps, increasing delay times)
- [ ] Convolution reverb: `ConvolverNode` with cavern/cathedral impulse response
- [ ] Source or generate a suitable impulse response (IR) file
- [ ] Gain decay: exponential ramp-down on each echo tap
- [ ] Optional pitch shift on echo taps (slight downward shift per iteration)
- [ ] Connect chain to `AudioContext.destination`

**Acceptance:** screaming into mic produces a convincing cavernous echo that decays into silence.

**Notes:**
- Free IR sources: OpenAir library, EchoThief project
- IR file should be bundled (small WAV/OGG), loaded via `fetch` + `decodeAudioData`
- Keep total echo tail under 4-5 seconds to avoid muddiness

---

### T4 — Volume Analysis & Normalisation

**Depends on:** T2
**Blocks:** T5, T9, T11

- [ ] RMS volume calculation from `AnalyserNode` frequency/time data
- [ ] Auto-calibration: sample ambient noise level for first 1-2 seconds after mic activation
- [ ] Normalise volume to 0-1 range relative to ambient baseline
- [ ] Expose normalised volume as a reactive value (callback or shared state)
- [ ] Peak detection: identify scream onset and end (threshold crossing with hysteresis)
- [ ] Smoothing: EMA (exponential moving average) to prevent jitter

**Acceptance:** normalised volume value reliably represents scream intensity across different devices and environments.

---

## Phase 2: Visuals & Interaction

### T5 — Canvas Ripple Visualisation

**Depends on:** T4 (needs volume data), T1 (needs canvas)
**Blocks:** T11 (milestone visuals extend this), T13 (rare event visuals)

- [ ] Full-viewport Canvas 2D (or WebGL if performance demands)
- [ ] `requestAnimationFrame` render loop
- [ ] Ripple ring spawning: new ring on scream onset (peak detection from T4)
- [ ] Ring properties: radius, opacity, thickness — all functions of time since spawn
- [ ] Ring amplitude (initial size/opacity) mapped to normalised volume
- [ ] Expansion: rings grow outward from centre at consistent rate
- [ ] Decay: opacity fades to 0 over ring lifetime
- [ ] Organic wobble: perlin noise or sine-wave displacement on ring edges
- [ ] Colour: dark purple/blue range, mapped to intensity
- [ ] Handle viewport resize (responsive canvas)
- [ ] Multiple concurrent rings (array of active ring objects)

**Acceptance:** screaming produces visible, satisfying ripple rings that expand and fade. Louder = bigger/brighter. Multiple rapid screams layer rings correctly.

**Notes:**
- Consider WebGL for better performance with many concurrent rings + particle system
- Canvas 2D is simpler and probably sufficient for MVP
- Ring objects: `{ x, y, radius, maxRadius, opacity, birthTime, amplitude, wobbleOffset }`

---

### T6 — First Visit Flow

**Depends on:** T1
**Blocks:** T7 (fallback text depends on permission outcome)

- [ ] Check `localStorage` for returning visitor flag
- [ ] New visitor: fade in *"the void is listening"* (2-3s ease-in)
- [ ] Delayed secondary text: *"it needs your voice"* (1s after first text)
- [ ] Tap/click handler on full viewport → triggers AudioContext init (T2)
- [ ] On permission granted: fade out text (1s), set localStorage flag
- [ ] On permission denied: transition to synth mode text (T7)
- [ ] Returning visitor: skip directly to active void state
- [ ] Text styling: colour `#1a1a2e`, minimal, centred, sans-serif, barely readable

**Acceptance:** first-time visitor sees contextual text, taps, gets permission prompt. Second visit goes straight to void.

---

### T7 — Synthesised Fallback

**Depends on:** T3 (reuses reverb chain), T6 (triggered by permission denial)
**Blocks:** nothing (enhancement layer)

- [ ] Detect permission denial or `getUserMedia` failure
- [ ] UI text: *"the void can still feel you"*
- [ ] Tap/click triggers synthesised dark reverb sound
- [ ] Use same `ConvolverNode` chain from T3
- [ ] Sound source: `OscillatorNode` burst or pre-recorded dark tone
- [ ] Intensity mapped to tap duration or rapid-tap frequency
- [ ] Ripple system (T5) still responds to synth output volume
- [ ] All progressive enhancement layers (T10-T14) work in synth mode where applicable

**Acceptance:** denied-permission users get a meaningful, atmospheric tap-to-void experience.

---

### T8 — Ambient Idle State

**Depends on:** T1, T2 (AudioContext must exist)
**Blocks:** T10 (silence detection modifies ambient)

- [ ] Low-frequency `OscillatorNode` (sub-bass, ~40-60Hz)
- [ ] Very low gain (barely audible, more felt than heard)
- [ ] Subtle canvas particle system: slow-drifting dots, very low opacity
- [ ] Background colour: never pure black, slight purple cast
- [ ] Optional: very slow breathing animation on background brightness (CSS or canvas)
- [ ] Respect `prefers-reduced-motion`: disable particle drift if set

**Acceptance:** idle void feels alive — not static, not distracting. Ambient hum is present but doesn't compete with screams.

---

## Phase 3: Progressive Enhancement

### T9 — Haptic Feedback Layer

**Depends on:** T4 (needs volume data)
**Blocks:** nothing

- [ ] Feature-detect `navigator.vibrate()`
- [ ] Map normalised volume to vibration duration (e.g., 50-500ms)
- [ ] Map echo decay pattern to vibration pattern array
- [ ] Volume milestone vibration burst (distinct from regular feedback)
- [ ] Silence-response (T10) haptic: subtle pulse when void "breathes"
- [ ] Graceful no-op on unsupported devices (iOS Safari, desktop)

**Acceptance:** Android users feel the void respond to their screams through device vibration.

---

### T10 — Silence Detection & Response

**Depends on:** T4 (needs volume data), T8 (modifies ambient)
**Blocks:** nothing

- [ ] Timer: starts/resets on last volume spike above threshold
- [ ] After 30-60s of silence:
  - Ripple reverses direction (rings pull inward toward centre)
  - Ambient hum pitch rises slightly (frequency ramp on oscillator)
  - Particle drift speed increases
- [ ] Gradual onset (not sudden switch)
- [ ] Immediate reset when sound detected above threshold
- [ ] Configurable thresholds (constants, not UI)

**Acceptance:** leaving the app open in silence produces an unsettling "the void is reaching for you" effect.

---

### T11 — Volume Milestones

**Depends on:** T4 (volume data), T5 (extends ripple system)
**Blocks:** nothing

- [ ] High-volume threshold detection (well above normal speech, calibrated)
- [ ] Milestone effects:
  - Deeper, wider ripple rings
  - Extended echo tail (increase delay/reverb wet mix temporarily)
  - Brief crack of light from centre (white/bright flash, <200ms, immediate fade)
  - Haptic burst (T9)
- [ ] Threshold should be hard enough to reach that it feels earned
- [ ] Visual flash must not trigger photosensitivity issues (brief, not strobing)

**Acceptance:** screaming really loud produces a distinct, rewarding visual/audio response that feels different from normal interaction.

---

### T12 — Void Memory System

**Depends on:** T1 (localStorage), T4 (cumulative scream data)
**Blocks:** T13 (rare events use visit count)

- [ ] `localStorage` schema:
  ```json
  {
    "voidVisits": 0,
    "cumulativeEnergy": 0,
    "lastVisit": "ISO-timestamp",
    "firstVisit": "ISO-timestamp"
  }
  ```
- [ ] Increment visit count on each session
- [ ] Accumulate scream energy (sum of RMS peaks per session)
- [ ] Map visit count / energy to subtle parameter shifts:
  - Background hue: pure dark → very dark navy (over ~50+ visits)
  - Echo decay time: +5-10% over ~100+ sessions
  - Ambient hum frequency: drops ~5Hz over ~100+ sessions
  - Ripple ring count: +1-2 max concurrent rings over ~50+ visits
- [ ] All shifts imperceptible per-session, only noticeable over long timeframes
- [ ] Graceful handling of missing/corrupt localStorage

**Acceptance:** the void slowly evolves with use. A fresh install and a 100-visit install feel subtly but measurably different.

---

### T13 — Rare Events

**Depends on:** T5 (ripple system), T3 (echo chain), T12 (visit data for probability weighting)
**Blocks:** nothing

- [ ] Per-scream random check: 1-2% base probability
- [ ] Probability optionally influenced by void memory (more visits = slightly higher chance)
- [ ] Event pool:
  - **Distant echo:** panned to one side, different reverb character, as if from another space
  - **Visual flicker:** brief shape or shadow in the ripple field (~100ms)
  - **Void breathes:** unprompted ambient sound shift after silence, no user input
  - **Haptic anomaly:** unexpected vibration pattern (mobile only)
- [ ] Maximum one rare event per session (prevent cheapening)
- [ ] Events should feel genuinely unsettling, never cute or gamified

**Acceptance:** rare events surprise returning users and create "did that just happen?" moments.

---

### T14 — Temporal Awareness

**Depends on:** T8 (modifies ambient parameters), T3 (modifies echo)
**Blocks:** nothing

- [ ] Time-of-day detection: `new Date().getHours()`
- [ ] Night mode (11pm-5am): deeper reverb wet mix, longer decay, cooler colour shift on ripples
- [ ] Day mode: slightly shorter decay, marginally warmer colour undertone
- [ ] Seasonal: `new Date().getMonth()` — longer echo in winter (Oct-Mar), warmer ripple tones in summer (Apr-Sep)
- [ ] All transitions are parameter adjustments on existing systems, not separate code paths
- [ ] No API calls — pure local date math

**Acceptance:** the void at 3am feels different from the void at noon. Subtly, never obviously.

---

## Phase 4: Production

### T15 — PWA & Offline Support

**Depends on:** T1 (project structure finalised)
**Blocks:** T16

- [ ] `manifest.json`: name, short_name, icons, theme_color, background_color, display: standalone
- [ ] App icons: minimal/abstract void icon at required sizes (192x192, 512x512)
- [ ] Service worker: cache-first strategy for all assets
- [ ] Offline support: entire app works without network after first load
- [ ] iOS meta tags: `apple-mobile-web-app-capable`, status bar style
- [ ] `<link rel="manifest">` in HTML

**Acceptance:** app is installable on home screen (Android + iOS), works fully offline.

---

### T16 — Cross-Browser Testing & Polish

**Depends on:** all other tasks
**Blocks:** nothing (final gate)

- [ ] Desktop: Chrome, Firefox, Edge — verify audio pipeline and canvas rendering
- [ ] Android: Chrome, Firefox — verify mic, haptics, PWA install
- [ ] iOS Safari: verify AudioContext resume, getUserMedia, PWA install
  - Use BrowserStack/LambdaTest free tier for real device testing
  - Key risk: AudioContext.resume() timing, getUserMedia constraints
- [ ] Test fallback path (deny mic permission) on all platforms
- [ ] Performance: verify 60fps ripple rendering on mid-range devices
- [ ] `prefers-reduced-motion` respected
- [ ] Audit localStorage usage (graceful on private browsing / storage full)
- [ ] Lighthouse PWA audit pass

**Acceptance:** consistent experience across major browsers. Known iOS limitations documented.

---

## Implementation Order (Suggested)

| Order | Tasks | Milestone |
|-------|-------|-----------|
| 1 | T1 | Dark page on GitHub Pages |
| 2 | T2 → T4 | Mic capture with volume analysis |
| 3 | T3 | Echo playback working |
| 4 | T5 | Visual ripples responding to audio |
| 5 | T8 | Ambient idle state |
| 6 | T6 → T7 | First visit flow + synth fallback |
| 7 | T15 | PWA installable and offline |
| 8 | T9 | Haptic feedback |
| 9 | T10 | Silence detection |
| 10 | T12 | Void memory persistence |
| 11 | T11, T13, T14 | Enhancement layers (parallel) |
| 12 | T16 | Cross-browser testing & polish |
