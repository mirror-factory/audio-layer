/**
 * PCM Downsampler AudioWorklet
 *
 * Runs in the AudioWorklet thread (no DOM, no imports). Receives audio
 * at the native sample rate (typically 44.1kHz or 48kHz), decimates to
 * 16kHz int16 LE PCM, and sends ~150ms chunks via port.postMessage.
 *
 * AssemblyAI streaming requires 16kHz int16 LE. Sending higher rates
 * wastes bandwidth and can confuse the transcriber.
 *
 * Anti-alias: a simple linear interpolation decimator is used. For
 * production quality, a biquad lowpass at 7kHz should be applied
 * upstream (the LiveRecorder component does this via BiquadFilterNode).
 */

const TARGET_RATE = 16000;
const CHUNK_DURATION_MS = 150;

class PcmDownsampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._chunkSize = Math.floor((TARGET_RATE * CHUNK_DURATION_MS) / 1000);
    this._ratio = sampleRate / TARGET_RATE;
    this._offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const samples = input[0]; // mono channel

    for (let i = 0; i < samples.length; i++) {
      this._offset += 1;
      if (this._offset >= this._ratio) {
        this._offset -= this._ratio;

        // Linear interpolation between adjacent samples
        const idx = Math.min(i, samples.length - 1);
        const prev = i > 0 ? samples[i - 1] : samples[i];
        const frac = this._offset / this._ratio;
        const interpolated = prev + (samples[idx] - prev) * frac;

        // Clamp to [-1, 1] and convert to int16
        const clamped = Math.max(-1, Math.min(1, interpolated));
        const int16 = Math.round(clamped * 32767);
        this._buffer.push(int16);

        if (this._buffer.length >= this._chunkSize) {
          this._flush();
        }
      }
    }

    return true;
  }

  _flush() {
    if (this._buffer.length === 0) return;

    const buf = new ArrayBuffer(this._buffer.length * 2);
    const view = new DataView(buf);
    for (let i = 0; i < this._buffer.length; i++) {
      view.setInt16(i * 2, this._buffer[i], true); // little-endian
    }

    this.port.postMessage(buf, [buf]);
    this._buffer = [];
  }
}

registerProcessor("pcm-downsampler", PcmDownsampler);
