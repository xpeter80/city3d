"""Small shared account and gallery API; standard library only."""
import os,json,sqlite3,time,secrets,hashlib,hmac,re,unicodedata,threading,shutil,uuid
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from http.cookies import SimpleCookie
from urllib.parse import urlparse,parse_qs
from media_types import kind
import media_derivatives as derivatives
BASE=Path(os.environ.get('ATLAS_DATA','/var/lib/city-atlas'));BASE.mkdir(parents=True,exist_ok=True)
DB=BASE/'notes.db';UPLOADS=BASE/'uploads';UPLOADS.mkdir(exist_ok=True)
ORIGINS=set(os.environ.get('ATLAS_ORIGINS','http://xpeter.net:3466').split(','))
def db():
 c=sqlite3.connect(DB,timeout=15);c.row_factory=sqlite3.Row;return c
def password_hash(p):
 salt=secrets.token_hex(16);return salt+':'+hashlib.pbkdf2_hmac('sha256',p.encode(),salt.encode(),250000).hex()
def password_ok(p,stored):
 salt,digest=stored.split(':');return hmac.compare_digest(digest,hashlib.pbkdf2_hmac('sha256',p.encode(),salt.encode(),250000).hex())
def digest(s):return hashlib.sha256(s.encode()).hexdigest()
def now():return time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
def audit(action,user=None,detail=''):
 with db() as c:c.execute('INSERT INTO logs(created,user_id,action,detail) VALUES(?,?,?,?)',(now(),user,action,detail[:200]))
with db() as c:
 c.execute('PRAGMA journal_mode=WAL')
 c.execute('CREATE TABLE IF NOT EXISTS notes(id INTEGER PRIMARY KEY,city TEXT,name TEXT,message TEXT,created TEXT)')
 cols={r['name'] for r in c.execute('PRAGMA table_info(notes)')}
 for col in ('place','media','media_type','category','owner'):
  if col not in cols:c.execute(f"ALTER TABLE notes ADD COLUMN {col} TEXT DEFAULT ''")
 for col,typ in [('user_id','INTEGER'),('request_id','TEXT')]:
  if col not in cols:c.execute(f'ALTER TABLE notes ADD COLUMN {col} {typ}')
 c.executescript('''CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE COLLATE NOCASE,password TEXT,phone TEXT,role TEXT DEFAULT 'user',disabled INTEGER DEFAULT 0,created TEXT);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER,csrf TEXT,expires REAL);
 CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);
 CREATE TABLE IF NOT EXISTS logs(id INTEGER PRIMARY KEY,created TEXT,user_id INTEGER,action TEXT,detail TEXT);
 CREATE TABLE IF NOT EXISTS note_images(note_id INTEGER,media TEXT,position INTEGER,PRIMARY KEY(note_id,position));
 CREATE TABLE IF NOT EXISTS uploads(media TEXT PRIMARY KEY,user_id INTEGER,type TEXT,size INTEGER,created REAL);
 CREATE UNIQUE INDEX IF NOT EXISTS notes_request ON notes(user_id,request_id);
 CREATE INDEX IF NOT EXISTS notes_place ON notes(city,place,id);''')
 for key,value in {'limits':{'image':5,'audio':50,'video':80},'sensitive_words':['操你妈','傻逼','代开发票','出售枪支','买卖银行卡']}.items():c.execute('INSERT OR IGNORE INTO settings VALUES(?,?)',(key,json.dumps(value,ensure_ascii=False)))
 initial=os.environ.get('ATLAS_ADMIN_PASSWORD')
 if initial and not c.execute("SELECT 1 FROM users WHERE username='admin'").fetchone():c.execute('INSERT INTO users(username,password,phone,role,created) VALUES(?,?,?,?,?)',('admin',password_hash(initial),'','admin',now()))
def decorate_note(row):
 n=derivatives.decorate(dict(row),UPLOADS)
 with db() as c:n['images']=[r[0] for r in c.execute('SELECT media FROM note_images WHERE note_id=? ORDER BY position',(n['id'],))]
 if not n['images'] and n.get('media_type')=='image':n['images']=[n['media']]
 return n
def settings():
 with db() as c:return {r['key']:json.loads(r['value']) for r in c.execute('SELECT * FROM settings')}
