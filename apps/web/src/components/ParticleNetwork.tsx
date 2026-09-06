/* eslint-disable react-hooks/purity, react-hooks/immutability, react-hooks/exhaustive-deps */
// Imperative WebGL particle simulation: typed-array buffers are intentionally
// mutated in place inside the r3f render loop for performance.
import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = typeof window !== 'undefined' && window.innerWidth < 768 ? 400 : 800
const CONNECTION_DIST = 2.5

function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const linesRef = useRef<THREE.LineSegments>(null)

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const vel = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10
      vel[i * 3] = (Math.random() - 0.5) * 0.002
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.002
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002
    }
    return { positions: pos, velocities: vel }
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const linePositions = useMemo(() => new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6), [])
  const lineColors = useMemo(() => new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6), [])

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(linePositions.slice(0, 0), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(lineColors.slice(0, 0), 3))
    return geo
  }, [])

  useEffect(() => {
    if (linesRef.current) {
      linesRef.current.geometry = lineGeometry
    }
  }, [lineGeometry])

  useFrame(() => {
    if (!meshRef.current) return

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] += velocities[i * 3]
      positions[i * 3 + 1] += velocities[i * 3 + 1]
      positions[i * 3 + 2] += velocities[i * 3 + 2]

      if (Math.abs(positions[i * 3]) > 8) velocities[i * 3] *= -1
      if (Math.abs(positions[i * 3 + 1]) > 5) velocities[i * 3 + 1] *= -1
      if (Math.abs(positions[i * 3 + 2]) > 5) velocities[i * 3 + 2] *= -1

      dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true

    const linePos: number[] = []
    const lineCol: number[] = []
    let lineCount = 0

    for (let i = 0; i < PARTICLE_COUNT && lineCount < 3000; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT && lineCount < 3000; j++) {
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < CONNECTION_DIST) {
          linePos.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
          )
          lineCol.push(
            0, 114 / 255, 245 / 255,
            0, 114 / 255, 245 / 255
          )
          lineCount++
        }
      }
    }

    if (linesRef.current) {
      const geo = linesRef.current.geometry
      geo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3))
      geo.setAttribute('color', new THREE.Float32BufferAttribute(lineCol, 3))
      geo.attributes.position.needsUpdate = true
      geo.attributes.color.needsUpdate = true
    }
  })

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(0.02, 1), [])
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#00C6FF',
    transparent: true,
    opacity: 0.7,
  }), [])

  return (
    <>
      <instancedMesh ref={meshRef} args={[geometry, material, PARTICLE_COUNT]} />
      <lineSegments ref={linesRef}>
        <bufferGeometry />
        <lineBasicMaterial vertexColors transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </>
  )
}

function Scene() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001
    }
  })

  return (
    <group ref={groupRef}>
      <Particles />
    </group>
  )
}

export default function ParticleNetwork() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
      <Canvas
        camera={{ fov: 60, position: [0, 0, 5], near: 0.1, far: 100 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
