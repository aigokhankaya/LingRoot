# Local FFmpeg render

## Purpose

FFmpeg is the primary production renderer. It creates each 1080x1920 MP4 on
the machine running Video Factory, so the six level renders consume no cloud
render credits and do not need signed asset URLs.

The renderer receives only package-local files:

- the shared scene images in `common/images/`
- that level's downloaded `audio.mp3`
- that level's generated `subtitles.srt`

It scales and crops each image to portrait, applies the level-specific scene
timeline, burns SRT subtitles and the CEFR badge, then muxes AAC audio into an
H.264/yuv420p MP4. The audio duration is the output ceiling.

## Configuration

```text
RENDER_PROVIDER=ffmpeg
FFMPEG_PATH=ffmpeg
FFMPEG_CRF=23
FFMPEG_PRESET=veryfast
```

`FFMPEG_CRF` accepts `0` through `51`; lower values improve quality while
increasing CPU time and output size. `23` with `veryfast` is the default local
cost/quality balance for the educational short-video format.
`FFMPEG_PRESET` accepts `ultrafast`, `superfast`, `veryfast`, `faster`, `fast`,
`medium` or `slow`.

## Machine requirements

`FFMPEG_PATH` must point to an FFmpeg build with these filters:

- `subtitles` (libass) for burned-in SRT captions
- `drawtext` (libfreetype) for the CEFR badge
- `libx264` and AAC encoding for YouTube-compatible MP4 output

`ffprobe` is also required for final media QA. Run `npm run preflight` before a
real run; it verifies the configured FFmpeg binary and both filters without
creating a video.

## Cost boundary

Local rendering removes JSON2Video usage and its per-render cost. LingRoot
TTS/topic generation, OpenAI image generation and optional Supabase archival
storage remain independently configured services. With `STORAGE_PROVIDER=local`,
the workflow also keeps its mirrored assets under the project directory.

## JSON2Video fallback

Set `RENDER_PROVIDER=json2video` only when a remote renderer is required.
That mode requires `STORAGE_PROVIDER=supabase`, `JSON2VIDEO_API_KEY`, and
short-lived signed URLs. The separate [JSON2Video integration](json2video-render.md)
documents its paid, asynchronous flow.
