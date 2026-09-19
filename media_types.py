def kind(b):
 if b.startswith(b'ID3') or (len(b)>1 and b[0]==255 and b[1]&224==224):return 'mp3','audio'
 if b[:4]==b'RIFF' and b[8:12]==b'WAVE':return 'wav','audio'
 if b[:4]==b'fLaC':return 'flac','audio'
 if b[:4]==b'OggS':return 'ogg','audio'
 if b[4:8]==b'ftyp' and b[8:12] in (b'M4A ',b'M4B '):return 'm4a','audio'
 if b.startswith(b'\xff\xd8\xff'):return 'jpg','image'
 if b.startswith(b'\x89PNG\r\n\x1a\n'):return 'png','image'
 if b[:6] in (b'GIF87a',b'GIF89a'):return 'gif','image'
 if b[:4]==b'RIFF' and b[8:12]==b'WEBP':return 'webp','image'
 if b[4:8]==b'ftyp' and b[8:12] in (b'isom',b'iso2',b'mp41',b'mp42',b'avc1',b'M4V ',b'qt  '):return 'mp4','video'
 if b[:4]==b'\x1aE\xdf\xa3' and b'webm' in b:return 'webm','video'
 return None
