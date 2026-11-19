import urllib.request,json,re,io,posixpath,subprocess
from pathlib import Path
from PIL import Image
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1]
records=[]
def get(url):return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ZintuigenVR/1.0'}),timeout=90).read()
def save(path,data):
 p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
def record(path,url,license='CC0-1.0',source=None):records.append(dict(file=path,url=url,license=license,source=source or url))
for asset in ['brown_mud','rough_wood','metal_plate']:
 d=json.loads(get('https://api.polyhaven.com/files/'+asset))
 for key,name in [('Diffuse','color'),('nor_gl','normal'),('Rough','roughness')]:
  v=d[key]['1k']['jpg'];p=f'assets/{asset}/{name}.jpg';save(p,get(v['url']));record(p,v['url'],source='https://polyhaven.com/a/'+asset)
for asset in ['approaching_storm','rogland_moonlit_night']:
 d=json.loads(get('https://api.polyhaven.com/files/'+asset));u=d['tonemapped']['url'];im=Image.open(io.BytesIO(get(u)))
 out=io.BytesIO();im.resize((2048,1024)).save(out,format='JPEG',quality=86);p=f'assets/{asset}/sky.jpg';save(p,out.getvalue());record(p,u,source='https://polyhaven.com/a/'+asset)
 v=d['hdri']['1k']['hdr'];p=f'assets/{asset}/environment.hdr';save(p,get(v['url']));record(p,v['url'],source='https://polyhaven.com/a/'+asset)
# Official r180 dependencies only; never replace bundled core.
seen=set()
def addon(path):
 if path in seen:return
 seen.add(path);u='https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/'+path;s=get(u).decode();save('vendor/'+path,s.encode());record('vendor/'+path,u,'MIT')
 for rel in re.findall(r"from\s+['\"]([^'\"]+)",s):
  if rel.startswith('.'):addon(posixpath.normpath(posixpath.join(posixpath.dirname(path),rel)))
for p in ['webxr/XRHandModelFactory.js','webxr/XRControllerModelFactory.js','loaders/RGBELoader.js']:addon(p)
base='https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/'
for side in ['left','right']:
 p='vendor/profiles/generic-hand/'+side+'.glb';save(p,get(base+'generic-hand/'+side+'.glb'));record(p,base+'generic-hand/'+side+'.glb','MIT')
profiles=json.loads(get(base+'profilesList.json'));chosen={k:v for k,v in profiles.items() if k in ['generic-trigger','oculus-touch','oculus-touch-v2','oculus-touch-v3','meta-quest-touch-plus']}
save('vendor/profiles/profilesList.json',json.dumps(chosen).encode());record('vendor/profiles/profilesList.json',base+'profilesList.json','MIT')
for k,v in chosen.items():
 rel=v['path'];data=get(base+rel);save('vendor/profiles/'+rel,data);record('vendor/profiles/'+rel,base+rel,'MIT');d=json.loads(data)
 for layout in d['layouts'].values():
  if 'assetPath' not in layout:continue
  p=posixpath.join(posixpath.dirname(rel),layout['assetPath']);save('vendor/profiles/'+p,get(base+p));record('vendor/profiles/'+p,base+p,'MIT')
# CC0 checked against the license link on each individual recording page.
sounds=[('rain','Q.K.',56306),('wind','Borgory',728737),('fire','kingsrow',181563),('crickets','Vrymaa',734642),('roof','bruno.auzet',736845),('door','DeqstersLab',767041),('steps','JamGrif',554380),('drop','bolkmar',451126),('thunder','Fission9',581124)]
for name,author,id in sounds:
 u=f'https://freesound.org/people/{author}/sounds/{id}/';s=get(u).decode()
 assert 'creativecommons.org/publicdomain/zero/1.0' in s,u
 previews=re.findall(r'https://cdn.freesound.org/previews/[^"\s<>]+-hq.mp3',s);assert previews,u
 raw=ROOT/'assets'/f'{name}-source.mp3';raw.write_bytes(urllib.request.urlopen(urllib.request.Request(previews[0],headers={'Range':'bytes=0-999999'}),timeout=30).read(1000000))
 for channels,suffix in [(1,''),(2,'-bed')]:
  if suffix and name not in ['rain','wind','crickets']:continue
  p=f'assets/audio/{name}{suffix}.ogg';(ROOT/p).parent.mkdir(parents=True,exist_ok=True)
  subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-y','-i',str(raw),'-t','30','-ac',str(channels),'-ar','32000','-c:a','libvorbis','-q:a','3',str(ROOT/p)],check=True)
  record(p,previews[0],source=u)
 raw.unlink()
save('assets/sources.json',json.dumps(records,indent=2).encode())
print('Downloaded',len(records),'local assets/dependencies')

