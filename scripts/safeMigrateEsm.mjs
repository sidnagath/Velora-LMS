import something from 'path';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import fs from 'fs';
const DIRS = ['controllers', 'routes', 'middleware', 'services', 'models', 'config', 'scripts'];
const ROOT_FILES = ['server.js'];
// We must handle moving inline requires to the top.
function convertToEsm(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let imports = [];
  // require pattern capturing only the require statement itself
  // 
  const requireDestruct = /(?:const|let|var)\s+(\{.*?\}|\[.*?\]|[a-zA-Z0-9_$]+)\s*=\s*require\((['"`])(.*?)\2\);?/g;
  const requireBare = /require\((['"`])(.*?)\1\)(?:\.(\w+)\(\))?;?/g;
  content = content.replace(requireDestruct, (match, vars, quote, reqPath) => {
    let importPath = reqPath;
    if (importPath.startsWith('.')) {
      if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) {
        importPath += '.js';
      }
    }
    // Convert to import
    imports.push(`import ${vars} from '${importPath}';`);
    return ''; // Remove from inline location
  });
  content = content.replace(requireBare, (match, quote, reqPath, chainCall) => {
    let importPath = reqPath;
    if (importPath.startsWith('.')) {
      if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) importPath += '.js';
    }
    if (chainCall) {
      if (reqPath === 'dotenv' && chainCall === 'config') {
        imports.push(`import 'dotenv/config.js';`);
      } else {
        let varName = "imported_" + Math.random().toString(36).substr(2, 5);
        imports.push(`import ${varName} from '${importPath}';\n${varName}.${chainCall}();`);
      }
    } else {
      imports.push(`import '${importPath}';`);
    }
    return '';
  });
  // 2. module.exports = ...
  // Replace just the keywords! Safe!
  content = content.replace(/(^|\n)(\s*)module\.exports\s*=\s*/g, "$1$2export default ");
  // 3. exports.foo = ... => export const foo = ...
  content = content.replace(/(^|\n)(\s*)exports\.([a-zA-Z0-9_$]+)\s*=\s*/g, "$1$2export const $3 = ");
  // 4. Polyfill __dirname ONLY if it exists in the file
  if (content.includes('__dirname') || content.includes('__filename')) {
    const polyfill = `import { fileURLToPath } from 'url';\n\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);\n`;
    imports.push(polyfill);
    // If we polyfill, make sure we aren't duplicating `path`
    const duplicatePathRegex = /\s*/g;
    content = content.replace(duplicatePathRegex, '');
  }
  // Remove empty lines created by removing require statements, just for neatness
  content = content.replace(/^\s*[\r\n]/gm, '\n');
  // Put them at the top, removing duplicates
  const uniqueImports = [...new Set(imports)].join('\n');
  content = uniqueImports + (uniqueImports ? '\n\n' : '') + content;
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Converted: ${filePath}`);
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
      convertToEsm(fullPath);
    }
  }
}
for (const dir of DIRS) {
  traverseDir(path.join(process.cwd(), dir));
}
for (const file of ROOT_FILES) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    convertToEsm(fullPath);
  }
}
console.log('Conversion complete!');
