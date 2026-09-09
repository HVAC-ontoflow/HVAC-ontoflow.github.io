# 포스터에 넣을 QR 코드를 만든다.
#
#     python tools/make_qr.py https://<계정>.github.io/<저장소>/
#
# 만들어지는 것 (qr/ 폴더)
#   qr/ontoflow-qr.svg   인쇄용. 벡터라 포스터를 아무리 크게 뽑아도 깨지지 않는다.
#   qr/ontoflow-qr.png   화면 확인용 (1200px).
#
# 왜 SVG 인가
#   포스터는 2385×3371 px(약 A0)로 뽑힌다. PNG QR 을 그 크기로 확대하면 모듈
#   경계가 흐려져 인식률이 떨어진다. 인쇄물에는 벡터를 쓴다.
#
# 오류정정 수준
#   H(30%)로 둔다. 포스터는 현장에서 접히거나 조명이 반사되고 손가락에 가려진다.
#   URL 이 짧아서 H 를 써도 모듈 수가 크게 늘지 않는다.
#
# 필요한 것: segno (pip install segno)

import os, sys

try:
    import segno
except ImportError:
    sys.exit('segno 가 없습니다.  pip install segno')

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.dirname(HERE)
OUT = os.path.join(WORK, 'qr')

if len(sys.argv) < 2:
    sys.exit('사용법: python tools/make_qr.py <URL>\n'
             '  예:  python tools/make_qr.py https://myid.github.io/ontoflow/')

url = sys.argv[1].strip()
if not url.startswith(('http://', 'https://')):
    sys.exit('URL 은 http:// 또는 https:// 로 시작해야 합니다: ' + url)
if not url.endswith('/') and '.' not in url.rsplit('/', 1)[-1]:
    # GitHub Pages 는 끝의 슬래시가 없으면 한 번 리다이렉트한다. 미리 붙여 둔다.
    url += '/'

os.makedirs(OUT, exist_ok=True)

qr = segno.make(url, error='h', micro=False)
print('URL      : %s' % url)
print('QR 버전  : %s (모듈 %d×%d)  오류정정 H(30%%)'
      % (qr.version, qr.symbol_size(border=0)[0], qr.symbol_size(border=0)[1]))

svg = os.path.join(OUT, 'ontoflow-qr.svg')
png = os.path.join(OUT, 'ontoflow-qr.png')

# 포스터의 딥네이비로 찍는다 (css 의 --accent-deep). 배경은 흰색으로 남긴다 —
# 색 배경 위의 QR 은 스캐너가 명암비를 못 잡는 일이 있다.
qr.save(svg, kind='svg', scale=10, border=4,
        dark='#10437f', light='#ffffff', svgclass=None, lineclass=None)
qr.save(png, kind='png', scale=40, border=4,
        dark='#10437f', light='#ffffff')

for f in (svg, png):
    print('  → %-22s %8d bytes' % (os.path.relpath(f, WORK), os.path.getsize(f)))

print()
print('포스터에는 SVG 를 쓰세요. 한 변 25 mm 이상으로 앉히면 대부분의 휴대폰이')
print('한 번에 읽습니다. 흰 여백(border)은 잘라내지 마세요 — 인식에 필요합니다.')
