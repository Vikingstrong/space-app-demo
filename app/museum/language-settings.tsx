import { useRef } from 'react';
import { languages, museumCopy, type Language } from './languages';
import styles from './museum.module.css';

export default function LanguageSettings({ language, onChange }: {
  language: Language;
  onChange: (language: Language) => void;
}) {
  const settings = useRef<HTMLDetailsElement>(null);
  const label = museumCopy[language].language;

  function close() {
    if (!settings.current) return;
    settings.current.open = false;
    settings.current.querySelector('summary')?.focus({ preventScroll: true });
  }

  return (
    <details ref={settings} className={styles.languageSettings} onKeyDown={(event) => {
      if (event.key !== 'Escape' || !event.currentTarget.open) return;
      event.preventDefault();
      close();
    }}>
      <summary aria-label={label}><span aria-hidden="true">⚙︎</span></summary>
      <div className={styles.languageMenu} role="group" aria-label={label}>
        <p>{label}</p>
        {(Object.keys(languages) as Language[]).map((option) => (
          <button key={option} type="button" lang={option} aria-pressed={language === option}
            onClick={() => { onChange(option); close(); }}>
            {languages[option]}
            {language === option && <span aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
    </details>
  );
}
