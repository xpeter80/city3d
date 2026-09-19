import tempfile,subprocess,os,time,json,urllib.request,urllib.error,http.cookiejar,sqlite3
from pathlib import Path
with tempfile.TemporaryDirectory() as d:
 c=sqlite3.connect(Path(d)/'notes.db');c.execute('CREATE TABLE notes(id INTEGER PRIMARY KEY,city TEXT,name TEXT,message TEXT,created TEXT)');c.execute("INSERT INTO notes VALUES(1,'hangzhou','legacy','历史留言','2026-01-01')");c.commit();c.close()
 origin='http://127.0.0.1:13469'
 p=subprocess.Popen(['python3','notes-server.py'],env={**os.environ,'ATLAS_DATA':d,'ATLAS_PORT':'13469','ATLAS_ORIGINS':origin,'ATLAS_ADMIN_PASSWORD':'Test-Admin-Password'},stdout=subprocess.DEVNULL)
 def client():return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def req(c,path,data=None,method=None,csrf='',raw=None,source=True):
  h={'Content-Type':'application/json','X-CSRF-Token':csrf}
  if source:h['Origin']=origin
  try:
   r=c.open(urllib.request.Request(origin+path,data=raw if raw is not None else json.dumps(data).encode() if data is not None else None,method=method,headers=h));return r.status,json.load(r)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 try:
  time.sleep(.7);g,a,u=client(),client(),client()
  assert req(g,'/api/account/notes')[0]==401
  assert req(g,'/api/upload',raw=b'ID3x')[0]==401
  assert req(g,'/api/notes',{})[0]==401
  status,admin=req(a,'/api/auth/login',{'username':'admin','password':'Test-Admin-Password'});assert status==200;ac=admin['csrf']
  assert req(a,'/api/admin/users/1',{'disabled':1},csrf=ac)[0]==400
  assert req(a,'/api/admin/users/1',{'role':'user'},csrf=ac)[0]==400
  status,user=req(u,'/api/auth/register',{'username':'tester','password':'Test-User-Password','phone':'13800000000'});assert status==200;uc=user['csrf'];uid=user['user']['id']
  assert req(u,'/api/admin/users')[0]==403
  assert req(u,'/api/notes/1',method='DELETE',csrf=uc)[0]==403
  assert req(u,'/api/notes',{},csrf=uc,source=False)[0]==403
  assert req(u,'/api/notes',{})[0]==403
  conf={'limits':{'image':1,'audio':1,'video':1},'sensitive_words':['测试违禁']}
  assert req(a,'/api/admin/config',conf,csrf=ac)[0]==200
  assert req(g,'/api/config')[1]['limits']['video']==1
  note={'city':'hangzhou','place':'0','message':'测试违禁','request_id':'a'*32}
  assert req(u,'/api/notes',note,csrf=uc)[0]==400
  import http.client
  conn=http.client.HTTPConnection('127.0.0.1',13469);conn.request('POST','/api/upload',body=b'',headers={'Origin':origin,'Content-Length':str(1024**2+1),'X-CSRF-Token':uc,'Cookie':'; '.join(x.name+'='+x.value for handler in u.handlers if isinstance(handler,urllib.request.HTTPCookieProcessor) for x in handler.cookiejar)});assert conn.getresponse().status==413;conn.close()
  status,media=req(u,'/api/upload',raw=b'ID3'+b'0'*800,csrf=uc);assert status==201
  note.update(message='解说',category='narration',media=media['media'])
  assert req(u,'/api/notes',note,csrf=uc)[0]==201
  assert req(u,'/api/notes',note,csrf=uc)[0]==200
  mine=req(u,'/api/account/notes')[1];assert mine['total']==1 and mine['stats']['places']==1
  assert req(a,'/api/account/notes')[1]['total']==0
  assert req(u,'/api/account/notes?city=chengdu')[1]['total']==0
  assert req(u,'/api/account/notes?media_type=video')[1]['total']==0
  assert req(u,'/api/auth/profile',{'phone':'bad'},csrf=uc)[0]==400
  assert req(u,'/api/auth/profile',{'phone':'13900000000'},csrf=uc)[0]==200
  assert req(u,'/api/auth/me')[1]['user']['phone']=='13900000000'
  rows=req(u,'/api/notes?city=hangzhou&place=0')[1];assert rows['total']==1 and rows['items'][0]['can_delete']
  assert req(g,'/api/notes?city=hangzhou&place=1')[1]['total']==0
  assert req(g,'/api/notes?city=hangzhou&place=0&playlist=1')[1]['total']==1
  assert req(u,'/api/notes/'+str(rows['items'][0]['id']),method='DELETE',csrf=uc)[0]==200
  photos=[]
  for i in range(2):
   code,img=req(u,'/api/upload',raw=b'\x89PNG\r\n\x1a\n'+bytes([i])*800,csrf=uc);assert code==201;photos.append(img['media'])
  multi={'city':'hangzhou','place':'0','message':'多图手记','images':photos,'request_id':'b'*32}
  assert req(u,'/api/notes',multi,csrf=uc)[0]==201
  assert req(a,'/api/notes',{**multi,'request_id':'c'*32},csrf=ac)[0]==400
  assert req(u,'/api/notes',{**multi,'images':photos*5,'request_id':'d'*32},csrf=uc)[0]==400
  result=req(u,'/api/notes?city=hangzhou&place=0')[1]['items'][0];assert result['images']==photos
  assert req(u,'/api/account/notes')[1]['items'][0]['images']==photos
  assert req(u,'/api/notes/'+str(result['id']),method='DELETE',csrf=uc)[0]==200
  assert all(not (Path(d)/'uploads'/Path(x).name).exists() for x in photos)
  assert req(a,'/api/notes/1',method='DELETE',csrf=ac)[0]==200
  assert req(a,'/api/admin/users/'+str(uid),{'disabled':1},csrf=ac)[0]==200
  assert req(u,'/api/auth/me')[1]['user'] is None
  assert req(a,'/api/admin/metrics')[0]==200
  logs=json.dumps(req(a,'/api/admin/logs')[1]);assert '13800000000' not in logs and 'Test-User-Password' not in logs
  print('PASS: migration, sessions, CSRF, role isolation, last admin, upload limits, sensitive words, idempotency, ownership, disable revocation, monitoring, log redaction')
 finally:p.terminate();p.wait()
