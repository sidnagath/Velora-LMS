import fs from 'fs';
import path from 'path';
const DIRS = ['controllers', 'routes', 'middleware', 'services', 'models', 'config', 'scripts']; // Plus root files later
const ROOT_FILES = ['server.js'];
// We must handle moving inline requires to the top.
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  // Fix `(;` replacing with `(`
  content = content.replace(/=\s*\(\;/g, '= (');
  content = content.replace(/=\s*async\s*\(\;/g, '= async (');
  // Wait, I should just replace `(;` that was mistakenly added.
  // Wait, my replacement string was "export const $1 = $2;"
  // If the original was `exports.flashLocals = (req, res...`
  // Then maybe $2 was `(`, then I appended `;`
  // So it became `= (req` ???
  // No, if $2 was just `(`, it would be `export const flashLocals = (`. Where did `req...` come from?
  // Ah! `.+?` is non-greedy! So it matched NOTHING for $2 because ` \s* ` matched the space, and then $2 matched nothing, and then `;?` matched nothing! So it became `export const flashLocals = ;` NO. 
  // Wait, if it matched `exports.flashLocals =`, then `$2` matched nothing, and the remaining was ` (req, res...`. So it resulted in `export const flashLocals = (req, res...` WHICH IS `= (`.
  // But the grep says `= (req, res, next) => {` !!!
  // Ah, the original code had `exports.flashLocals = (req, res, next) => {`
  // And the `require` regex!
  // `/(?:const|let|var)\s+(\{.*?\}|\[.*?\]|[a-zA-Z0-9_$]+)\s*=\s*require\((['"`])(.*?)\2\);?/g`
  // Did one of my regexes insert a `;`?
  content = content.replace(/=\s*\(\;/g, '= (');
  content = content.replace(/=\s*async\s*\(\;/g, '= async (');
  content = content.replace(/=\s*\;\(/g, '= (');
  content = content.replace(/=\s*async\s*\;\(/g, '= async (');
  // Fix `;req`
  content = content.replace(/\(req/g, '(req');
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
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
      fixFile(fullPath);
    }
  }
}
for (const dir of DIRS) {
  traverseDir(path.join(process.cwd(), dir));
}
for (const file of ROOT_FILES) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    fixFile(fullPath);
  }
}


export default {
  $1,
  flashLocals,
  flashLocals,
  flashLocals
};
