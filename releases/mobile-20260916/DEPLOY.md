# 发布与回滚记录

已发布至 http://xpeter.net:3466/city/ ，仅更新 `/usr/share/caddy/city-atlas/city/index.html` 和 `/usr/share/caddy/city-atlas/floating-player.js`。

远端备份：`/opt/city-atlas/backups/mobile-20260916-231335/`。包含原前端文件、Caddy 主配置与本应用配置、SQLite 在线备份及数据基线清单。数据库完整性检查通过。

本次未修改 Caddy、后端或数据库结构，没有重启服务；上传目录未移动。

## 回滚步骤

通过已授权 SSH 登录服务器，在远端运行以下代码，仅恢复两个前端文件：

```python
from pathlib import Path
import os, shutil
backup = Path('/opt/city-atlas/backups/mobile-20260916-231335')
for name in ['city/index.html', 'floating-player.js']:
    target = Path('/usr/share/caddy/city-atlas') / name
    source = backup / str(target).lstrip('/')
    original = source.stat()
    temp = target.with_name(target.name + '.rollback')
    shutil.copy2(source, temp)
    os.chown(temp, original.st_uid, original.st_gid)
    os.replace(temp, target)
```

然后检查城市页、作品展、个人中心、后台、API 和文件校验和。原城市页 SHA-256：`d48e41a538555fbe43a6faa98bd8c3b4481492c8705be558ae5c78a78cd7ae68`。

前端回滚无需恢复数据库、附件或 Caddy 配置，也无需重启后端；不要覆盖发布后产生的用户数据。