def normalize(s):return re.sub(r'[\W_]+','',unicodedata.normalize('NFKC',s).casefold())
def sensitive(s):return any(normalize(w) in normalize(s) for w in settings()['sensitive_words'] if normalize(w))
def valid(city,place):return city in ('hangzhou','chengdu') and str(place).isdigit() and 0<=int(place)<(15 if city=='hangzhou' else 14)
rate={};mutex=threading.Lock();slots=threading.BoundedSemaphore(2)
class Problem(Exception):
 def __init__(self,status,message):self.status=status;self.message=message
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def reply(self,status,data,cookie=None):
  body=json.dumps(data,ensure_ascii=False).encode();self.send_response(status)
  for k,v in [('Content-Type','application/json; charset=utf-8'),('Cache-Control','no-store'),('Content-Length',str(len(body))),('X-Content-Type-Options','nosniff')]:self.send_header(k,v)
  if cookie:self.send_header('Set-Cookie',cookie)
  self.end_headers();self.wfile.write(body)
 def limit(self,key,count,seconds):
  ip=self.headers.get('X-Forwarded-For',self.client_address[0]).split(',')[0].strip();key=(key,ip)
  with mutex:
   t=time.time()
   for old in list(rate):
    if rate[old][1]<t:rate.pop(old)
   n,end=rate.get(key,(0,t+seconds))
   if n>=count:raise Problem(429,'操作频繁，请稍后再试')
   rate[key]=(n+1,end)
 def session(self):
  cookies=SimpleCookie();cookies.load(self.headers.get('Cookie',''));raw=cookies.get('atlas_session');self.session_key=digest(raw.value) if raw else ''
  with db() as c:
   r=c.execute('SELECT users.*,sessions.csrf FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>? AND disabled=0',(self.session_key,time.time())).fetchone()
  return dict(r) if r else None
 def require(self,admin=False):
  if not self.user:raise Problem(401,'请先登录')
  if admin and self.user['role']!='admin':raise Problem(403,'需要管理员权限')
 def write_guard(self):
  origin=self.headers.get('Origin')
  if origin not in ORIGINS:raise Problem(403,'请求来源不受信任')
  if self.user and not hmac.compare_digest(self.headers.get('X-CSRF-Token',''),self.user['csrf']):raise Problem(403,'会话校验失败，请刷新页面')
 def read_json(self):
  n=int(self.headers.get('Content-Length','0'))
  if not 0<n<=65536:raise Problem(413,'请求过大')
  d=json.loads(self.rfile.read(n))
  if not isinstance(d,dict):raise Problem(400,'请求格式错误')
  return d
 def run(self,method):
  try:
   self.connection.settimeout(180);self.user=self.session();self.pathpart=urlparse(self.path).path;self.q=parse_qs(urlparse(self.path).query)
   if method!='GET':self.write_guard()
   return getattr(self,'route_'+method)()
  except Problem as e:self.reply(e.status,{'error':e.message})
  except (ValueError,TypeError,KeyError):self.reply(400,{'error':'输入格式不正确'})
  except (BrokenPipeError,ConnectionResetError,TimeoutError):pass
  except Exception as e:
   audit('server_error',detail=type(e).__name__);self.reply(500,{'error':'服务暂时不可用，请稍后重试'})
 def do_GET(self):self.run('GET')
 def do_POST(self):self.run('POST')
 def do_DELETE(self):self.run('DELETE')
 def public_user(self,u):return {k:u[k] for k in ('id','username','phone','role','disabled','created')}
 def login(self,u):
  token=secrets.token_urlsafe(32);csrf=secrets.token_urlsafe(32)
  with db() as c:
   c.execute('DELETE FROM sessions WHERE expires<?',(time.time(),));c.execute('INSERT INTO sessions VALUES(?,?,?,?)',(digest(token),u['id'],csrf,time.time()+7*86400))
  audit('login',u['id']);secure='; Secure' if self.headers.get('X-Forwarded-Proto')=='https' else ''
  self.reply(200,{'user':self.public_user(u),'csrf':csrf},f'atlas_session={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800{secure}')
 def route_GET(self):
  path=self.pathpart
  if path=='/api/config':return self.reply(200,{'limits':settings()['limits'],'wechat':False,'sms':False,'phone_verified':False})
  if path=='/api/auth/me':return self.reply(200,{'user':self.public_user(self.user) if self.user else None,'csrf':self.user['csrf'] if self.user else ''})
  if path=='/api/account/notes':
   self.require();page=max(1,int(self.q.get('page',['1'])[0]));where='user_id=?';args=[self.user['id']]
   for key in ('city','media_type'):
    value=self.q.get(key,[''])[0]
    if value:where+=' AND '+key+'=?';args.append(value)
   query=self.q.get('q',[''])[0][:100]
   if query:where+=' AND message LIKE ?';args.append('%'+query+'%')
   with db() as c:
    total=c.execute('SELECT COUNT(*) FROM notes WHERE '+where,args).fetchone()[0]
    rows=c.execute('SELECT id,city,place,message,created,media,media_type,category FROM notes WHERE '+where+' ORDER BY id DESC LIMIT 9 OFFSET ?',args+[(page-1)*9]).fetchall()
    stats=dict(c.execute("SELECT COUNT(*) total,COUNT(DISTINCT city||':'||place) places,SUM(CASE WHEN media!='' THEN 1 ELSE 0 END) media FROM notes WHERE user_id=?",(self.user['id'],)).fetchone())
   return self.reply(200,{'items':[decorate_note(r) for r in rows],'total':total,'page':page,'pages':max(1,(total+8)//9),'stats':stats})
  if path.startswith('/api/admin/'):
   self.require(True);return self.admin_get(path)
  city=self.q.get('city',[''])[0];place=self.q.get('place',[''])[0]
  if path=='/api/media-summary':
   with db() as c:rows=c.execute("SELECT place,media_type,category,COUNT(*) AS count FROM notes WHERE city=? AND media!='' GROUP BY place,media_type,category",(city,)).fetchall()
   return self.reply(200,[dict(place=r['place'],type=r['media_type'],category=r['category'],count=r['count']) for r in rows])
  if path!='/api/notes':raise Problem(404,'接口不存在')
  if not valid(city,place):raise Problem(400,'请选择景点')
  playlist=self.q.get('playlist',[''])[0]=='1';page=max(1,int(self.q.get('page',['1'])[0]));size=500 if playlist else 6
  where="city=? AND place=?"+(" AND category='narration' AND media_type='audio'" if playlist else '')
  with db() as c:
   total=c.execute('SELECT COUNT(*) FROM notes WHERE '+where,(city,place)).fetchone()[0]
   rows=c.execute('SELECT id,user_id,name,message,created,media,media_type,category FROM notes WHERE '+where+' ORDER BY id '+('ASC' if playlist else 'DESC')+' LIMIT ? OFFSET ?',(city,place,size,0 if playlist else (page-1)*size)).fetchall()
  items=[]
  for r in rows:
   n=decorate_note(r);n['can_delete']=bool(self.user and (self.user['role']=='admin' or n['user_id']==self.user['id']));items.append(n)
  self.reply(200,{'items':items,'total':total,'page':page,'pages':max(1,(total+5)//6)})
 def route_POST(self):
  path=self.pathpart
  if path in ('/api/auth/login','/api/auth/register'):
   self.limit(path,10,300);d=self.read_json();username=d.get('username','').strip();password=d.get('password','')
   if not isinstance(password,str) or len(password)>128:raise Problem(400,'密码格式错误')
   if path.endswith('register'):
    phone=d.get('phone','').strip()
    if not re.fullmatch(r'[\w\u4e00-\u9fff]{3,24}',username) or sensitive(username):raise Problem(400,'用户名需3–24个中英文字母、数字或下划线，且不含敏感词')
    if not re.fullmatch(r'1[3-9][0-9]{9}',phone):raise Problem(400,'请填写11位中国大陆手机号')
    if len(password)<10:raise Problem(400,'密码至少10位')
    try:
     with db() as c:c.execute('INSERT INTO users(username,password,phone,created) VALUES(?,?,?,?)',(username,password_hash(password),phone,now()))
    except sqlite3.IntegrityError:raise Problem(409,'用户名已存在')
    audit('register')
   with db() as c:u=c.execute('SELECT * FROM users WHERE username=?',(username,)).fetchone()
   if not u or u['disabled'] or not password_ok(password,u['password']):
    audit('login_failed');raise Problem(401,'用户名或密码错误，或账号已禁用')
   return self.login(dict(u))
  self.require()
  if path=='/api/auth/logout':
   with db() as c:c.execute('DELETE FROM sessions WHERE token=?',(self.session_key,))
   return self.reply(200,{'ok':True},'atlas_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
  if path=='/api/auth/profile':
   d=self.read_json();phone=d.get('phone','').strip()
   if not re.fullmatch(r'1[3-9][0-9]{9}',phone):raise Problem(400,'请填写11位中国大陆手机号')
   with db() as c:c.execute('UPDATE users SET phone=? WHERE id=?',(phone,self.user['id']))
   audit('profile_updated',self.user['id']);return self.reply(200,{'ok':True})
  if path=='/api/auth/password':
   d=self.read_json();new=d.get('password','')
   if not password_ok(d.get('old_password',''),self.user['password']) or not 10<=len(new)<=128:raise Problem(400,'原密码不正确或新密码不足10位')
   with db() as c:c.execute('UPDATE users SET password=? WHERE id=?',(password_hash(new),self.user['id']));c.execute('DELETE FROM sessions WHERE user_id=?',(self.user['id'],))
   audit('password_changed',self.user['id']);return self.reply(200,{'ok':True})
  if path.startswith('/api/admin/'):
   self.require(True);return self.admin_post(path,self.read_json())
  if path=='/api/upload':self.limit('upload',20,300);return self.upload()
  if path!='/api/notes':raise Problem(404,'接口不存在')
  d=self.read_json();city=d.get('city');place=d.get('place');message=d.get('message','').strip();media=d.get('media','');category=d.get('category','');request=d.get('request_id','')
  if not valid(city,place) or not 1<=len(message)<=300 or sensitive(message):raise Problem(400,'留言为空、超过300字或包含敏感词，请修改')
  if not re.fullmatch(r'[a-zA-Z0-9-]{16,80}',request):raise Problem(400,'缺少提交标识，请刷新页面')
  with db() as c:
   existing=c.execute('SELECT id FROM notes WHERE user_id=? AND request_id=?',(self.user['id'],request)).fetchone()
   if existing:return self.reply(200,{'ok':True,'id':existing[0]})
   images=d.get('images',[])
   if not isinstance(images,list) or len(images)>9 or any(not isinstance(x,str) for x in images):raise Problem(400,'每条留言最多9张图片')
   images=list(dict.fromkeys(images))
   if images:
    if media and media!=images[0]:raise Problem(400,'图文不能混合音视频')
    for image in images:
     ir=c.execute('SELECT * FROM uploads WHERE media=? AND user_id=?',(image,self.user['id'])).fetchone()
     if not ir or ir['type']!='image' or not (UPLOADS/Path(image).name).is_file():raise Problem(400,'图片不存在或不属于当前用户')
    media=images[0]
   mt=''
   if media:
    r=c.execute('SELECT * FROM uploads WHERE media=? AND user_id=?',(media,self.user['id'])).fetchone()
    if not r or not (UPLOADS/Path(media).name).is_file():raise Problem(400,'附件不存在或不属于当前用户')
    mt=r['type']
   category=category if mt=='audio' else ''
   if category not in ('','voice','narration'):raise Problem(400,'音频类别错误')
   self.limit('note',10,60)
   c.execute('INSERT INTO notes(city,place,name,message,created,media,media_type,category,user_id,request_id) VALUES(?,?,?,?,?,?,?,?,?,?)',(city,place,self.user['username'],message,now(),media,mt,category,self.user['id'],request))
   note_id=c.execute('SELECT last_insert_rowid()').fetchone()[0]
   c.executemany('INSERT INTO note_images VALUES(?,?,?)',[(note_id,img,i) for i,img in enumerate(images)])
  audit('note_created',self.user['id']);self.reply(201,{'ok':True})
 def route_DELETE(self):
  self.require()
  if not re.fullmatch(r'/api/notes/\d+',self.pathpart):raise Problem(404,'接口不存在')
  id=int(self.pathpart.rsplit('/',1)[1])
  with db() as c:
   r=c.execute('SELECT * FROM notes WHERE id=?',(id,)).fetchone()
   if not r:raise Problem(404,'留言不存在')
   if self.user['role']!='admin' and r['user_id']!=self.user['id']:raise Problem(403,'不能删除他人留言')
   media_set={r['media']}|{x[0] for x in c.execute('SELECT media FROM note_images WHERE note_id=?',(id,))}
   c.execute('DELETE FROM note_images WHERE note_id=?',(id,))
   c.execute('DELETE FROM notes WHERE id=?',(id,))
   for media in media_set:
    if media and not c.execute('SELECT 1 FROM notes WHERE media=? UNION ALL SELECT 1 FROM note_images WHERE media=?',(media,media)).fetchone():
     (UPLOADS/Path(media).name).unlink(missing_ok=True);derivatives.remove(UPLOADS/Path(media).name);c.execute('DELETE FROM uploads WHERE media=?',(media,))
  audit('note_deleted',self.user['id'],f'note={id}');self.reply(200,{'ok':True})
 def upload(self):
  n=int(self.headers.get('Content-Length','0'));limits=settings()['limits']
  if not 0<n<=max(limits.values())*1024**2:raise Problem(413,'文件超过上传限制')
  if not slots.acquire(False):raise Problem(503,'上传繁忙，请稍后重试')
  path=None
  try:
   if shutil.disk_usage(BASE).free<n+256*1024**2:raise Problem(507,'服务器空间不足')
   head=self.rfile.read(min(n,512));t=kind(head)
   if not t:raise Problem(415,'不支持的媒体文件格式')
   if n>limits[t[1]]*1024**2:raise Problem(413,f'该类型文件最大 {limits[t[1]]}MB')
   path=UPLOADS/(uuid.uuid4().hex+'.'+t[0]);remaining=n-len(head)
   with path.open('wb') as f:
    f.write(head)
    while remaining:
     chunk=self.rfile.read(min(65536,remaining))
     if not chunk:raise Problem(400,'上传中断，请重试')
     f.write(chunk);remaining-=len(chunk)
   media='/uploads/'+path.name
   with db() as c:c.execute('INSERT INTO uploads VALUES(?,?,?,?,?)',(media,self.user['id'],t[1],n,time.time()))
   if t[1]=='video':derivatives.enqueue(path)
   self.reply(201,{'media':media,'media_type':t[1]})
  except Exception:
   if path:path.unlink(missing_ok=True)
   raise
  finally:slots.release()
 def admin_get(self,path):
  if path=='/api/admin/config':return self.reply(200,settings())
  if path=='/api/admin/metrics':return self.reply(200,metrics())
  page=max(1,int(self.q.get('page',['1'])[0]));query=self.q.get('q',[''])[0][:100];size=15;args=[];where='1=1'
  if path=='/api/admin/users':
   table='users';fields='id,username,phone,role,disabled,created';where='username LIKE ?';args=['%'+query+'%']
  elif path=='/api/admin/notes':
   table='notes';fields='id,user_id,name,city,place,message,media,media_type,created';where='(name LIKE ? OR message LIKE ?)';args=['%'+query+'%']*2
   for key in ('city','place','user_id'):
    value=self.q.get(key,[''])[0]
    if value:where+=' AND '+key+'=?';args.append(value)
  elif path=='/api/admin/logs':table='logs';fields='id,created,user_id,action,detail'
  else:raise Problem(404,'接口不存在')
  with db() as c:
   total=c.execute(f'SELECT COUNT(*) FROM {table} WHERE {where}',args).fetchone()[0];rows=c.execute(f'SELECT {fields} FROM {table} WHERE {where} ORDER BY id DESC LIMIT ? OFFSET ?',args+[size,(page-1)*size]).fetchall()
  self.reply(200,{'items':[decorate_note(r) for r in rows],'total':total,'page':page,'pages':max(1,(total+size-1)//size)})
 def admin_post(self,path,d):
  if path=='/api/admin/config':
   limits=d.get('limits',{});words=d.get('sensitive_words',[])
   if set(limits)!= {'image','audio','video'} or any(type(v)!=int or not 1<=v<=200 for v in limits.values()):raise Problem(400,'每类限制应为1–200MB整数')
   if not isinstance(words,list) or len(words)>1000 or any(not isinstance(w,str) or not 1<=len(w)<=40 for w in words):raise Problem(400,'敏感词格式错误')
   with db() as c:
    for k,v in [('limits',limits),('sensitive_words',words)]:c.execute('UPDATE settings SET value=? WHERE key=?',(json.dumps(v,ensure_ascii=False),k))
   audit('settings_updated',self.user['id']);return self.reply(200,{'ok':True})
  if not re.fullmatch(r'/api/admin/users/\d+',path):raise Problem(404,'接口不存在')
  id=int(path.rsplit('/',1)[1]);role=d.get('role');disabled=d.get('disabled');password=d.get('password')
  with db() as c:
   c.execute('BEGIN IMMEDIATE');u=c.execute('SELECT * FROM users WHERE id=?',(id,)).fetchone()
   if not u:raise Problem(404,'用户不存在')
   role=u['role'] if role is None else role;disabled=u['disabled'] if disabled is None else disabled
   if role not in ('user','admin') or disabled not in (0,1):raise Problem(400,'角色或状态无效')
   if u['role']=='admin' and not u['disabled'] and (role!='admin' or disabled) and c.execute("SELECT COUNT(*) FROM users WHERE role='admin' AND disabled=0").fetchone()[0]<=1:raise Problem(400,'不能移除最后一名有效管理员')
   c.execute('UPDATE users SET role=?,disabled=? WHERE id=?',(role,disabled,id))
   if password is not None:
    if not isinstance(password,str) or not 10<=len(password)<=128:raise Problem(400,'新密码需10–128位')
    c.execute('UPDATE users SET password=? WHERE id=?',(password_hash(password),id))
   if disabled or password or role!=u['role']:c.execute('DELETE FROM sessions WHERE user_id=?',(id,))
  audit('user_updated',self.user['id'],f'target={id}; role={role}; disabled={disabled}; reset={bool(password)}');self.reply(200,{'ok':True})
_cpu=None
def metrics():
 global _cpu
 cpu=None;memory=None
 try:
  parts=list(map(int,Path('/proc/stat').read_text().splitlines()[0].split()[1:]));total=sum(parts[:8]);idle=parts[3]+parts[4]
  if _cpu and total>_cpu[0]:cpu=round(100*(1-(idle-_cpu[1])/(total-_cpu[0])),1)
  _cpu=(total,idle)
  m={line.split(':')[0]:int(line.split()[1])*1024 for line in Path('/proc/meminfo').read_text().splitlines()};memory={'total':m['MemTotal'],'used':m['MemTotal']-m['MemAvailable']}
 except (OSError,ValueError):pass
 disk=shutil.disk_usage(BASE)
 return {'cpu_percent':cpu,'memory':memory,'disk':{'total':disk.total,'used':disk.used},'attachments_bytes':sum(p.stat().st_size for p in UPLOADS.iterdir() if p.is_file()),'time':now()}
def cleanup():
 while True:
  try:
   with db() as c:
    rows=c.execute('SELECT media FROM uploads WHERE created<? AND media NOT IN (SELECT media FROM notes UNION SELECT media FROM note_images)',(time.time()-86400,)).fetchall()
    for r in rows:(UPLOADS/Path(r['media']).name).unlink(missing_ok=True);derivatives.remove(UPLOADS/Path(r['media']).name);c.execute('DELETE FROM uploads WHERE media=?',(r['media'],))
    c.execute('DELETE FROM sessions WHERE expires<?',(time.time(),))
  except Exception:audit('cleanup_error')
  time.sleep(3600)
if __name__=='__main__':
 derivatives.start()
 with db() as c:
  for r in c.execute("SELECT DISTINCT media FROM notes WHERE media_type='video' AND media!=''"):derivatives.enqueue(UPLOADS/Path(r['media']).name)
 metrics();threading.Thread(target=cleanup,daemon=True).start();ThreadingHTTPServer(('127.0.0.1',int(os.environ.get('ATLAS_PORT','3468'))),Handler).serve_forever()
