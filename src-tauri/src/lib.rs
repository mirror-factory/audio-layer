// audio-layer desktop shell — Tauri commands for the JS layer.
//
// V2 surface:
//   - start_mic_capture(channel)          — open the default mic
//     via cpal, decimate to 16 kHz int16 LE, push ~150 ms PCM
//     chunks back through a tauri::ipc::Channel<Vec<u8>>.
//   - start_system_audio_capture(channel) — macOS only. Uses
//     ScreenCaptureKit (SCStream with captures_audio) to capture
//     loopback of the whole system output, same chunk shape as
//     the mic path.
//   - stop_mic_capture / stop_system_audio_capture — tear down the
//     active stream.

use std::sync::{Arc, Mutex};

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Sample, SampleFormat, StreamConfig};
use tauri::ipc::Channel;
use tauri::State;

const TARGET_SAMPLE_RATE: f32 = 16_000.0;
const CHUNK_DURATION_MS: usize = 150;

/// Wrapper around `cpal::Stream` to make it `Send + Sync`.
/// cpal::Stream uses platform-specific handles that aren't marked
/// Send, but we only access them behind a Mutex and on one thread.
struct SendStream(cpal::Stream);
unsafe impl Send for SendStream {}
unsafe impl Sync for SendStream {}

/// Handle to the active mic capture stream. Dropping the stream
/// stops capture, so we keep it in state.
struct CaptureState {
    mic_stream: Mutex<Option<SendStream>>,
    #[cfg(target_os = "macos")]
    sc_stream: Mutex<Option<macos_audio::SystemAudioSession>>,
}

impl Default for CaptureState {
    fn default() -> Self {
        CaptureState {
            mic_stream: Mutex::new(None),
            #[cfg(target_os = "macos")]
            sc_stream: Mutex::new(None),
        }
    }
}

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

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
    *slot = Some(SendStream(stream));
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
    //! ScreenCaptureKit-based system-audio capture (macOS 14+).
    //!
    //! Uses the `screencapturekit` crate v1.5.x prelude API.

    use std::sync::{Arc, Mutex};
    use tauri::ipc::Channel;

    use screencapturekit::prelude::*;
    use screencapturekit::cm::CMSampleBuffer;

    const TARGET_SAMPLE_RATE: f32 = 16_000.0;
    const INPUT_SAMPLE_RATE: u32 = 48_000;
    const INPUT_CHANNELS: u32 = 2;
    const CHUNK_DURATION_MS: usize = 150;

    /// Opaque session handle. Dropping it stops the stream.
    pub struct SystemAudioSession {
        _stream: SCStream,
    }

    // SCStream isn't marked Send but we only hold it behind a Mutex.
    unsafe impl Send for SystemAudioSession {}
    unsafe impl Sync for SystemAudioSession {}

    struct AudioSink {
        channel: Channel<Vec<u8>>,
        buffer: Arc<Mutex<Vec<i16>>>,
        offset: Arc<Mutex<f32>>,
        ratio: f32,
        chunk_samples: usize,
    }

    impl SCStreamOutputTrait for AudioSink {
        fn did_output_sample_buffer(
            &self,
            sample_buffer: CMSampleBuffer,
            of_type: SCStreamOutputType,
        ) {
            if !matches!(of_type, SCStreamOutputType::Audio) {
                return;
            }
            // TODO: extract float samples from CMSampleBuffer.
            // The exact API depends on the screencapturekit version;
            // for now this is a stub that compiles. Real audio
            // extraction lands when we verify on hardware.
            let _ = sample_buffer;
        }
    }

    impl AudioSink {
        #[allow(dead_code)]
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

    pub fn start(channel: Channel<Vec<u8>>) -> Result<SystemAudioSession, String> {
        let content = SCShareableContent::get()
            .map_err(|e| format!("SCShareableContent (grant Screen Recording?): {e:?}"))?;
        let display = content
            .displays()
            .first()
            .ok_or_else(|| "no displays found".to_string())?
            .clone();

        let filter = SCContentFilter::create()
            .with_display(&display)
            .build();

        let mut cfg = SCStreamConfiguration::default();
        cfg.set_captures_audio(true);
        cfg.set_sample_rate(INPUT_SAMPLE_RATE as i32);
        cfg.set_channel_count(INPUT_CHANNELS as i32);

        let mut stream = SCStream::new(&filter, &cfg);

        let chunk_samples =
            ((TARGET_SAMPLE_RATE * CHUNK_DURATION_MS as f32) / 1000.0) as usize;
        let sink = AudioSink {
            channel,
            buffer: Arc::new(Mutex::new(Vec::with_capacity(chunk_samples))),
            offset: Arc::new(Mutex::new(0.0)),
            ratio: INPUT_SAMPLE_RATE as f32 / TARGET_SAMPLE_RATE,
            chunk_samples,
        };
        stream.add_output_handler(sink, SCStreamOutputType::Audio);

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
    Err("system-audio capture is only wired for macOS".to_string())
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
