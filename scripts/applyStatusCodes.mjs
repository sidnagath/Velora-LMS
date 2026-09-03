import fs from 'fs';
import path from 'path';

const STATUS_CODES = {
  '200': 'OK',
  '201': 'CREATED',
  '204': 'NO_CONTENT',
  '400': 'BAD_REQUEST',
  '401': 'UNAUTHORIZED',
  '403': 'FORBIDDEN',
  '404': 'NOT_FOUND',
  '409': 'CONFLICT',
  '500': 'INTERNAL_SERVER_ERROR',
  '503': 'SERVICE_UNAVAILABLE'
};

const DIRS = [
  { path: 'controllers', depth: 2 },
  { path: 'middleware', depth: 1 },
  { path: 'routes', depth: 1 }
];

function processFile(filePath, depth) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  const statusRegex = /res\.status\((\d+)\)/g;

  if (statusRegex.test(content)) {
    content = content.replace(statusRegex, (match, code) => {
      if (STATUS_CODES[code]) {
        return `res.status(HTTP_STATUS_CODES.${STATUS_CODES[code]})`;
      }
      return match;
    });

    if (content !== originalContent) {
      if (!content.includes('HTTP_STATUS_CODES')) {
        let requirePath = '../'.repeat(depth) + 'constants/statusCodes.js';
        const importStmt = `import HTTP_STATUS_CODES from '${requirePath}';\n`;
        content = importStmt + content;
      }
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Refactored Status Codes: ${filePath}`);
    }
  }
}

function traverseDir(dir, depth) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverseDir(fullPath, depth);
    } else if (file.endsWith('.js')) {
      processFile(fullPath, depth);
    }
  }
}

for (const dirObj of DIRS) {
  const dirPath = path.join(process.cwd(), dirObj.path);
  traverseDir(dirPath, dirObj.depth);
}
console.log('HTTP Status Codes application complete.');
