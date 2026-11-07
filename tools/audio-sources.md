# Where the game's sounds come from

Everything here is CC0 (public domain): free for commercial use, no credit required. The game credits them on the How to play page anyway. Licences were checked on each page on 7 November 2026.

| File in assets/audio | Original | Author | Source | Processing |
|---|---|---|---|---|
| `music-case.mp3` | Unsolved Investigation (seamless loop) | isaiah658 | https://opengameart.org/content/unsolved-investigation | loudnorm −18 LUFS, stereo MP3 96 kbps |
| `music-hq.mp3` | Stay Around | Alex McCulloch (Pro Sensory) | https://opengameart.org/node/80256 | 1.5 s fade in, 3.5 s fade out for the loop, loudnorm −18 LUFS, MP3 80 kbps |
| `music-rush.mp3` | Suspicious Loop (`sus_corner_loop.mp3`) | Hazmat Harry | https://opengameart.org/content/suspicious-loop | loudnorm −18 LUFS, MP3 96 kbps |
| `rain.mp3` | Rain on Window Loop | alxl | https://opengameart.org/content/rain-on-window-loop | loudnorm −24 LUFS, mono MP3 64 kbps |
| `tap.mp3` | `select_001.ogg` from Interface Sounds | Kenney | https://kenney.nl/assets/interface-sounds | −7 dB (matches the old tap's peak), mono 64 kbps |
| `click.mp3` | `click_001.ogg` from Interface Sounds | Kenney | same | −8.5 dB, mono 64 kbps |
| `whoosh.mp3` | `maximize_001.ogg` from Interface Sounds | Kenney | same | −8 dB, mono 64 kbps |

The other sound effects were made for the game (`tools/elevenlabs-audio.mjs`, `tools/synth-audio.py`).

To swap a track, drop a new MP3 in `assets/audio/` with the same name. Moods (in `js/audio.js`): HQ and results play `music-hq`; a case plays `music-case` with rain under it; Rush plays `music-rush`; the Daily 5 verdict plays `music-case` with louder rain.
