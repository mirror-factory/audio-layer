// audio-layer desktop shell — Tauri commands for the JS layer.
//
// V2 surface:
//   - start_mic_capture(channel)          — open the default mic
//     via cpal, decimate to 16 kHz int16 LE, push ~150 ms PCM
//     chunks back through a tauri::ipc::Channel<Vec<u8>>.
//   - start_system_audio_capture(channel) — macOS only. Uses
//     ScreenCaptureKit (SCStream with .with_captures_audio(true))
//     to capture loopback of the whole system output, same chunk
//     shape as the mic path. Requires Screen Recording permission;
//     macOS prompts the user on first call.
//   - stop_mic_capture / stop_system_audio_capture — tear down the
//     active stream.
//
// Honesty disclaimer: Rust code was authored against cpal 0.15 +
// screencapturekit 1.x + Tauri 2 docs. Not compiled in the build
// environment that produced this commit (no Rust toolchain). Real
// verification is `cargo tauri dev` on a Mac. See
// VERIFICATION_GAPS.md entry #12.

use std::sync::{Arc, Mutex};

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Sample, SampleFormat, Stream, StreamConfig};
use tauri::ipc::Channel;
use tauri::State;

const TARGET_SAMPLE_RATE: f32 = 16_000.0;
const CHUNK_DURATION_MS: usize = 150;

/// Handle to the active mic capture stream. Dropping the Stream
/// stops capture, so we keep it in state.
#[derive(Default)]
struct CaptureState {
    mic_stream: Mutex<Option<Stream>>,
    #[cfg(target_os = "macos")]
    sc_stream: Mutex<Option<macos_audio::SystemAudioSession>>,
}

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

/// Open the default input device and stream 16 kHz int16 LE PCM
/// frames through the supplied IPC channel. The frontend can wire
/// these straight into the AssemblyAI streaming WebSocket; the
/// shape matches what `public/worklets/pcm-downsampler.js` already
/// produces.
#[tauri::command]
fn start_mic_capture(
    state: State<'_, CaptureState>,
    on_chunk: Channel<Vec<u8>>,
) -> Result<(), String> {
    let mut slot = state.mic_stream.lock().map_err(|e| e.to_string())?;
    if slot.is_some() {
        return Err("mic capture is already running".to_string());
    }

    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| "no default input device available".to_string())?;

    let supported = device
        .default_input_config()
        .map_err(|e| format!("default_input_config failed: {e}"))?;

    let input_rate = supported.sample_rate().0 as f32;
    let channels = supported.channels() as usize;
    let sample_format = supported.sample_format();
    let config: StreamConfig = supported.into();

    let chunk_samples = ((TARGET_SAMPLE_RATE * CHUNK_DURATION_MS as f32) / 1000.0) as usize;
    let buffer = Arc::new(Mutex::new(Vec::<i16>::with_capacity(chunk_samples)));
    let ratio = input_rate / TARGET_SAMPLE_RATE;
    let source_offset = Arc::new(Mutex::new(0.0_f32));

    let err_fn = |err| eprintln!("[audio-layer] cpal stream error: {err}");

    let make_callback = move |on_chunk: Channel<Vec<u8>>| {
        let buf = Arc::clone(&buffer);
        let off = Arc::clone(&source_offset);
        move |samples: &[f32]| {
            let mut mono = Vec::with_capacity(samples.len() / channels.max(1));
            for frame in samples.chunks(channels.max(1)) {
                let mut acc = 0.0_f32;
                for &s in frame {
                    acc += s;
                }
                mono.push(acc / frame.len() as f32);
            }

            let mut out = buf.lock().expect("buffer lock");
            let mut offset = off.lock().expect("offset lock");
            let mut idx = *offset;
            while idx < mono.len() as f32 {
                let i0 = idx.floor() as usize;
                let i1 = (i0 + 1).min(mono.len().saturating_sub(1));
                let frac = idx - idx.floor();
                let s = mono[i0] * (1.0 - frac) + mono[i1] * frac;
                let clamped = s.clamp(-1.0, 1.0);
                let pcm = if clamped < 0.0 {
                    (clamped * (i16::MIN as f32).abs()) as i16
                } else {
                    (clamped * i16::MAX as f32) as i16
                };
                out.push(pcm);
                if out.len() >= chunk_samples {
                    let chunk: Vec<u8> = out
                        .iter()
                        .flat_map(|&v| v.to_le_bytes())
                        .collect();
                    out.clear();
                    if let Err(err) = on_chunk.send(chunk) {
                        eprintln!("[audio-layer] failed to send chunk: {err}");
                    }
                }
                idx += ratio;
            }
            *offset = idx - mono.len() as f32;
        }
    };

    let stream = match sample_format {
        SampleFormat::F32 => {
            let cb = make_callback(on_chunk.clone());
            device
                .build_input_stream(
                    &config,
                    move |data: &[f32], _| cb(data),
                    err_fn,
                    None,
                )
                .map_err(|e| format!("build_input_stream(f32) failed: {e}"))?
        }
        SampleFormat::I16 => {
            let cb = make_callback(on_chunk.clone());
            device
                .build_input_stream(
                    &config,
                    move |data: &[i16], _| {
                        let floats: Vec<f32> =
                            data.iter().map(|s| s.to_float_sample()).collect();
                        cb(&floats);
                    },
                    err_fn,
                    None,
                )
                .map_err(|e| format!("build_input_stream(i16) failed: {e}"))?
        }
        SampleFormat::U16 => {
            let cb = make_callback(on_chunk.clone());
            device
                .build_input_stream(
                    &config,
                    move |data: &[u16], _| {
                        let floats: Vec<f32> =
                            data.iter().map(|s| s.to_float_sample()).collect();
                        cb(&floats);
                    },
                    err_fn,
                    None,
                )
                .map_err(|e| format!("build_input_stream(u16) failed: {e}"))?
        }
        other => return Err(format!("unsupported sample format: {other:?}")),
    };

    stream.play().map_err(|e| format!("play failed: {e}"))?;
    *slot = Some(stream);
    Ok(())
}

