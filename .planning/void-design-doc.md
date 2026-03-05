# The Void — Design Document

## Concept

A cathartic web app about screaming into the void. You open it. Darkness. You scream. The void swallows it, distorts it, echoes it back, and lets it decay into nothing. A visual ripple pulses from the centre, its intensity tied to yours. Then silence returns.

No UI chrome. No social features. No tracking. Just the void.

## Core Experience Loop

1. User opens the app → darkness, faint ambient hum
2. User screams → mic captures audio
3. Audio is echoed back with reverb, pitch shift, and decay
4. Canvas/WebGL ripple pulses outward from centre, amplitude mapped to scream volume
5. Echo and ripple decay → silence and darkness return
6. Repeat

## Audio Architecture

### Primary Path: Mic Capture

- `getUserMedia()` for mic access
- `AnalyserNode` for real-time volume (RMS) and frequency data
- Short buffer capture of the scream audio for echo playback
- Echo chain: `DelayNode` → `ConvolverNode` (cavern impulse response) → gain ramp-down
- Optional pitch shifting via `AudioWorkletNode` or playback rate manipulation
- Ambient idle state: low-frequency `OscillatorNode` hum, very quiet, always present

### Fallback Path: Synthesised Response

- Triggered when mic permission is denied or `getUserMedia` fails
- Tap/click triggers a pre-designed dark reverb sound
- Intensity scaled to tap duration or rapid-tap frequency
- Uses the same `ConvolverNode` reverb chain as the primary path
- Text cue shifts to reflect tap-based interaction

### Audio Processing Chain

```
Mic Input → AnalyserNode (volume/frequency data)
         → MediaRecorder (short buffer capture)
         → DelayNode(s) (multi-tap echo)
         → ConvolverNode (cavern reverb IR)
         → GainNode (exponential decay)
         → AudioContext.destination (speakers)
```

## Visual Design

### Ripple System

- Canvas 2D or WebGL full-viewport render
- Concentric rings emanating from viewport centre
- Ring amplitude = RMS volume from `AnalyserNode`
- Ring colour: very dark purple/blue (#0a0010 → #120025 range), barely visible before fading
- Expansion speed and decay rate tied to scream duration and intensity
- Organic wobble on ring edges (perlin noise displacement or sine wave modulation)

### Idle State

- Near-black background (#010005 or similar, never pure #000)
- Subtle particle drift or animated noise texture for depth
- Very slow, barely perceptible breathing animation on background colour
- No visible UI elements

### Colour Palette

| Element | Colour | Notes |
|---------|--------|-------|
| Background | `#010005` | Near-black with slight purple cast |
| Ripple base | `#0a0015` | Dark purple, low opacity |
| Ripple peak | `#1a0035` | Slightly brighter, still very dark |
| Rare event flash | `#2a0055` | Brief, unsettling |
| Text (first visit only) | `#1a1a2e` | Barely readable, fades |

## First Visit Flow

1. Dark screen, silence
2. Fade in (slow, 2-3s): *"the void is listening"*
3. Below, smaller text fades in (1s delay): *"it needs your voice"*
4. User taps/clicks anywhere → `AudioContext.resume()` + `getUserMedia()` prompt
5. **Permission granted:** text fades out (1s), void goes live, ambient hum begins
6. **Permission denied:** text shifts to *"the void can still feel you"* → tap-to-scream synth mode
7. Subsequent visits: skip straight to active void (localStorage flag)

The browser's permission prompt is contextualised by the preceding text — the void is asking, not the browser.

## Progressive Enhancement Layers

### Layer 1: The Void Remembers

- `localStorage` counter: visit count + cumulative scream energy (sum of RMS peaks)
- Effects evolve imperceptibly over dozens of sessions:
  - Background hue shifts from pure dark toward very dark navy/purple
  - Echo decay time gradually lengthens
  - Ambient hum drops in pitch
  - Ripple ring count increases slightly
- None of this is surfaced or explained to the user

### Layer 2: Rare Events

- Low-probability triggers (1-2% chance per session), checked per scream:
  - A distant second echo that sounds like it came from somewhere else (panned, different reverb)
  - A momentary flicker/shape in the ripple field
  - The void "breathing" back unprompted after a long silence
  - A brief, almost subliminal vibration pattern (mobile)
- Must feel genuinely unsettling, never gamified

### Layer 3: Silence as Interaction

- Timer starts from last audio input spike above threshold
- After extended silence (30-60s), the void responds:
  - Ripple reverses direction (pulls inward toward centre)
  - Faint tonal shift in ambient hum (rises slightly in pitch)
  - Particle drift accelerates subtly
- Resets immediately when user makes sound
- The absence of input is itself an input

### Layer 4: Temporal Awareness

- Time-of-day: slightly different void texture at 3am vs noon
  - Late night (11pm-5am): deeper reverb, longer decay, cooler colour shift
  - Daytime: slightly shorter decay, marginally warmer undertone
- Seasonal: longer echo in winter months, slightly warmer ripple tones in summer
- All date-based, no API calls needed

### Layer 5: Volume Milestones

- If scream RMS exceeds a high threshold (calibrated per device):
  - Deeper, more resonant ripple
  - Longer echo tail
  - Brief crack of light from centre that immediately closes
  - Haptic burst on supported devices

## Accessibility

### Haptic Feedback

- `navigator.vibrate()` on Android devices
- Ripple intensity maps to vibration duration/pattern
- Echo decay maps to vibration pattern decay
- Volume milestones trigger distinct vibration bursts
- Provides meaningful experience for deaf/hard-of-hearing users

### Limitations

- iOS Safari does not support Vibration API — no haptic path available
- Could explore low-frequency audio output through device speakers as physical feedback substitute on iOS (experimental)
- The app is inherently audio-dependent; haptic is the primary alternative modality

### Reduced Motion

- Respect `prefers-reduced-motion` media query
- Reduce or disable particle drift and ripple animation
- Maintain audio experience unchanged

## Anti-Features (Intentional Omissions)

- No analytics or tracking
- No cookies beyond minimal localStorage for visit state and void memory
- No social sharing
- No leaderboard
- No recording or storage of screams
- No settings or configuration
- No branding beyond the URL
- *"The void doesn't track you. The void doesn't care."*

## Deployment

- **Platform:** PWA (Progressive Web App)
- **Hosting:** GitHub Pages (free TLS, trivial CI/CD)
- **Structure:** Single HTML file or minimal build
- **Requirements:** HTTPS (required for `getUserMedia`)
- **Manifest:** Minimal PWA manifest for home screen installation
- **Service Worker:** Cache-first for offline support (the void is always available)
- **Target URL:** `dannyockilson.github.io/the-void`
