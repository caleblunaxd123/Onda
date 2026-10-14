# Compatibility adapter

Source: npm decode-uri-component 0.5.0, MIT, Sam Verschueren.
Only the ESM default export is adapted to CommonJS for Expo SDK 57's query-string 7.
The upstream linear malformed UTF-8 decoder fixes GHSA-vcc3-ghjq-m6fr.
Keep this package until Expo Router supports the upstream ESM package directly.
