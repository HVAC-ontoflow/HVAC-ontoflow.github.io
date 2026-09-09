# 서체를 이 폴더 안으로 가져온다 — 외부 요청 0건으로 만들기 위한 스크립트.
#
# 왜 필요한가
#   원래는 Google Fonts(IBM Plex Mono)와 jsDelivr(Pretendard)에서 받아왔다.
#   경진대회장 네트워크가 막히면 한글이 시스템 서체로 떨어지고, CDN 쪽이 바뀌면
#   몇 년 뒤에 페이지가 달라 보인다. 레퍼런스 문서도 "오래 둘 페이지라면 라이브러리를
#   zip 안에 넣으라"고 권한다.
#
# 무엇을 하는가
#   1. 페이지가 실제로 쓰는 글자를 전부 모은다 (index.html · js · css)
#   2. Pretendard Variable 원본(2 MB)을 그 글자만 남겨 서브셋한다
#   3. IBM Plex Mono 는 라틴·숫자만 쓰므로 Google 의 latin 서브셋을 그대로 받는다
#   4. fonts/fonts.css 를 쓴다
#
# 언제 다시 돌리는가
#   화면 문구에 새 한글이 들어가면 다시 돌려야 한다. 서브셋에 없는 글자는
#   시스템 서체로 떨어진다. 스크립트가 끝에 빠진 글자를 검사해 알려 준다.
#
#     python tools/build_fonts.py        ← 작업/ 에서 실행 (fontTools · brotli 필요)

import io, os, re, sys, urllib.request
sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.dirname(HERE)
FONTS = os.path.join(WORK, 'fonts')
CACHE = os.path.join(HERE, '_fontcache')
os.makedirs(FONTS, exist_ok=True)
os.makedirs(CACHE, exist_ok=True)

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0 Safari/537.36')

def fetch(url, name):
    """받아서 tools/_fontcache 에 둔다. 다시 돌릴 때 네트워크를 또 쓰지 않는다."""
    dst = os.path.join(CACHE, name)
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        return dst
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=90) as r, open(dst, 'wb') as f:
        f.write(r.read())
    print('   받음 %-46s %8d bytes' % (name, os.path.getsize(dst)))
    return dst


# ── 1. 페이지가 쓰는 글자 모으기 ────────────────────────────────────────
SCAN = ['index.html', 'css/style.css', 'js/data.js', 'js/app.js',
        'js/graph.js', 'js/graph-data.js']
def strip_comments(text, rel):
    """주석은 화면에 안 나온다. 주석의 괘선문자(─ ═)까지 세면 '빠진 글자'
       경고가 실제 문제인지 구분이 안 된다."""
    if rel.endswith(('.js', '.css')):
        text = re.sub(r'/\*.*?\*/', ' ', text, flags=re.S)
        text = re.sub(r'^\s*//.*$', ' ', text, flags=re.M)
    elif rel.endswith('.html'):
        text = re.sub(r'<!--.*?-->', ' ', text, flags=re.S)
    return text

chars = set()
for rel in SCAN:
    p = os.path.join(WORK, rel)
    if os.path.exists(p):
        chars |= set(strip_comments(io.open(p, encoding='utf-8').read(), rel))

# 라틴·숫자·기호는 넉넉히 넣는다 (거의 무게가 없다)
for c in range(0x20, 0x7F):
    chars.add(chr(c))
# 화면에서 쓰는 기호들 — 문구를 조금 고쳐도 깨지지 않도록 미리 넣어 둔다
# Pretendard 에 없는 글자는 넣어도 시스템 서체로 떨어진다. ▸ ∙ ⓐ 가 그렇다 —
# 그래서 화면에서 쓰지 않는다(▸ 는 구축 과정의 'NOW' 마커에서 뺐다).
chars |= set('·—–…→←↑↓≠≈≥≤±×÷✓◆°℃㎡㎥′″“”‘’「」()[]{}%&@#*①②③④⑤⑥⑦⑧⑨⑩')
# 자주 쓰는 한글 조사·어미가 빠지면 문구 수정 때 바로 깨진다. 흔한 음절을 더해 둔다.
chars |= set('가각간갈감강개거건걸검것게격결경계고곡골공과관광그기긴길김깊'
             '나난날남내너널네년노논높누는능니다단달담답대더던데도독동되된두'
             '들등디따때또라락란람래러런럴렁레려력련렬로록론료루르른를리린림'
             '마막만말맞매머먼멀메며면명모목몬무문물미민및바박반받발밝방배백'
             '번벌범법베변별보복본볼봄부북분불붙비빈빠뻐뽑사산살삼상새생서선'
             '설섬성세소속손솔송수순숨쉬스슬습시식신실심십싸써쓰씨아안않알암'
             '압앙앞애야약얀양어언얼업없었에여역연열영예오온올옮와완외요용우'
             '운울움웃원월위유으은을음응의이인일임입있잊자작잔잘잡장재저적전'
             '절점접정제조족존종좌주준줄중즈즉지직진질집짧차착찬참창찾채책처'
             '천철첫청체초총최추축출충치침칭카커컨코쿠크큰클키타탁탄탐태택터'
             '텍토통투트특틀티파판팔퍼페평포표푸품풀프피필하학한할함합해핵행'
             '향허험헤현협형호혹혼홈화확환활황회획효후훨흐흔흘히힘')

