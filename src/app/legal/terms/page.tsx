import fs from 'node:fs';
import path from 'node:path';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export default async function TermsPage() {
  const filePath = path.join(process.cwd(), 'src', 'app', 'legal', 'terms.md');
  const file = await fs.promises.readFile(filePath, 'utf8');

  return (
    <article>
      <MarkdownRenderer content={file} />
    </article>
  );
}
