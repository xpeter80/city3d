#!/usr/bin/env python3
"""Build the no-network, double-clickable single HTML artifact."""
from pathlib import Path
import subprocess,re,shutil
root=Path(__file__).resolve().parent
candidates=[shutil.which('esbuild'),str(Path.home()/'.npm/_npx/702923228c2ce1e6/node_modules/@esbuild/darwin-arm64/bin/esbuild')]
esbuild=next((p for p in candidates if p and Path(p).is_file()),None)
if not esbuild: raise SystemExit('Install esbuild first: npm install -g esbuild')
subprocess.run([esbuild,str(root/'app.js'),'--bundle','--minify','--format=iife','--alias:three='+str(root/'vendor/three.module.js'),'--alias:three/addons='+str(root/'vendor'),'--outfile='+str(root/'bundle.js')],check=True)
html=(root/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'style.css').read_text()+'</style>')
html=re.sub(r'<script type="importmap">.*?</script>','',html)
html=html.replace('<script type="module" src="app.js"></script>','<script>'+(root/'bundle.js').read_text().replace('</script','<\\/script')+'</script>')
(root/'山水杭州.html').write_text(html)
(root/'城市图鉴.html').write_text(html)
print('Built',root/'山水杭州.html')
