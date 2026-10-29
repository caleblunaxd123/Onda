require('./prepare-globe.cjs');
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public/vendor');
fs.mkdirSync(output, {recursive:true});
for (const file of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs']) {
  fs.copyFileSync(path.join(root,'node_modules/maplibre-gl/dist',file),path.join(output,file));
}
fs.copyFileSync(path.join(root,'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),path.join(output,'Ionicons.ttf'));
