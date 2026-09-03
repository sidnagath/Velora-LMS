import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import fs from 'fs';
const files = [
  'server.js',
  'scripts/migrateToCloudinary.js',
  'downloadBaseImages.js',
  'generateThumbnails.js',
  'scripts/esmMigrate.js'
];
const polyfill = `import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
`;
for (const file of files) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes('__dirname') && !content.includes('fileURLToPath')) {
    // If it doesn't already have the polyfill
    // First, let's fix path require if it exists (it might have been converted to import path from 'path')
    // We already do `import path from 'path'` in polyfill, but actually esmMigrate might have done it.
    if (content.includes("")) {
      content = content.replace("", polyfill);
    } else {
      // Just append it after the last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfLine + 1) + '\n' + polyfill + content.slice(endOfLine + 1);
      } else {
        content = polyfill + '\n' + content;
      }
    }
    fs.writeFileSync(fullPath, content);
    console.log('Fixed __dirname in ' + file);
  }
}
