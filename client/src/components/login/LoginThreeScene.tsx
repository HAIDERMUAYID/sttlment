import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const BRAND_TEAL = 0x026174;
const BRAND_LIGHT = 0x068294;

/** مشهد Three.js خلفية لتسجيل الدخول: جزيئات + أشكال هندسية متحركة بألوان العلامة */
export function LoginThreeScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.z = 10;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1';
    if (!container.contains(canvas)) container.appendChild(canvas);

    // جزيئات
    const particlesCount = 1200;
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    const tealR = 2 / 255, tealG = 97 / 255, tealB = 116 / 255;
    const lightR = 6 / 255, lightG = 130 / 255, lightB = 148 / 255;

    for (let i = 0; i < particlesCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      const t = Math.random();
      colors[i * 3] = tealR + (lightR - tealR) * t;
      colors[i * 3 + 1] = tealG + (lightG - tealG) * t;
      colors[i * 3 + 2] = tealB + (lightB - tealB) * t;
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    // حلقة توروس دوارة (أكبر وأوضح)
    const torusGeo = new THREE.TorusGeometry(3, 0.5, 32, 64);
    const torusMat = new THREE.MeshBasicMaterial({
      color: BRAND_TEAL,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.rotation.x = Math.PI / 2;
    scene.add(torus);

    // كرة شبكية (أكبر)
    const sphereGeo = new THREE.IcosahedronGeometry(2.5, 1);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: BRAND_LIGHT,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();
      particles.rotation.y = t * 0.02;
      particles.rotation.x = t * 0.015;
      torus.rotation.z = t * 0.2;
      torus.rotation.x = Math.PI / 2 + Math.sin(t * 0.3) * 0.2;
      sphere.rotation.x = t * 0.08;
      sphere.rotation.y = t * 0.12;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      torusGeo.dispose();
      torusMat.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      if (container.contains(canvas)) container.removeChild(canvas);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden z-0"
      style={{
        background: 'linear-gradient(135deg, #d0d5db 0%, #e8e9eb 40%, #06829418 100%)',
        isolation: 'isolate',
      }}
      aria-hidden
    />
  );
}
