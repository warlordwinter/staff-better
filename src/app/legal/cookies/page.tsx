import fs from 'node:fs';
import path from 'node:path';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export default async function CookiesPage() {
  const filePath = path.join(process.cwd(), 'src', 'app', 'legal', 'cookies.md');
  const file = await fs.promises.readFile(filePath, 'utf8');

  return (
    <article>
      <MarkdownRenderer content={file} />
    </article>
  );
}
