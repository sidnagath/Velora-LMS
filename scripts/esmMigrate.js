import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import foo from 'bar';
import { x, y } from 'bar';
import 'dotenv/config.js';

const DIRS = ['controllers', 'routes', 'middleware', 'services', 'models', 'config', 'scripts']; // Plus root files later
const ROOT_FILES = ['server.js'];
// We must handle moving inline requires to the top.
function convertToEsm(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  // 1. Gather and replace top-level and inline requires
  // We'll collect all distinct requires to put at the top.
  let imports = [];
  // A pattern to match:  
  // or 
  // or 
  const requireDestruct = /(?:const|let|var)\s+(\{.*?\}|\[.*?\]|[a-zA-Z0-9_$]+)\s*=\s*require\((['"`])(.*?)\2\);?/g;
  const requireBare = /require\((['"`])(.*?)\1\)(?:\.(\w+)\(\))?;?/g;
  content = content.replace(requireDestruct, (match, vars, quote, reqPath) => {
    // Determine path extension
    let importPath = reqPath;
    if (importPath.startsWith('.')) {
      if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) {
        importPath += '.js';
      }
    }
    // Add to imports
    imports.push(`import ${vars} from '${importPath}';`);
    return ''; // Remove from inline location
  });
  content = content.replace(requireBare, (match, quote, reqPath, chainCall) => {
    // If it's a bare require like 
    let importPath = reqPath;
    if (importPath.startsWith('.')) {
      if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) importPath += '.js';
    }
    if (chainCall) {
      // Just keep the import and leave the chain call. Actually we can't easily chain import. 
      // i.e import dotenv config. We'll just generate import 'dotenv/config.js' or similar. 
      if (reqPath === 'dotenv' && chainCall === 'config') {
        imports.push(`import 'dotenv/config.js';`);
      } else {
        // generic fallback
        let varName = "imported_" + Math.random().toString(36).substr(2, 5);
        imports.push(`import ${varName} from '${importPath}';\n${varName}.${chainCall}();`);
      }
    } else {
      imports.push(`import '${importPath}';`);
    }
    return ''; // Remove from current location
  });
  // 2. export default .;..
  content = content.replace(/module\.exports\s*=\s*(.+?);?/g, "export default $1;");
  // 3. export const foo = .;.. => export const foo = ...
  content = content.replace(/exports\.([a-zA-Z0-9_$]+)\s*=\s*(.+?);?/g, "export const $1 = $2;");
  // Write top-level imports
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
    } else if (file.endsWith('.js')) {
      convertToEsm(fullPath);
    }
  }
}
for (const dir of DIRS) {
  traverseDir(path.join(__dirname, '..', dir));
}
for (const file of ROOT_FILES) {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    convertToEsm(fullPath);
  }
}