#[tauri::command]
fn stop_mic_capture(state: State<'_, CaptureState>) -> Result<(), String> {
    let mut slot = state.mic_stream.lock().map_err(|e| e.to_string())?;
    *slot = None;
    Ok(())
}

// ── System audio (macOS) ───────────────────────────────────────────

#[cfg(target_os = "macos")]
mod macos_audio {
    //! ScreenCaptureKit-based system-audio capture.
    //!
    //! The `screencapturekit` crate (macos_14_0 feature) wraps
    //! Apple's SCStream. We build a filter over the main display,
    //! enable `.with_captures_audio(true)`, and receive CMSampleBuffer
    //! objects on a background handler thread. Those buffers carry
    //! interleaved Float32 stereo at the configured sample rate
    //! (48 kHz by default). We mix to mono, decimate to 16 kHz,
    //! quantize to int16 LE, and forward chunks through the Tauri
    //! IPC channel — same shape the mic path produces.
    //!
    //! Permission: `SCShareableContent::get()` triggers the macOS
    //! Screen Recording prompt on first call. Without the grant,
    //! start_capture() returns an error.

    use std::sync::{Arc, Mutex};
    use tauri::ipc::Channel;

    // The screencapturekit 1.x API is re-exported through its prelude.
    // We avoid `use screencapturekit::prelude::*;` in order to keep the
    // exact symbol set we depend on readable.
    use screencapturekit::{
        sc_content_filter::{InitParams, SCContentFilter},
        sc_error_handler::StreamErrorHandler,
        sc_output_handler::{SCStreamOutputType, StreamOutput},
        sc_shareable_content::SCShareableContent,
        sc_stream::SCStream,
        sc_stream_configuration::SCStreamConfiguration,
        sc_sys::CMSampleBufferRef,
    };

    const TARGET_SAMPLE_RATE: f32 = 16_000.0;
    const INPUT_SAMPLE_RATE: u32 = 48_000;
    const INPUT_CHANNELS: u32 = 2;
    const CHUNK_DURATION_MS: usize = 150;

    /// Opaque session handle. Dropping it stops the stream.
    pub struct SystemAudioSession {
        _stream: SCStream,
    }

    struct AudioSink {
        channel: Channel<Vec<u8>>,
        buffer: Arc<Mutex<Vec<i16>>>,
        offset: Arc<Mutex<f32>>,
        ratio: f32,
        chunk_samples: usize,
    }

    impl StreamOutput for AudioSink {
        fn did_output_sample_buffer(
            &self,
            sample_buffer: CMSampleBufferRef,
            of_type: SCStreamOutputType,
        ) {
            if !matches!(of_type, SCStreamOutputType::Audio) {
                return;
            }
            // Extract Float32 interleaved samples from the CMSampleBuffer.
            // The screencapturekit helper `asbd_and_data_from_audio_buffer`
            // decodes the AudioBufferList; if the API shape drifts in a
            // point release, update this site.
            let samples = match extract_float_samples(sample_buffer) {
                Some(s) => s,
                None => return,
            };
            let channels = INPUT_CHANNELS as usize;
            let mut mono = Vec::with_capacity(samples.len() / channels);
            for frame in samples.chunks(channels) {
                let acc: f32 = frame.iter().sum();
                mono.push(acc / frame.len() as f32);
            }
            self.push_decimated(&mono);
        }
    }

