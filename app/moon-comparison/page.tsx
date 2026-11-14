import type { Metadata } from 'next';
import Link from 'next/link';
import MoonViewer from './viewer';

export const metadata: Metadata = { title: 'Сравнение моделей Луны — TMAS' };

export default function MoonComparison() {
  return (
    <main className="comparison">
      <Link href="/">← В музей</Link>
      <h1>Луна в 1K и 4K</h1>
      <MoonViewer />
    </main>
  );
}
