"""Bounded background video derivatives. Originals are never overwritten."""
import queue,threading,subprocess,os,shutil
from pathlib import Path
jobs=queue.Queue();pending=set();lock=threading.Lock()
def enqueue(path):
 path=Path(path)
 with lock:
  if path in pending:return
  pending.add(path)
 jobs.put(path)
def worker():
 while True:
  p=jobs.get();thumb=Path(str(p)+'.jpg');stream=Path(str(p)+'.stream.mp4')
  try:
   if not p.exists():continue
   if not thumb.exists():
    tmp=Path(str(thumb)+'.tmp.jpg')
    try:
     subprocess.run(['ffmpeg','-nostdin','-v','error','-threads','1','-i',str(p),'-frames:v','1','-vf','scale=640:-2','-threads','1','-y',str(tmp)],check=True,timeout=45,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
     if p.exists():os.replace(tmp,thumb)
    finally:tmp.unlink(missing_ok=True)
   if p.suffix.lower() in ('.mp4','.mov','.m4v') and not stream.exists() and shutil.disk_usage(p.parent).free>p.stat().st_size+512*1024**2:
    tmp=Path(str(stream)+'.tmp.mp4')
    try:
     subprocess.run(['ffmpeg','-nostdin','-v','error','-threads','1','-i',str(p),'-map','0:v:0','-map','0:a?','-c','copy','-movflags','+faststart','-y',str(tmp)],check=True,timeout=90,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
     if p.exists():os.replace(tmp,stream)
    finally:tmp.unlink(missing_ok=True)
  except (OSError,subprocess.SubprocessError):pass
  finally:
   with lock:pending.discard(p)
   jobs.task_done()
def decorate(n,root):
 media=n.get('media','')
 if n.get('media_type')=='video' and media:
  p=root/Path(media).name
  n['thumbnail']=media+'.jpg' if Path(str(p)+'.jpg').exists() else ''
  n['playback']=media+'.stream.mp4' if Path(str(p)+'.stream.mp4').exists() else media
 return n
def remove(path):
 for suffix in ('.jpg','.stream.mp4'):Path(str(path)+suffix).unlink(missing_ok=True)
def start():threading.Thread(target=worker,daemon=True).start()
