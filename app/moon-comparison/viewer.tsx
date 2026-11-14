'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { disposeModel, normalizeModel } from '../museum/models';

type Quality = '1k' | '4k';

export default function MoonViewer() {
  const host = useRef<HTMLDivElement>(null);
  const model = useRef<THREE.Group | null>(null);
  const motion = useRef({ yaw: 0, zoom: 0, target: 0 });
  const fog = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);
  const [quality, setQuality] = useState<Quality>('1k');
  const [zoomMode, setZoomMode] = useState<'wide' | 'detail' | 'fog'>('wide');
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Загрузка модели…');

  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setStatus('WebGL недоступен в этом браузере.');
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 30);
    const pivot = new THREE.Group();
    model.current = pivot;
    scene.add(pivot, new THREE.AmbientLight(0xffffff, 0.9));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(-3, 2, 4);
    scene.add(light);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const resize = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    });
    resize.observe(container);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    renderer.setAnimationLoop(() => {
      const state = motion.current;
      state.zoom = reduced.matches ? state.target : THREE.MathUtils.lerp(state.zoom, state.target, 0.055);
      pivot.rotation.y = state.yaw;
      camera.position.z = THREE.MathUtils.lerp(4.2, 1.17, state.zoom);
      if (fog.current) fog.current.style.opacity = String(THREE.MathUtils.smoothstep(state.zoom, 0.64, 1));
      renderer.render(scene, camera);
    });

    return () => {
      resize.disconnect();
      renderer.setAnimationLoop(null);
      renderer.dispose();
      renderer.domElement.remove();
      model.current = null;
    };
  }, []);

  useEffect(() => {
    const pivot = model.current;
    if (!pivot) return;
    let cancelled = false;
    let loaded: THREE.Object3D | undefined;

    new GLTFLoader().load('/models/moon-' + quality + '.glb', ({ scene }) => {
      if (cancelled) {
        disposeModel(scene);
        return;
      }

      const normalized = normalizeModel(scene);
      pivot.add(normalized);
      loaded = normalized;
      setReady(true);
      setStatus('');
    }, undefined, () => {
      if (!cancelled) setStatus('Не удалось загрузить модель.');
    });

    return () => {
      cancelled = true;
      if (loaded) {
        pivot.remove(loaded);
        disposeModel(loaded);
      }
    };
  }, [quality]);

  return (
    <>
      <div className="comparison-controls">
        {(['1k', '4k'] as const).map((option) => (
          <button key={option} aria-pressed={quality === option} onClick={() => {
            if (option === quality) return;
            setReady(false);
            setStatus('Загрузка модели…');
            setQuality(option);
          }}>
            {option.toUpperCase()} · {option === '1k' ? '1,4' : '17'} МБ
          </button>
        ))}
        {([
          ['wide', 'Общий план', 0],
          ['detail', 'Крупный план', 0.64],
          ['fog', 'Приближение с туманом', 1],
        ] as const).map(([mode, label, zoom]) => (
          <button key={mode} disabled={!ready} aria-pressed={zoomMode === mode} onClick={() => {
            motion.current.target = zoom;
            setZoomMode(mode);
          }}>
            {label}
          </button>
        ))}
      </div>
      <p>Перетащи Луну влево или вправо. Для сравнения выбери другую версию в том же ракурсе.</p>
      <div className="moon-stage">
        <div ref={host} className="moon-canvas"
          tabIndex={0} aria-label="Модель Луны. Для вращения используй стрелки влево и вправо."
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            motion.current.yaw += event.key === 'ArrowLeft' ? -0.12 : 0.12;
          }}
          onPointerDown={(event) => {
            drag.current = event.clientX;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (drag.current === null) return;
            motion.current.yaw += (event.clientX - drag.current) * 0.008;
            drag.current = event.clientX;
          }}
          onLostPointerCapture={() => { drag.current = null; }}
        />
        <div className="moon-fog" ref={fog} aria-hidden="true" />
        <p role="status" className="moon-status">{status}</p>
      </div>
    </>
  );
}
