import json,re,socket,subprocess,sys,time,urllib.request,hashlib,os
from pathlib import Path
root=Path(__file__).resolve().parents[1]
files=[]
for folder,dirs,names in os.walk(root):
 dirs[:]=[d for d in dirs if d not in ['.git','__pycache__']]
 files.extend(Path(folder)/n for n in names)
modules=[p for p in files if p.suffix in ['.js','.mjs']]
for p in modules:subprocess.run(['node','--check',str(p)],check=True,capture_output=True)
for p in modules:
 if 'tools' in p.relative_to(root).parts:continue
 for spec in re.findall(r"(?m)^import\s+(?:[\s\S]*?\s+from\s+)?['\"]([^'\"]+)['\"]",re.sub(r'/\*[\s\S]*?\*/', '', p.read_text(encoding='utf-8-sig'))):
  if spec=='three':continue
  assert spec.startswith('.'),(p,spec)
  assert (p.parent/spec).is_file(),(p,spec)
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
server=subprocess.Popen([sys.executable,'-m','http.server',str(port),'--bind','127.0.0.1'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 for attempt in range(50):
  try:urllib.request.urlopen(f'http://127.0.0.1:{port}/index.html');break
  except OSError:time.sleep(.1)
 for p in files:
  rel=p.relative_to(root).as_posix()
  with urllib.request.urlopen(f'http://127.0.0.1:{port}/'+urllib.request.quote(rel)) as r:
   assert r.status==200,rel
   assert hashlib.sha256(r.read()).digest()==hashlib.sha256(p.read_bytes()).digest(),rel
 print(f'node --check: {len(modules)} modules OK; imports local and resolved')
 print(f'python -m http.server {port}: {len(files)} files HTTP 200; SHA256 equal')
finally:server.terminate();server.wait(timeout=5)
packs=[('Schuilplek',['brown_mud','rough_wood','metal_plate','approaching_storm'],['rain','rain-bed','wind','fire','drop','roof','thunder']),('De plank',['rough_wood','metal_plate','rogland_moonlit_night'],['wind','wind-bed','door']),('Vuurvliegjes',['rogland_moonlit_night'],['crickets','crickets-bed','wind']),('Donker',[],['drop','steps','door','wind','wind-bed'])]
common=sum(p.stat().st_size for p in files if p.relative_to(root).parts[0]!='assets' and 'tools' not in p.relative_to(root).parts)
for name,folders,sounds in packs:
 selected=[p for p in files if any(p.is_relative_to(root/'assets'/folder) for folder in folders)]
 selected += [root/'assets/audio'/f'{sound}.ogg' for sound in sounds]
 size=sum(p.stat().st_size for p in selected)
 print(f'{name}: media {size/1e6:.2f} MB; with shared code/models { (size+common)/1e6:.2f} MB')
print(f'Site total: {sum(p.stat().st_size for p in files)/1e6:.2f} MB; audio: {sum(p.stat().st_size for p in files if p.suffix==".ogg")/1e6:.2f} MB; shared {common/1e6:.2f} MB')

