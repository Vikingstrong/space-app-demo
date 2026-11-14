'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Destination, SceneInput, SceneStatus } from './scene';
import styles from './museum.module.css';

const destinations = {
  moon: { name: 'Луна', next: 'Марс' },
  mars: { name: 'Марс', next: 'Луна' },
} as const;

export default function Museum() {
  const sky = useRef<HTMLDivElement>(null);
  const explore = useRef<HTMLElement>(null);
  const finale = useRef<HTMLElement>(null);
  const input = useRef<SceneInput>({ destination: 'moon', moon: 0, mars: 0, dragging: false, resumeAt: 0 });
  const drag = useRef<{ id: number; x: number } | null>(null);
  const [destination, setDestination] = useState<Destination>('moon');
  const [status, setStatus] = useState<SceneStatus>({ moon: 'loading', mars: 'loading', earth: 'loading' });
  const [unavailable, setUnavailable] = useState(false);
  const world = destinations[destination];

  useEffect(() => {
    const host = sky.current;
    const gallery = explore.current;
    const ending = finale.current;
    if (!host || !gallery || !ending) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    import('./scene').then(({ mountScene }) => {
      if (cancelled) return;
      cleanup = mountScene(host, gallery, ending, input.current, (planet, phase) => {
        setStatus((previous) => ({ ...previous, [planet]: phase }));
      });
    }).catch(() => {
      if (!cancelled) setUnavailable(true);
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  function rotate(delta: number) {
    input.current[input.current.destination] += delta;
    input.current.resumeAt = performance.now() + 3000;
  }

  const message = unavailable
    ? '3D-сцена недоступна в этом браузере.'
    : status[destination] === 'loading'
      ? 'Загружаем модель…'
      : status[destination] === 'error' ? 'Модель не загрузилась.' : '';

  return (
    <main className={styles.museum}>
      <div ref={sky} className={styles.sky} aria-hidden="true" />
      <section className={styles.hero} aria-labelledby="museum-title">
        <Image className={styles.logo} src="/tmas-logo.jpg" width={480} height={480} priority
          alt="TMAS — Museum of Abandoned Space" />
        <h1 id="museum-title">Что мы оставили<br />в космосе?</h1>
        <p>Истории аппаратов, которые остались на Луне и Марсе.</p>
        <a className={styles.enter} href="#worlds">К Луне и Марсу <span aria-hidden="true">↓</span></a>
      </section>

      <section id="worlds" ref={explore} className={styles.explore} aria-labelledby="world-title">
        <div className={styles.exploreFrame}>
          <h2 id="world-title" className={styles.visuallyHidden} aria-live="polite">{world.name}</h2>
          <div className={styles.rotation} role="group" tabIndex={message ? -1 : 0}
            aria-label={`Вращение модели: ${world.name}. Используй стрелки влево и вправо.`}
            onKeyDown={(event) => {
              if (message || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
              event.preventDefault();
              rotate(event.key === 'ArrowLeft' ? -0.13 : 0.13);
            }}
            onPointerDown={(event) => {
              if (message || !event.isPrimary || event.button !== 0) return;
              drag.current = { id: event.pointerId, x: event.clientX };
              input.current.dragging = true;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (drag.current?.id !== event.pointerId) return;
              rotate((event.clientX - drag.current.x) * 0.008);
              drag.current.x = event.clientX;
            }}
            onLostPointerCapture={() => {
              drag.current = null;
              input.current.dragging = false;
              input.current.resumeAt = performance.now() + 3000;
            }}
          />
          <button className={styles.next} onClick={() => {
            const next = destination === 'moon' ? 'mars' : 'moon';
            input.current.destination = next;
            setDestination(next);
          }} aria-label={`Показать: ${world.next}`}>
            <span aria-hidden="true">→</span>
          </button>
          <p className={styles.hint} role="status">{message}</p>
        </div>
      </section>

      <section ref={finale} className={styles.finale} aria-labelledby="earth-title">
        <div className={styles.earthCopy}>
          <h2 id="earth-title">Земля — начало<br />каждой экспедиции.</h2>
          <p>Следы на Луне и Марсе напоминают, как далеко может завести простой вопрос о том, что находится за горизонтом.</p>
          {status.earth === 'error' && <p role="status">Модель Земли не загрузилась.</p>}
        </div>
        <footer className={styles.footer}>
          <Link href="/moon-comparison">Сравнение 1K и 4K</Link>
          <Link href="/design">Эскизы</Link>
          <details className={styles.credits}>
            <summary>Авторы моделей</summary>
            <ul>
              <li><a href="https://sketchfab.com/3d-models/the-moon-9916fcec59f04b07b3e8d7f077dc3ded">Луна — SebastianSosnowski</a></li>
              <li><a href="https://sketchfab.com/3d-models/mars-5fc8b7168b044527a05ed3903c998b65">Марс — AirStudios</a></li>
              <li><a href="https://sketchfab.com/3d-models/earth-c2e4294c32ea4d8b850e152fc26aeeb4">Земля — ABOD.ANIMATION</a></li>
            </ul>
            <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · освещение и материал Земли адаптированы для сцены.
          </details>
        </footer>
      </section>
    </main>
  );
}