print('수집한 글자 %d자 (한글 %d자)'
      % (len(chars), sum(1 for c in chars if '가' <= c <= '힣')))


# ── 2. Pretendard 서브셋 ────────────────────────────────────────────────
print()
print('Pretendard Variable')
PRE_URL = ('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/'
           'packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2')
src_pre = fetch(PRE_URL, 'PretendardVariable.woff2')

from fontTools import subset as ftsubset
from fontTools.ttLib import TTFont

out_pre = os.path.join(FONTS, 'pretendard-subset.woff2')
opts = ftsubset.Options()
opts.flavor = 'woff2'
opts.layout_features = ['*']       # 가변축과 기본 레이아웃 기능은 남긴다
opts.name_IDs = ['*']
opts.notdef_outline = True
opts.recalc_bounds = True
opts.drop_tables = []
font = ftsubset.load_font(src_pre, opts)
subsetter = ftsubset.Subsetter(options=opts)
subsetter.populate(text=''.join(sorted(chars)))
subsetter.subset(font)
ftsubset.save_font(font, out_pre, opts)
font.close()
print('   → fonts/pretendard-subset.woff2  %d bytes (원본 %d)'
      % (os.path.getsize(out_pre), os.path.getsize(src_pre)))

# 빠진 글자 검사 — 서브셋에 없으면 화면에서 시스템 서체로 떨어진다
chk = TTFont(out_pre)
cmap = set()
for t in chk['cmap'].tables:
    cmap |= set(t.cmap.keys())
chk.close()
missing = sorted(c for c in chars if ord(c) not in cmap and c.strip())
if missing:
    print('   ⚠ 서브셋에 없는 글자 %d자: %s' % (len(missing), ''.join(missing[:60])))
else:
    print('   빠진 글자 없음')


# ── 3. IBM Plex Mono ───────────────────────────────────────────────────
# 라틴과 숫자에만 쓰므로 Google 의 latin 서브셋이 정확히 맞는다.
print()
print('IBM Plex Mono')
css_url = ('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:'
           'wght@300;400;500;600&display=swap')
req = urllib.request.Request(css_url, headers={'User-Agent': UA})
with urllib.request.urlopen(req, timeout=60) as r:
    gcss = r.read().decode('utf-8')

# latin 블록만 고른다 (latin-ext · vietnamese 는 쓰지 않는다)
blocks = re.findall(r'/\*\s*([\w\-\[\] ]+)\s*\*/\s*(@font-face\s*\{[^}]*\})', gcss)
plex_faces = []
for name, block in blocks:
    if name.strip() != 'latin':
        continue
    w = re.search(r'font-weight:\s*(\d+)', block)
    u = re.search(r'url\((https://[^)]+\.woff2)\)', block)
    if not (w and u):
        continue
    weight = w.group(1)
    fname = 'plex-mono-%s.woff2' % weight
    fetch(u.group(1), fname)
    with open(os.path.join(CACHE, fname), 'rb') as fsrc, \
         open(os.path.join(FONTS, fname), 'wb') as fdst:
        fdst.write(fsrc.read())
    rng = re.search(r'unicode-range:\s*([^;}]+)', block)
    plex_faces.append((weight, fname, rng.group(1).strip() if rng else None))
plex_faces.sort(key=lambda x: int(x[0]))
print('   가져온 굵기: %s' % ', '.join(w for w, _, _ in plex_faces))
assert plex_faces, 'IBM Plex Mono latin 블록을 못 찾았다'


# ── 4. fonts/fonts.css ─────────────────────────────────────────────────
lines = ["""/* 서체 — 이 폴더 안에서만 불러온다. 외부 요청 0건.
   ============================================================
   tools/build_fonts.py 가 만든 파일이다. 손으로 고치지 말고 스크립트를 다시 돌린다.

   Pretendard 는 이 페이지가 실제로 쓰는 글자만 남긴 서브셋이다. 화면 문구에
   새 한글을 넣으면 서브셋에 없어서 시스템 서체로 떨어지므로, 문구를 고친 뒤에는
   python tools/build_fonts.py 를 다시 돌려야 한다.

   IBM Plex Mono 는 라틴·숫자에만 쓰므로 latin 서브셋만 담았다.
   ============================================================ */
"""]
for weight, fname, rng in plex_faces:
    lines.append("""@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: %s;
  font-display: swap;
  src: url('%s') format('woff2');%s
}""" % (weight, fname, ('\n  unicode-range: %s;' % rng) if rng else ''))

lines.append("""@font-face {
  font-family: 'Pretendard Variable';
  font-style: normal;
  font-weight: 45 920;
  font-display: swap;
  src: url('pretendard-subset.woff2') format('woff2-variations');
}""")

io.open(os.path.join(FONTS, 'fonts.css'), 'w', encoding='utf-8').write(
    '\n\n'.join(lines) + '\n')

print()
total = sum(os.path.getsize(os.path.join(FONTS, f)) for f in os.listdir(FONTS))
print('fonts/ 합계 %d bytes' % total)
for f in sorted(os.listdir(FONTS)):
    print('   %-30s %8d' % (f, os.path.getsize(os.path.join(FONTS, f))))
