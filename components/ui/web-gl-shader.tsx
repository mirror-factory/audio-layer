"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

type ShaderState = "idle" | "recording" | "summarizing" | "done"

interface WebGLShaderProps {
  audioLevel?: number
  state?: ShaderState
  className?: string
}

export function WebGLShader({
  audioLevel = 0,
  state = "idle",
  className = "",
}: WebGLShaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const refs = useRef<{
    scene: THREE.Scene | null
    camera: THREE.OrthographicCamera | null
    renderer: THREE.WebGLRenderer | null
    mesh: THREE.Mesh | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uniforms: Record<string, { value: any }> | null
    animationId: number | null
  }>({
    scene: null, camera: null, renderer: null,
    mesh: null, uniforms: null, animationId: null,
  })

  const audioRef = useRef(0)
  const smoothAudioRef = useRef(0)
  const stateRef = useRef<ShaderState>("idle")
  useEffect(() => { audioRef.current = audioLevel }, [audioLevel])
  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return
    const canvas = canvasRef.current
    const container = containerRef.current
    const r = refs.current

    const vertexShader = `
      attribute vec3 position;
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;
      uniform float lightMode;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

        float d = length(p) * distortion;

        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);

        float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);

        float intensity = max(r, max(g, b));
        float a = smoothstep(0.08, 0.45, intensity);

        if (lightMode > 0.5) {
          float mint = clamp(intensity * 0.34, 0.0, 1.0);
          float glow = smoothstep(0.03, 0.30, intensity);
          vec3 teal = vec3(0.06, 0.52, 0.46);
          vec3 highlight = vec3(0.30, 0.88, 0.80);
          vec3 color = mix(teal, highlight, smoothstep(0.7, 1.8, intensity) * 0.28);
          gl_FragColor = vec4(color * (0.48 + mint * 0.52), glow * 0.58);
        } else {
          gl_FragColor = vec4(r, g, b, a);
        }
      }
    `

    const initScene = () => {
      r.scene = new THREE.Scene()
      r.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: "low-power",
        antialias: false,
      })
      // Cap at 2x DPR — 3x devices (iPhone Pro) waste GPU for negligible sharpness gain
      r.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      r.renderer.setClearColor(new THREE.Color(0x000000), 0)
      r.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)

      const isLight = document.documentElement.classList.contains("light")
      r.uniforms = {
        resolution: { value: [100, 100] },
        time: { value: 0.0 },
        xScale: { value: 1.0 },
        yScale: { value: 0.3 },
        distortion: { value: 0.05 },
        lightMode: { value: isLight ? 1.0 : 0.0 },
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
        -1, -1, 0, 1, -1, 0, -1, 1, 0,
        1, -1, 0, -1, 1, 0, 1, 1, 0,
      ]), 3))

      r.mesh = new THREE.Mesh(geometry, new THREE.RawShaderMaterial({
        vertexShader, fragmentShader,
        uniforms: r.uniforms, side: THREE.DoubleSide,
      }))
      r.scene.add(r.mesh)
      handleResize()
    }

    const animate = () => {
      if (!r.uniforms) { r.animationId = requestAnimationFrame(animate); return }

      // Track theme changes in real-time
      const isLightNow = document.documentElement.classList.contains("light") ? 1.0 : 0.0
      r.uniforms.lightMode.value += (isLightNow - r.uniforms.lightMode.value) * 0.1

      const s = stateRef.current
      smoothAudioRef.current += (audioRef.current - smoothAudioRef.current) * 0.06
      const audio = smoothAudioRef.current

      // Speed per state
      if (s === "idle") {
        r.uniforms.time.value += 0.004 // gentle slow drift
      } else if (s === "recording") {
        r.uniforms.time.value += 0.01
      } else if (s === "summarizing") {
        r.uniforms.time.value += 0.006 // calm, not frantic
      } else {
        r.uniforms.time.value += 0.003
      }

      let targetY: number, targetDist: number
      if (s === "idle") {
        targetY = 0.3
        targetDist = 0.035
      } else if (s === "recording") {
        targetY = 0.3 + audio * 0.5
        targetDist = 0.04 + audio * 0.1
      } else if (s === "summarizing") {
        targetY = 0.3
        targetDist = 0.01
      } else {
        targetY = 0.2
        targetDist = 0.0
      }

      // xScale stays at 1.0 always — no frantic frequency changes
      r.uniforms.xScale.value += (1.0 - r.uniforms.xScale.value) * 0.03

      const lerp = 0.04
      r.uniforms.yScale.value += (targetY - r.uniforms.yScale.value) * lerp
      r.uniforms.distortion.value += (targetDist - r.uniforms.distortion.value) * lerp

      if (r.renderer && r.scene && r.camera) {
        r.renderer.render(r.scene, r.camera)
      }
      r.animationId = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      if (!r.renderer || !r.uniforms) return
      const rect = container.getBoundingClientRect()
      r.renderer.setSize(rect.width, rect.height, false)
      r.uniforms.resolution.value = [rect.width, rect.height]
    }

    initScene()
    animate()
    const ro = new ResizeObserver(handleResize)
    ro.observe(container)

    // Pause rendering when app is backgrounded (saves battery on mobile)
    const handleVisibility = () => {
      if (document.hidden) {
        if (r.animationId) cancelAnimationFrame(r.animationId)
        r.animationId = null
      } else {
        if (!r.animationId) r.animationId = requestAnimationFrame(animate)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      if (r.animationId) cancelAnimationFrame(r.animationId)
      document.removeEventListener("visibilitychange", handleVisibility)
      ro.disconnect()
      if (r.mesh) {
        r.scene?.remove(r.mesh)
        r.mesh.geometry.dispose()
        if (r.mesh.material instanceof THREE.Material) r.mesh.material.dispose()
      }
      r.renderer?.dispose()
    }
  }, [])

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`} style={{ pointerEvents: "none" }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          filter: "var(--shader-filter, none)",
          opacity: "var(--shader-canvas-opacity, 1)",
        }}
      />
      {/* Fade overlays — all four edges blend into page bg */}
      <div className="absolute inset-y-0 left-0 w-[20%] bg-gradient-to-r from-[var(--wave-edge-bg)] to-transparent" />
      <div className="absolute inset-y-0 right-0 w-[20%] bg-gradient-to-l from-[var(--wave-edge-bg)] to-transparent" />
      <div className="absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-[var(--wave-edge-bg)] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-[var(--wave-edge-bg)] to-transparent" />
    </div>
  )
}
