import fs from 'node:fs';
import path from 'node:path';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export default async function DataDeletionPage() {
  const filePath = path.join(process.cwd(), 'src', 'app', 'legal', 'data-deletion.md');
  const file = await fs.promises.readFile(filePath, 'utf8');

  return (
    <article>
      <MarkdownRenderer content={file} />
    </article>
  );
}

