import fs from 'fs';
import path from 'path';

const DIRS = ['controllers', 'middleware', 'routes'];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Only touch files that USE the constant but don't import it
  if (!content.includes('HTTP_STATUS_CODES')) return;
  if (content.includes("from '") && content.includes('statusCodes')) return;
  if (content.includes("from \"") && content.includes('statusCodes')) return;

  // Calculate relative depth from project root
  const rel = path.relative(process.cwd(), filePath);
  const depth = rel.split(path.sep).length - 1; // number of dirs deep
  const importPath = '../'.repeat(depth) + 'constants/statusCodes.js';

  const importLine = `import HTTP_STATUS_CODES from '${importPath}';\n`;
  content = importLine + content;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed import in: ${rel}`);
}

function traverse(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) traverse(full);
    else if (file.endsWith('.js')) fixFile(full);
  }
}

for (const d of DIRS) traverse(path.join(process.cwd(), d));
console.log('Done.');
