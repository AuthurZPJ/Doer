const { build } = require('electron-builder');

build({
  config: {
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
      'cli/**/*',
      'package.json',
    ],
    extraResources: [
      { from: 'server/src', to: 'server/src' },
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
  },
}).catch(err => {
  console.error(err);
  process.exit(1);
});
