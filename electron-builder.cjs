const { build } = require('electron-builder');

const args = process.argv.slice(2);
const platform = args.find(a => a.startsWith('--'))?.slice(2);

const config = {
  appId: 'com.doer.app',
  productName: 'Doer',
  directories: {
    output: 'release',
  },
  files: [
    'electron/**/*',
    'client/dist/**/*',
    'server/dist/**/*',
    'server/src/db/schema.sql',
    'server/package.json',
    'package.json',
    '!**/node_modules/better-sqlite3/deps/**',
    '!**/node_modules/better-sqlite3/src/**',
    '!**/node_modules/better-sqlite3/build/Release/obj/**',
    '!**/node_modules/better-sqlite3/build/Release/test_extension.node',
    '!**/node_modules/better-sqlite3/build/deps/**',
    '!**/node_modules/better-sqlite3/**/*.map',
    '!**/node_modules/better-sqlite3/**/*.gyp',
    '!**/node_modules/better-sqlite3/**/*.md',
    '!**/node_modules/better-sqlite3/**/*.ts',
  ],
  asarUnpack: [
    '**/*.node',
  ],
  mac: {
    target: ['dmg'],
    category: 'public.app-category.productivity',
  },
  win: {
    target: ['nsis'],
  },
  linux: {
    target: ['AppImage'],
    category: 'Office',
  },
  publish: {
    provider: 'github',
    owner: 'AuthurZPJ',
    repo: 'Doer',
  },
};

const opts = { config };
if (platform === 'win') opts.win = ['nsis'];
else if (platform === 'mac') opts.mac = ['dmg'];
else if (platform === 'linux') opts.linux = ['AppImage'];

build(opts).catch(err => {
  console.error(err);
  process.exit(1);
});
