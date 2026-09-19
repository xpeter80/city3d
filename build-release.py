from pathlib import Path
import shutil,subprocess
p=Path(__file__).resolve().parent
subprocess.run(['python3',str(p/'build.py')],check=True)
out=p/'dist';out.mkdir(exist_ok=True)
shutil.copytree(p/'site',out,dirs_exist_ok=True)
shutil.copytree(p/'vendor',out/'vendor',dirs_exist_ok=True)
(out/'city').mkdir(exist_ok=True)
shutil.copy2(p/'城市图鉴.html',out/'city/index.html')
shutil.copytree(p/'audio',out/'city/audio',dirs_exist_ok=True)

# Static files must be readable by the Caddy service after deployment.
for f in out.rglob('*'):
    f.chmod(0o755 if f.is_dir() else 0o644)
