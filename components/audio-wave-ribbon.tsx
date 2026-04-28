"use client";

import { useEffect, useRef } from "react";

interface AudioWaveRibbonProps {
  active?: boolean;
  stream?: MediaStream | null;
  height?: number;
  sensitivity?: number;
  motion?: number;
  audioLevel?: number;
  texture?: "clean" | "mesh";
  className?: string;
}

type BrowserAudioContext = typeof AudioContext;

function getAudioContextCtor(): BrowserAudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: BrowserAudioContext })
      .webkitAudioContext
  );
}

export function AudioWaveRibbon({
  active = false,
  stream = null,
  height = 126,
  sensitivity = 1,
  motion = 1,
  audioLevel = 0,
  texture = "clean",
  className = "",
}: AudioWaveRibbonProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const levelRef = useRef(audioLevel);

  useEffect(() => {
    levelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let frameId = 0;
    let disposed = false;
    let smoothedLevel = 0;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * ratio));
      const nextHeight = Math.max(1, Math.floor(rect.height * ratio));
      if (canvas.width !== width || canvas.height !== nextHeight) {
        canvas.width = width;
        canvas.height = nextHeight;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);
    resizeCanvas();

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let samples: Uint8Array<ArrayBuffer> | null = null;

    const AudioContextCtor = getAudioContextCtor();
    if (stream && AudioContextCtor) {
      try {
        audioContext = new AudioContextCtor();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        samples = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      } catch {
        audioContext = null;
        analyser = null;
        source = null;
        samples = null;
      }
    }

    const readStreamLevel = () => {
      if (!analyser || !samples) return 0;
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i += 1) {
        const value = (samples[i] - 128) / 128;
        sum += value * value;
      }
      return Math.min(1, Math.sqrt(sum / samples.length) * 4);
    };

    const drawRibbon = (time: number) => {
      if (disposed) return;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const visualHeight = rect.height;
      if (width <= 0 || visualHeight <= 0) {
        frameId = window.requestAnimationFrame(drawRibbon);
        return;
      }

      const externalLevel = Math.max(levelRef.current, readStreamLevel());
      const targetLevel = active
        ? externalLevel
        : Math.max(0.12, externalLevel * 0.28);
      smoothedLevel += (targetLevel - smoothedLevel) * (active ? 0.12 : 0.055);

      const reducedMotion = motionQuery.matches;
      const seconds = reducedMotion ? 0 : time / 1000;
      const energy = Math.min(1, smoothedLevel * sensitivity + (active ? 0.08 : 0));
      const centerY = visualHeight * 0.5;
      const motionAmount = reducedMotion ? 0 : Math.max(0.25, motion);
      const baseAmplitude =
        visualHeight * (active ? 0.086 : 0.088) * Math.min(1.48, motionAmount);
      const soundAmplitude = visualHeight * 0.15 * energy;
      const breath =
        0.93 + 0.07 * Math.sin(seconds * (active ? 2.4 : 0.95) * motionAmount);
      const amplitude = (baseAmplitude + soundAmplitude) * breath;
      const ridgeStrength = 7 + energy * 22 + (active ? 3 : 1.4) * motionAmount;
      const phaseA = seconds * (active ? 1.9 : 0.82) * motionAmount;
      const phaseB = seconds * (active ? 2.9 : 1.08) * motionAmount;
      const phaseC = seconds * (active ? 1.2 : 0.52) * motionAmount;
      const cleanTexture = texture === "clean";

      ctx.clearRect(0, 0, width, visualHeight);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const yAt = (x: number, offset = 0) => {
        const normalized = x / Math.max(width, 1);
        const liquidDrift =
          Math.sin(seconds * 0.18 * motionAmount + offset * 0.12) * 0.035;
        const driftFrequency = cleanTexture ? 1.62 : 2.15;
        const weaveFrequency = cleanTexture ? 4.15 : 6.8;
        const fineFrequency = cleanTexture ? 8.8 : 18;
        const drift = Math.sin(
          (normalized + liquidDrift) * Math.PI * driftFrequency +
            phaseA * (cleanTexture ? 0.72 : 1) +
            offset,
        );
        const weave = Math.sin(
          (normalized - liquidDrift * 0.6) * Math.PI * weaveFrequency -
            phaseB * (cleanTexture ? 0.68 : 1) +
            offset * (cleanTexture ? 0.55 : 0.7),
        );
        const fine = Math.sin(
          normalized * Math.PI * fineFrequency +
            phaseA * (cleanTexture ? 0.58 : 1.3) +
            offset * 0.18,
        );
        const undertow =
          Math.sin(
            (normalized + liquidDrift * 0.45) *
              Math.PI *
              (cleanTexture ? 0.86 : 1.15) -
              phaseC +
              offset * 0.4,
          ) *
          amplitude *
          (cleanTexture ? 0.16 : 0.1) *
          motionAmount;
        return (
          centerY +
          drift * amplitude * (cleanTexture ? 0.56 : 0.68) +
          weave * amplitude * (cleanTexture ? 0.34 : 0.3) +
          fine * amplitude * (cleanTexture ? 0.035 : 0.08) +
          undertow
        );
      };

      const buildPoints = (offset: number) => {
        const points: Array<{ x: number; y: number }> = [];
        const step = cleanTexture ? 13 : 8;
        for (let x = -step; x <= width + step; x += step) {
          points.push({ x, y: yAt(x, offset) });
        }
        return points;
      };

      const drawWave = (
        offset: number,
        color: string,
        lineWidth: number,
        alpha = 1,
      ) => {
        const points = buildPoints(offset);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let i = 0; i < points.length - 1; i += 1) {
          const p0 = points[i - 1] ?? points[i];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[i + 2] ?? p2;
          if (i === 0) {
            ctx.moveTo(p1.x, p1.y);
          }
          ctx.bezierCurveTo(
            p1.x + (p2.x - p0.x) / 6,
            p1.y + (p2.y - p0.y) / 6,
            p2.x - (p3.x - p1.x) / 6,
            p2.y - (p3.y - p1.y) / 6,
            p2.x,
            p2.y,
          );
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.restore();
      };

      ctx.save();
      ctx.filter = "blur(18px)";
      drawWave(0.9, "rgba(99, 102, 241, 0.28)", 28 + energy * 24, 0.86);
      drawWave(2.2, "rgba(196, 181, 253, 0.24)", 22 + energy * 18, 0.78);
      drawWave(-1.4, "rgba(52, 211, 153, 0.18)", 20 + energy * 14, 0.68);
      ctx.restore();

      if (texture === "mesh") {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        for (let x = 10; x < width - 10; x += active ? 7 : 10) {
          const y = yAt(x);
          const yPrev = yAt(x - 2);
          const yNext = yAt(x + 2);
          const tangentY = yNext - yPrev;
          const normalX = -tangentY;
          const normalY = 4;
          const normalLength = Math.max(1, Math.hypot(normalX, normalY));
          const nx = normalX / normalLength;
          const ny = normalY / normalLength;
          const pulse =
            0.55 +
            0.45 *
              Math.sin(
                x * 0.055 + seconds * (active ? 8.2 : 3.4) * motionAmount,
              );
          const ridgeLength = ridgeStrength * pulse + 1.5;
          ctx.beginPath();
          ctx.moveTo(x - nx * ridgeLength, y - ny * ridgeLength);
          ctx.lineTo(x + nx * ridgeLength, y + ny * ridgeLength);
          ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 + energy * 0.12})`;
          ctx.lineWidth = active ? 0.68 : 0.42;
          ctx.stroke();
        }
        ctx.restore();
      }

      drawWave(1.3, "rgba(196, 181, 253, 0.58)", 3.2 + energy * 1.8, 0.88);
      drawWave(-0.8, "rgba(52, 211, 153, 0.48)", 2.5 + energy * 1.6, 0.76);
      drawWave(0, "rgba(15, 23, 42, 0.2)", 9 + energy * 3, 0.3);
      drawWave(0, "rgba(99, 102, 241, 0.9)", 2.1 + energy * 1.7, 0.96);
      drawWave(0.18, "rgba(255, 255, 255, 0.76)", 0.9, 0.86);

      if (texture === "mesh") {
        ctx.save();
        for (let x = 8; x < width; x += 14) {
          const y = yAt(x, 0.12);
          const dotPulse =
            0.65 + 0.35 * Math.sin(x * 0.08 - seconds * 3.35 * motionAmount);
          ctx.beginPath();
          ctx.arc(x, y, 0.7 + energy * 0.65 * dotPulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(11, 18, 32, ${0.12 + energy * 0.16})`;
          ctx.fill();
        }
        ctx.restore();
      }

      frameId = window.requestAnimationFrame(drawRibbon);
    };

    frameId = window.requestAnimationFrame(drawRibbon);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      try {
        source?.disconnect();
        analyser?.disconnect();
        void audioContext?.close();
      } catch {
        // The ribbon is decorative, so teardown failures should not affect recording.
      }
    };
  }, [active, height, motion, sensitivity, stream, texture]);

  return (
    <div
      className={`audio-wave-ribbon ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="audio-wave-ribbon__canvas" />
    </div>
  );
}

export default AudioWaveRibbon;
