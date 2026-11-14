import Image from 'next/image';
import type { Metadata } from 'next';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/noto-serif/600.css';
import styles from './design.module.css';

export const metadata: Metadata = { title: 'Варианты оформления — TMAS' };

const concepts = [
  { name: 'Кинотитр', theme: 'cinema', fonts: 'IBM Plex Sans' },
  { name: 'Музейная этикетка', theme: 'museum', fonts: 'Noto Serif + IBM Plex Sans' },
  { name: 'Бортовой журнал', theme: 'logbook', fonts: 'IBM Plex Mono + IBM Plex Sans' },
  { name: 'Архивный разворот', theme: 'archive', fonts: 'Noto Serif + IBM Plex Sans' },
  { name: 'Выставочный плакат', theme: 'poster', fonts: 'IBM Plex Sans' },
  { name: 'Телеметрия', theme: 'telemetry', fonts: 'IBM Plex Mono + IBM Plex Sans' },
] as const;

const samples = [
  { lang: 'ru', title: 'Следы на Луне', text: 'Что осталось на Луне после завершения миссий?', note: 'Широта · Долгота' },
  { lang: 'en', title: 'Traces on the Moon', text: 'What remained on the Moon after the missions ended?', note: 'Latitude · Longitude' },
  { lang: 'tg', title: 'Изҳо дар рӯйи Моҳ', text: 'Пас аз анҷоми парвозҳои кайҳонӣ дар рӯйи Моҳ чӣ боқӣ монд?', note: 'Ғ ғ Ӣ ӣ Қ қ Ӯ ӯ Ҳ ҳ Ҷ ҷ' },
];

export default function DesignPreview() {
  return (
    <main className={styles.preview}>
      <h1>Варианты оформления TMAS</h1>
      {concepts.map(({ name, theme, fonts }) => (
        <section key={theme} className={`${styles.concept} ${styles[theme]}`}>
          <header>
            <h2>{name}</h2>
            <p>{fonts}</p>
          </header>
          <div className={styles.layout}>
            <Image className={styles.logo} src="/tmas-logo.jpg" width={360} height={360}
              alt="TMAS — Museum of Abandoned Space" />
            <div className={styles.samples}>
              {samples.map(({ lang, title, text, note }) => (
                <article key={lang} lang={lang}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <small>{note}</small>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
