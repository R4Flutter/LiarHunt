# Where the game's sounds come from

Chosen by ear by the owner on 8 November 2026, from Pixabay (Pixabay Content License: free for commercial use, no credit needed; the game credits them on the How to play page anyway). Each file was cut, levelled to a fixed gain and compressed with ffmpeg; the music loops crossfade their end into their start so they wrap without a jump.

| File in assets/audio | Original on Pixabay | Author | How it was made |
|---|---|---|---|
| `music-hq.mp3` | Crime Piano | leberch | whole piece, 0.4 s lead-in cut, 3.5 s loop crossfade, −18 LUFS, stereo 80 kbps |
| `music-case.mp3` | True Crime | AtlasAudio | same treatment |
| `music-rush.mp3` | Grey Colors (Tension Crime) | leberch | 3 s loop crossfade, −18 LUFS, 80 kbps |
| `precinct.mp3` | Police Station Atmosphere 2 | freesound_community | 45 s from 0:30, 3 s loop crossfade, −26 LUFS, mono 64 kbps |
| `harbor.mp3` | Foghorn and Gulls | Deborah_Wong | 1.5 s fade in, 2.5 s fade out, one-shot at HQ in Season 1 |
| `correct.mp3` | Brass Intro Podcast Show | DARIOCOIRO | first 3.15 s (cut at a natural pause), 0.4 s fade |
| `wrong.mp3` | Wah Wah Sad Trombone | freesound_community | silence trimmed |
| `twist.mp3` | Dramatic Sting | u_903n3qx7rq | as is |
| `stamp.mp3` | Traditional Stamp | freesound_community | the hit, 0.58 s |
| `cuffs.mp3` | Handcuffs | freesound_community | the first click, 0.8 s |
| `tap.mp3` | Paper Grab | soundsforstory | 0.4 s around the grab |
| `whoosh.mp3` | Paper Rustle | freesound_community | silence trimmed |
| `camera.mp3` | Camera Shutter | freesound_community | as is |
| `folder.mp3` | Document Folder Open-Close #2 | freesound_community | the first movement, 0.6 s |
| `pin.mp3` | Thumb Tack | freesound_community | the push, 0.5 s |
| `pen.mp3` | Writing With Pen | freesound_community | a 1.1 s scribble |
| `tick.mp3` | Slow Cinematic Clock Ticking | DRAGON-STUDIO | one tick, 0.28 s |
| `click.mp3` | (made for the game) | | the button click from before 7 Nov |

Peaks of the short sounds match the sounds they replaced (tap −8 dB, stamp −2.5, correct/wrong/twist −3.4, tick −9). The other effects (coin, star, combo, levelup, buy, achieve, timeout, fanfare, fail) were made for the game with `tools/elevenlabs-audio.mjs` / `tools/synth-audio.py`.

Where they play (js/audio.js `MOODS`, js/game.js, js/book.js): HQ = `music-hq` + `precinct`, and `harbor` now and then in Season 1; a case, a Career mission or a live room = `music-case`; Rush = `music-rush`; the last case of a Daily 5 = `music-rush`. A correct accusation plays stamp → cuffs → correct. Opening the Daily, the notebook or the dossier plays `folder`; ticking a fact or marking a suspect plays `pin`; a Daily 5 finding (moving to the next case) plays `pen`, and the next case's evidence plays `camera`; Career steps play `pen` (and `camera` when they find evidence), Career accusations play the arrest.

To swap a file, keep its name and bump `CACHE` in `sw.js`, or returning players keep the old one.