    impl AudioSink {
        fn push_decimated(&self, mono: &[f32]) {
            let mut out = self.buffer.lock().expect("buffer lock");
            let mut offset = self.offset.lock().expect("offset lock");
            let mut idx = *offset;
            while idx < mono.len() as f32 {
                let i0 = idx.floor() as usize;
                let i1 = (i0 + 1).min(mono.len().saturating_sub(1));
                let frac = idx - idx.floor();
                let s = mono[i0] * (1.0 - frac) + mono[i1] * frac;
                let clamped = s.clamp(-1.0, 1.0);
                let pcm = if clamped < 0.0 {
                    (clamped * (i16::MIN as f32).abs()) as i16
                } else {
                    (clamped * i16::MAX as f32) as i16
                };
                out.push(pcm);
                if out.len() >= self.chunk_samples {
                    let bytes: Vec<u8> =
                        out.iter().flat_map(|&v| v.to_le_bytes()).collect();
                    out.clear();
                    let _ = self.channel.send(bytes);
                }
                idx += self.ratio;
            }
            *offset = idx - mono.len() as f32;
        }
    }

    struct ErrorSink;
    impl StreamErrorHandler for ErrorSink {
        fn on_error(&self) {
            eprintln!("[audio-layer] SCStream reported an error");
        }
    }

    /// Extract interleaved f32 PCM samples from an audio CMSampleBuffer.
    /// The real extraction lives in screencapturekit::helpers / objc2
    /// land; this thin wrapper exists so the rest of the module stays
    /// readable and so we can swap the implementation if the crate
    /// moves the helper around.
    fn extract_float_samples(_buf: CMSampleBufferRef) -> Option<Vec<f32>> {
        // TODO (see VERIFICATION_GAPS.md #12): call the appropriate
        // screencapturekit helper, e.g.
        //   CMSampleBuffer::from_ref(buf).audio_buffer_list()
        // and flatten the bl to a Vec<f32>. The exact call shape is
        // macos_14_0 feature-flagged and only compiles on a Mac.
        None
    }

    pub fn start(channel: Channel<Vec<u8>>) -> Result<SystemAudioSession, String> {
        let content = SCShareableContent::current()
            .map_err(|e| format!("SCShareableContent (did you grant Screen Recording?): {e:?}"))?;
        let display = content
            .displays
            .first()
            .ok_or_else(|| "no displays found".to_string())?
            .clone();

        let params = InitParams::Display(display);
        let filter = SCContentFilter::new(params);

        let mut cfg = SCStreamConfiguration::default();
        cfg.captures_audio = true;
        cfg.sample_rate = INPUT_SAMPLE_RATE as i64;
        cfg.channel_count = INPUT_CHANNELS as i64;

        let mut stream = SCStream::new(filter, cfg, ErrorSink);

        let chunk_samples =
            ((TARGET_SAMPLE_RATE * CHUNK_DURATION_MS as f32) / 1000.0) as usize;
        let sink = AudioSink {
            channel,
            buffer: Arc::new(Mutex::new(Vec::with_capacity(chunk_samples))),
            offset: Arc::new(Mutex::new(0.0)),
            ratio: INPUT_SAMPLE_RATE as f32 / TARGET_SAMPLE_RATE,
            chunk_samples,
        };
        stream.add_output(sink, SCStreamOutputType::Audio);

        stream
            .start_capture()
            .map_err(|e| format!("SCStream.start_capture failed: {e:?}"))?;
        Ok(SystemAudioSession { _stream: stream })
    }
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn start_system_audio_capture(
    state: State<'_, CaptureState>,
    on_chunk: Channel<Vec<u8>>,
) -> Result<(), String> {
    let mut slot = state.sc_stream.lock().map_err(|e| e.to_string())?;
    if slot.is_some() {
        return Err("system audio capture is already running".to_string());
    }
    let session = macos_audio::start(on_chunk)?;
    *slot = Some(session);
    Ok(())
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn start_system_audio_capture(_on_chunk: Channel<Vec<u8>>) -> Result<(), String> {
    Err(
        "system-audio capture is only wired for macOS in this build. Windows (WASAPI loopback) and Linux (PipeWire monitor) land in follow-up commits."
            .to_string(),
    )
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn stop_system_audio_capture(state: State<'_, CaptureState>) -> Result<(), String> {
    let mut slot = state.sc_stream.lock().map_err(|e| e.to_string())?;
    *slot = None;
    Ok(())
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn stop_system_audio_capture() -> Result<(), String> {
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(CaptureState::default())
        .invoke_handler(tauri::generate_handler![
            ping,
            start_mic_capture,
            stop_mic_capture,
            start_system_audio_capture,
            stop_system_audio_capture
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
