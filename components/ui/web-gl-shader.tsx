"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

type ShaderState = "idle" | "recording" | "summarizing" | "done"

interface WebGLShaderProps {
  /** 0-1: real-time audio energy from mic RMS */
  audioLevel?: number
  /** Controls animation phase */
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
  const smoothAudioRef = useRef(0) // smoothed audio for organic movement
  const stateRef = useRef<ShaderState>("idle")
  useEffect(() => { audioRef.current = audioLevel }, [audioLevel])
  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const container = containerRef.current
    const r = refs.current

    // ORIGINAL shader from shadcn — kept exactly as installed
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

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

        float d = length(p) * distortion;

        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);

        float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);

        float a = clamp(max(r, max(g, b)), 0.0, 1.0);
        gl_FragColor = vec4(r, g, b, a);
      }
    `

    const initScene = () => {
      r.scene = new THREE.Scene()
      r.renderer = new THREE.WebGLRenderer({ canvas, alpha: true })
      r.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      r.renderer.setClearColor(new THREE.Color(0x000000), 0)

      r.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)

      r.uniforms = {
        resolution: { value: [100, 100] },
        time: { value: 0.0 },
        xScale: { value: 1.0 },
        yScale: { value: 0.3 },
        distortion: { value: 0.05 },
      }

      const positions = new THREE.BufferAttribute(new Float32Array([
        -1, -1, 0, 1, -1, 0, -1, 1, 0,
        1, -1, 0, -1, 1, 0, 1, 1, 0,
      ]), 3)
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute("position", positions)

      const material = new THREE.RawShaderMaterial({
        vertexShader, fragmentShader,
        uniforms: r.uniforms,
        side: THREE.DoubleSide,
      })

      r.mesh = new THREE.Mesh(geometry, material)
      r.scene.add(r.mesh)
      handleResize()
    }

    const animate = () => {
      if (!r.uniforms) { r.animationId = requestAnimationFrame(animate); return }

      const s = stateRef.current

      // Smooth the raw audio level for organic, fluid movement
      // Heavy smoothing (0.06) = slow rise, slow fall, no jumpiness
      smoothAudioRef.current += (audioRef.current - smoothAudioRef.current) * 0.06
      const audio = smoothAudioRef.current

      // Speed
      const speed = s === "summarizing" ? 0.025 : s === "recording" ? 0.012 : s === "done" ? 0.005 : 0.008
      r.uniforms.time.value += speed

      // Target shader params based on state + audio
      let targetY: number, targetDist: number
      if (s === "recording") {
        targetY = 0.3 + audio * 0.5
        targetDist = 0.05 + audio * 0.1
      } else if (s === "summarizing") {
        targetY = 0.5
        targetDist = 0.03
        r.uniforms.xScale.value += (2.0 - r.uniforms.xScale.value) * 0.02
      } else if (s === "done") {
        targetY = 0.15
        targetDist = 0.0
      } else {
        targetY = 0.3
        targetDist = 0.05
      }

      if (s !== "summarizing") {
        r.uniforms.xScale.value += (1.0 - r.uniforms.xScale.value) * 0.03
      }

      // Very gentle interpolation for organic, fluid transitions
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

    return () => {
      if (r.animationId) cancelAnimationFrame(r.animationId)
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
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
}
