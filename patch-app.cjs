const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const handleAssetSelect = useCallback\(\(asset: Asset\) => \{/g,
  `const handleAssetSelect = useCallback((asset: Asset) => {
    selectedAssetRef.current = asset;`
);

code = code.replace(
  /if \(selectedAsset\.id !== lastAssetIdRef\.current\) \{/g,
  `if (selectedAsset.id !== lastAssetIdRef.current) {
        selectedAssetRef.current = selectedAsset;`
);

fs.writeFileSync('src/App.tsx', code, 'utf8');
console.log('Patched selectedAssetRef synchronous updates');
