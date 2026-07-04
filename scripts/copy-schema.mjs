import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname as pathDirname, join } from 'path';

const __dirname = pathDirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', 'server', 'src', 'db', 'schema.sql');
const dest = join(__dirname, '..', 'server', 'dist', 'db', 'schema.sql');

const destDir = pathDirname(dest);
if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

copyFileSync(src, dest);
console.log('schema.sql copied to dist/');
