import fs from 'fs';
import path from 'path';

const DIRS = ['controllers', 'routes', 'middleware', 'services', 'models', 'config', 'scripts'];
const ROOT_FILES = ['server.js'];

// We must handle moving inline requires to the top.
function addDefaultExportIfNeeded(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Check if it already has export default
  if (/export\s+default\s/.test(content)) {
    return;
  }

  // Find all named exports: export const functionName = ...
  // or export let ...
  const regex = /export\s+(const|let|var|function|class)\s+([a-zA-Z0-9_$]+)/g;
  let matches;
  const exportedNames = [];
  while ((matches = regex.exec(content)) !== null) {
    // Exclude things we don't want to default export, actually we want to export all named exports in the default object.
    exportedNames.push(matches[2]);
  }

  if (exportedNames.length > 0) {
    const defaultExportStr = `\n\nexport default {\n  ${exportedNames.join(',\n  ')}\n};\n`;
    content += defaultExportStr;

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Added default export to: ${filePath}`);
  }
}

function traverseDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverseDir(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
      addDefaultExportIfNeeded(fullPath);
    }
  }
}

for (const dir of DIRS) {
  traverseDir(path.join(process.cwd(), dir));
}

for (const file of ROOT_FILES) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    addDefaultExportIfNeeded(fullPath);
  }
}

console.log('Default export completion check complete!');
