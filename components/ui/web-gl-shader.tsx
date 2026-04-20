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
      r.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: false })
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
        // White line — no distortion, gentle amplitude
        targetY = 0.25
        targetDist = 0.0 // zero = all 3 lines overlap = white
      } else if (s === "recording") {
        // Lines split with audio
        targetY = 0.3 + audio * 0.5
        targetDist = 0.04 + audio * 0.1
      } else if (s === "summarizing") {
        // Lines gently converge back toward white, smooth and calm
        targetY = 0.3
        targetDist = 0.01 // nearly merged but hint of color
      } else {
        // Done: fully white, gentle
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
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ filter: "var(--shader-filter, none)" }}
      />
      {/* Dark overlays on left and right edges — fades the shader into the page bg */}
      <div className="absolute inset-y-0 left-0 w-[20%] bg-gradient-to-r from-[var(--bg-primary)] to-transparent" />
      <div className="absolute inset-y-0 right-0 w-[20%] bg-gradient-to-l from-[var(--bg-primary)] to-transparent" />
    </div>
  )
}
