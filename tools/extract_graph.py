# ontology.ttl 에서 화면에 그릴 서브그래프를 뽑고 레이아웃까지 계산한다.
#
# 런타임에 물리 시뮬레이션을 돌리지 않는 이유:
#   시연 안정성이 우선이고, 포스터 스크린샷은 매번 같은 그림이어야 한다.
#   여기서 힘-지향 배치를 끝내고 좌표를 함께 실어 보내면, 브라우저는 부드러운
#   흔들림과 hover 만 처리하면 된다 — 모바일에서도 프레임이 떨어지지 않는다.

import io, re, json, math, random
import numpy as np

# 이 파일은 작업/tools/ 에 있고 원본은 그 두 단계 위의 레퍼런스/ 에 있다.
# 절대경로를 박아 두면 폴더를 옮기는 순간 죽으므로 자기 위치에서 찾아 올라간다.
#
#     python tools/extract_graph.py        ← 작업/ 에서 실행
#
# 필요한 것: numpy (배치 계산). 원본 ontology.ttl 은 읽기만 한다.
import os
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.dirname(HERE)                 # 작업/
ROOT = os.path.dirname(WORK)                 # 프로젝트 루트
TTL_PATH = os.path.join(ROOT, '레퍼런스', 'hvac 경진대회', 'ontology.ttl')
OUT_PATH = os.path.join(WORK, 'js', 'graph-data.js')

ttl = io.open(TTL_PATH, encoding='utf-8').read()

# ── 주어 블록으로 자른다 ────────────────────────────────────────────────
# sourceExcerpt 의 여러 줄 리터럴 안에도 열 0 에서 시작하는 줄이 있어서
# 단순히 '\n비공백' 으로 자르면 블록이 깨진다. """ ... """ 를 먼저 가린다.
masked = re.sub(r'"""(?:.|\n)*?"""', lambda m: ' ' * len(m.group(0)), ttl)

blocks = {}
for m in re.finditer(r'^((?:inst|src):\S+) (a |hvo:|brick:)', masked, re.M):
    subj = m.group(1)
    start = m.start()
    # '^\S' 를 re.M 으로 쓰면 문자열 시작(줄 중간)에서도 걸려 블록이 즉시 끊긴다.
    # 다음 주어는 반드시 줄바꿈 뒤에 오므로 개행+비공백으로 찾는다.
    nxt = re.search(r'\n\S', masked[m.end():])
    end = m.end() + (nxt.start() + 1 if nxt else len(masked) - m.end())
    blocks[subj] = ttl[start:end]

print('블록', len(blocks))

def cls_of(b):
    m = re.search(r'\ba (\S+?)\s*[;.]', b)
    return m.group(1) if m else None

def objs(b, pred):
    """pred 의 목적어들 — 여러 줄에 걸친 콤마 목록을 따라간다"""
    m = re.search(re.escape(pred) + r'\s+((?:(?:inst|src|brick|hvo):\S+?)(?:\s*,\s*(?:inst|src|brick|hvo):\S+?)*)\s*[;.]',
                  b, re.S)
    if not m:
        return []
    return [x.strip() for x in m.group(1).split(',') if x.strip()]

def lit(b, pred):
    m = re.search(re.escape(pred) + r'\s+"([^"]*)"', b)
    return m.group(1) if m else None

def num(b, pred):
    m = re.search(re.escape(pred) + r'\s+(-?[\d.]+)', b)
    return m.group(1) if m else None

# ── 씨앗: 장비 ───────────────────────────────────────────────────────────
EQ_CLASSES = {
    'hvo:UnderfloorAirHandlingUnit':        'eq',
    'brick:Dedicated_Outdoor_Air_System_Unit': 'eq',
    'brick:Air_Handling_Unit':              'eq',
    'brick:Fan_Coil_Unit':                  'eq',
    'brick:Exhaust_Fan':                    'part',
}
PART_CLASSES = {
    'brick:Supply_Fan': 'part', 'brick:Return_Fan': 'part', 'brick:Exhaust_Fan': 'part',
    'brick:Motor': 'part', 'brick:Fan': 'part',
    'brick:Hot_Water_Coil': 'part', 'brick:Chilled_Water_Coil': 'part',
    'brick:Coil': 'part', 'brick:Filter': 'part', 'brick:Pre_Filter': 'part',
    'brick:Damper': 'part',
}

equipment = [s for s, b in blocks.items()
             if cls_of(b) in EQ_CLASSES and s.startswith('inst:')]
equipment.sort()
print('장비 후보', len(equipment))

# 데모에 쓰는 세 대는 반드시 넣고, 나머지는 고르게 섞어 넣는다.
must = ['inst:ZHUA01', 'inst:ZHUA02', 'inst:OHUA03']
rest = [e for e in equipment if e not in must]
random.seed(14)          # 14회 경진대회. 매번 같은 그림이 나와야 한다.
random.shuffle(rest)
seeds = must + rest[:44]

# ── 서브그래프 수집 ─────────────────────────────────────────────────────
nodes = {}       # id -> dict(t=type, l=label, s=status)
edges = set()    # (a, b, pred)

def add_node(nid, t, label=None, status=None):
    if nid not in nodes:
        nodes[nid] = {'t': t, 'l': label or nid.split(':', 1)[1], 's': status}
    return nid

def add_edge(a, b, p):
    if a in nodes and b in nodes and a != b:
        edges.add((a, b, p))

# ── 도면 시트 번호 가명화 ─────────────────────────────────────────────
# 이 페이지는 공개 URL 로 배포되므로, 도면 번호대(MA-3004~3031)가 그대로
# 드러나면 도면 소유자를 특정할 수 있다. 세트별로 문자를, 세트 안에서 순번을
# 붙여 SCH-A01 … 형태로 바꾼다. 되돌리려면 아래 표를 거꾸로 읽으면 된다.
#
#   MA-3004~3015 (업무)     → SCH-A01~A12
#   MA-3016~3020 (컨벤션)   → SCH-B01~B05
#   MA-3021~3025 (판매시설) → SCH-D01~D05
#   MA-3026~3031 (호텔)     → SCH-C01~C06
SHEET_SETS = [(3004, 3015, 'A'), (3016, 3020, 'B'),
              (3021, 3025, 'D'), (3026, 3031, 'C')]

def sheet_alias(page):
    """'MA-3006' → 'SCH-A03'. 아는 번호대가 아니면 세트 없이 순번만 지운다."""
    try:
        num = int(page.split('MA-')[-1])
    except ValueError:
        return 'SCH-??'
    for lo, hi, letter in SHEET_SETS:
        if lo <= num <= hi:
            return 'SCH-%s%02d' % (letter, num - lo + 1)
    return 'SCH-X%02d' % (num % 100)

STATUS_T = {'VERIFIED': 'vOK', 'DIVERGENT': 'vNO', 'TOLERANCE_OK': 'vTOL'}

for eq in seeds:
    b = blocks.get(eq)
    if not b:
        continue
    tag = lit(b, 'hvo:equipmentTag') or eq.split(':', 1)[1]
    add_node(eq, 'eq', tag)

    # 부품
    for p in objs(b, 'brick:hasPart'):
        pb = blocks.get(p)
        if not pb:
            continue
        add_node(p, PART_CLASSES.get(cls_of(pb), 'part'), p.split(':', 1)[1])
        add_edge(eq, p, 'hasPart')

    # 담당 존
    for z in objs(b, 'hvo:serves'):
        add_node(z, 'zone', z.split(':', 1)[1])
        add_edge(eq, z, 'serves')

    # 공간
    for r in objs(b, 'brick:hasLocation'):
        add_node(r, 'space', r.split(':', 1)[1])
        add_edge(eq, r, 'hasLocation')

    # 값 노드 — 교차검증·불일치·허용오차만. 단일출처 4천 개를 다 뿌리면
    # 그림이 아니라 안개가 된다. 장비당 최대 5개.
    picked = 0
    for qv in objs(b, 'hvo:hasQuantityValue'):
        if picked >= 5:
            break
        qb = blocks.get(qv)
        if not qb:
            continue
        st = lit(qb, 'hvo:valueStatus')
        if st not in STATUS_T:
            continue
        prop = (lit(qb, 'hvo:valueOfProperty') or '').replace('hvo:', '')
        val = num(qb, 'hvo:totalValue') or lit(qb, 'hvo:totalValue') or ''
        if val and re.match(r'^-?\d+\.0$', val):
            val = val[:-2]
        label = (('{:,}'.format(int(val)) if re.match(r'^-?\d+$', val) else val) or prop)
        add_node(qv, STATUS_T[st], label, st)
        add_edge(eq, qv, 'hasQuantityValue')
        picked += 1
        # 값 → 출처
        for sr in objs(qb, 'hvo:sourcedFrom')[:2]:
            sb = blocks.get(sr)
            if not sb:
                continue
            page = lit(sb, 'hvo:sourcePage') or ''
            drw = lit(sb, 'hvo:sourceDrawing') or ''
            lab = sheet_alias(page) if page.startswith('MA-') else (
                  ('계산서 p.' + page) if page else drw[:16])
            add_node(sr, 'src', lab)
            add_edge(qv, sr, 'sourcedFrom')

    # 선정근거 → 계산단계 → 설계조건
    for ba in objs(b, 'hvo:selectedBy'):
        bb = blocks.get(ba)
        if not bb:
            continue
        add_node(ba, 'basis', ba.split(':', 1)[1].replace('_BASIS', ' BASIS'))
        add_edge(eq, ba, 'selectedBy')
        for cs in objs(bb, 'hvo:derivedFrom')[:4]:
            cb = blocks.get(cs)
            if not cb:
                continue
            sb_ = lit(cb, 'hvo:sourceBasis') or ''
            lab = sb_.split(':')[0][:22] if sb_ else 'CalculationStep'
            add_node(cs, 'calc', lab)
            add_edge(ba, cs, 'derivedFrom')
            for dc in objs(cb, 'hvo:basedOn'):
                dbk = blocks.get(dc)
                if not dbk:
                    continue
                # 라벨은 ABox 의 실제 토큰을 그대로 쓴다.
                # .title() 을 걸면 GEN 이 'Gen' 이 되어 무슨 뜻인지 알 수 없다.
                nm = dc.split(':', 1)[1]
                nm = nm.split('_DC_')[-1] if '_DC_' in nm else nm
                add_node(dc, 'cond', nm)
                add_edge(cs, dc, 'basedOn')
            for sr in objs(cb, 'hvo:sourcedFrom')[:1]:
                sb2 = blocks.get(sr)
                if not sb2:
                    continue
                page = lit(sb2, 'hvo:sourcePage') or ''
                lab = sheet_alias(page) if page.startswith('MA-') else (
                      ('계산서 p.' + page) if page else 'SourceReference')
                add_node(sr, 'src', lab)
                add_edge(cs, sr, 'sourcedFrom')

    # 장비 자신의 출처
    for sr in objs(b, 'hvo:sourcedFrom')[:3]:
        sb3 = blocks.get(sr)
        if not sb3:
            continue
        page = lit(sb3, 'hvo:sourcePage') or ''
        lab = sheet_alias(page) if page.startswith('MA-') else (
              ('계산서 p.' + page) if page else 'SourceReference')
        add_node(sr, 'src', lab)
        add_edge(eq, sr, 'sourcedFrom')

# 고립 노드 제거
deg = {}
for a, b_, p in edges:
    deg[a] = deg.get(a, 0) + 1
    deg[b_] = deg.get(b_, 0) + 1
nodes = {k: v for k, v in nodes.items() if deg.get(k, 0) > 0}
edges = {e for e in edges if e[0] in nodes and e[1] in nodes}

ids = sorted(nodes.keys())
idx = {k: i for i, k in enumerate(ids)}
E = [(idx[a], idx[b], p) for a, b, p in sorted(edges)]

print('노드', len(ids), '엣지', len(E))
from collections import Counter
print('종류별', Counter(nodes[k]['t'] for k in ids))

# ── 배치: 클래스별 동심원 + 트리 각도 ──────────────────────────────────
#
# 처음에는 힘-지향 배치를 썼다. 484개 노드를 그렇게 놓으면 결과가 헤어볼이다 —
# 색을 어떻게 조정해도 지저분하다. 구조가 있는 데이터를 구조 없이 놓았기
# 때문이다. 그래서 배치를 바꿨다.
#
#   반지름은 클래스가 정한다   장비가 가운데, 출처가 테두리.
#                              바깥으로 갈수록 근거에 가까워진다.
#   각도는 트리가 정한다       장비마다 부채꼴을 하나 받고, 그 장비에 매달린
#                              것들은 그 부채꼴 안에만 놓인다.
#
# 그래서 대부분의 엣지가 같은 각도의 짧은 방사선이 되고, 여러 장비가 공유하는
# 출처만 현(弦)으로 남는다. 그 현은 렌더러가 중심 쪽으로 당겨 묶는다(번들링).

from collections import defaultdict

# 클래스별 반지름 (R 에 대한 비율). 바깥으로 갈수록 근거·출처.
# 값은 "띠의 중심"이다. 아래 §6 에서 노드마다 이 값을 흔들어 띠로 번지게 한다.
# 그래서 고리 사이에 산포가 들어갈 자리를 남겨 두었다.
RING = {
    'eq':    0.300,
    'basis': 0.400,
    'calc':  0.500,
    'cond':  0.580,
    'part':  0.685, 'zone': 0.685, 'space': 0.685,
    'vOK':   0.820, 'vNO': 0.820, 'vTOL': 0.820,
    'src':   0.960,
}

adj_child = defaultdict(list)          # 부모 → 자식 (방향 있는 엣지 그대로)
for a, b_, p in E:
    adj_child[a].append(b_)

types = [nodes[k]['t'] for k in ids]
labels = [nodes[k]['l'] for k in ids]

# ── 1. 트리 만들기 ──
# 장비를 1레벨로 두고 너비 우선으로 내려가며 처음 만난 부모만 트리 부모로 쓴다.
# 나머지 엣지(공유 출처 등)는 트리에 넣지 않고 현으로 남긴다.
eq_idx = [i for i, t in enumerate(types) if t == 'eq']
# 이름 순으로 정렬해 같은 계열 장비(ZHUA·OHUA·EF·FCU)가 원 위에서 붙어 있게 한다
eq_idx.sort(key=lambda i: labels[i])

parent = {}
kids = defaultdict(list)
seen = set(eq_idx)
frontier = list(eq_idx)
while frontier:
    nxt = []
    for u in frontier:
        for v in adj_child[u]:
            if v in seen:
                continue
            seen.add(v)
            parent[v] = u
            kids[u].append(v)
            nxt.append(v)
    frontier = nxt

# 트리에 닿지 않은 노드가 있으면 차수가 가장 큰 이웃에 붙인다
for i in range(len(ids)):
    if i not in seen:
        cand = [a for a, b_, p in E if b_ == i] + [b_ for a, b_, p in E if a == i]
        if cand:
            parent[i] = cand[0]
            kids[cand[0]].append(i)
        seen.add(i)

# 자식은 클래스(반지름) 다음 이름 순으로 — 같은 고리의 것들이 뭉쳐 놓인다
for u in kids:
    kids[u].sort(key=lambda v: (RING.get(types[v], .9), labels[v]))

# ── 2. 잎 수 세기 ── 부채꼴 폭의 기준
leaves = {}
def count_leaves(u):
    if u in leaves:
        return leaves[u]
    if not kids[u]:
        leaves[u] = 1
    else:
        leaves[u] = sum(count_leaves(v) for v in kids[u])
    return leaves[u]
total_leaves = sum(count_leaves(u) for u in eq_idx)

# ── 3. 부채꼴 나누기 ──
# 장비 사이에 아주 작은 틈(GAP)을 남겨 계열이 눈으로 갈라져 보이게 한다.
ang = [0.0] * len(ids)
TWO_PI = 2 * math.pi
GAP = TWO_PI * 0.0016

def assign(u, a0, a1):
    ang[u] = (a0 + a1) / 2.0
    if not kids[u]:
        return
    span = a1 - a0
    at = a0
    for v in kids[u]:
        w = span * leaves[v] / leaves[u]
        assign(v, at, at + w)
        at += w

cursor = -math.pi / 2.0          # 12시 방향에서 시작
for u in eq_idx:
    w = TWO_PI * leaves[u] / total_leaves
    assign(u, cursor + GAP / 2, cursor + w - GAP / 2)
    cursor += w

# ── 4. 같은 고리에서 너무 붙은 것 떼어내기 ──
# 부채꼴이 좁은 장비에서는 자식이 한 점에 겹친다. 고리별로 각도를 정렬해
# 최소 간격을 확보한다. 반지름은 건드리지 않으므로 고리 구조는 유지된다.
R_MAX = 470.0
by_ring = defaultdict(list)
for i, t in enumerate(types):
    by_ring[RING.get(t, 0.9)].append(i)

for r_norm, group in by_ring.items():
    if len(group) < 2:
        continue
    circ = TWO_PI * r_norm * R_MAX
    min_gap = min(TWO_PI / len(group), 10.5 / max(circ / TWO_PI, 1e-6))
    group.sort(key=lambda i: ang[i])
    for _ in range(240):
        moved = 0.0
        for a in range(len(group)):
            b = (a + 1) % len(group)
            ia, ib = group[a], group[b]
            d = ang[ib] - ang[ia]
            if b == 0:
                d += TWO_PI
            if d < min_gap:
                push = (min_gap - d) / 2
                ang[ia] -= push
                ang[ib] += push
                moved += push
        if moved < 1e-6:
            break

# ── 5. 씨앗 좌표 ── 원이 찌그러지면 안 되므로 논리 공간을 정사각형으로 둔다
CX = CY = 500.0
pos = np.zeros((len(ids), 2))
r_target = np.zeros(len(ids))
for i, t in enumerate(types):
    r = RING.get(t, 0.9) * R_MAX
    r_target[i] = r
    pos[i, 0] = CX + math.cos(ang[i]) * r
    pos[i, 1] = CY + math.sin(ang[i]) * r

# ── 6. 확산 ────────────────────────────────────────────────────────────
# 완벽한 동심원은 너무 기계적으로 보인다. 그래서 두 가지를 한다.
#
#   ① 목표 반지름 자체를 흔든다 — 고리가 선이 아니라 띠가 된다.
#      반발력만으로는 외곽이 퍼지지 않는다. 둘레가 길어서 이웃 간격이 이미
#      넓고, 밀어내는 힘이 반지름 방향으로 거의 작용하지 않기 때문이다
#      (실측: 반발력만 키웠을 때 part 고리의 반지름 편차가 0.9 였다).
#      깊이(depth)도 조금 섞어, 같은 부모의 자식이라도 다른 자리에 앉는다.
#
#   ② 그 상태에서 짧은 이완을 돌린다 — 이웃끼리 밀어내고, 엣지는 당기고,
#      자기 목표 반지름으로는 느슨한 스프링이 붙잡는다.
#
# 처음의 순수 힘-지향 배치와 다른 점은 시작점이다. 무작위에서 출발하면 484개
# 노드가 헤어볼로 수렴하지만, 방사형에서 출발하면 위상이 이미 풀려 있어서
# 이완이 엉키지 않고 흩어지기만 한다.
rlx = np.random.default_rng(14)

# 트리 깊이
depth = {}
def dep(i):
    if i in depth:
        return depth[i]
    depth[i] = 0 if i not in parent else dep(parent[i]) + 1
    return depth[i]
for i in range(len(ids)):
    dep(i)

SCATTER = 0.055          # 띠의 두께 (R 에 대한 비율, 표준편차)
ANG_JIT = 0.035          # 각도 흔들림 (rad)
K_REP   = 50.0           # 이웃을 밀어내는 세기
K_ATT   = 0.055          # 엣지가 당기는 세기
K_RAD   = 0.22           # 자기 띠로 되돌리는 세기 — 작을수록 더 퍼진다
L_EDGE  = 25.0           # 엣지의 이상 길이

sc = np.clip(rlx.normal(0, SCATTER, len(ids)), -2.4 * SCATTER, 2.4 * SCATTER)
for i in range(len(ids)):
    r_target[i] = RING.get(types[i], 0.9) * R_MAX *                   (1 + sc[i] + (depth[i] % 3 - 1) * 0.022)

jit = rlx.normal(0, ANG_JIT, len(ids))
for i in range(len(ids)):
    pos[i, 0] = CX + math.cos(ang[i] + jit[i]) * r_target[i]
    pos[i, 1] = CY + math.sin(ang[i] + jit[i]) * r_target[i]

A = np.zeros((len(ids), len(ids)), dtype=np.float32)
for a_, b_, p_ in E:
    A[a_, b_] = A[b_, a_] = 1.0

for it in range(170):
    d = pos[:, None, :] - pos[None, :, :]
    dist2 = (d ** 2).sum(-1) + 1.0
    inv2 = 1.0 / dist2
    np.fill_diagonal(inv2, 0.0)
    # 반발 — 1/d² 이라 가까운 쌍에서만 세게 작용한다
    force = ((K_REP * inv2)[:, :, None] * d).sum(axis=1)
    # 인장 — 엣지만, 이상 길이보다 멀 때만
    dist = np.sqrt(dist2)
    stretch = np.maximum(dist - L_EDGE, 0.0) * A
    force -= K_ATT * ((stretch / dist)[:, :, None] * d).sum(axis=1)
    # 띠 스프링 — 반지름 방향으로만
    rel = pos - np.array([CX, CY])
    rnow = np.sqrt((rel ** 2).sum(-1)) + 1e-9
    force -= K_RAD * ((rnow - r_target) * 6.0)[:, None] * (rel / rnow[:, None])
    # 한 걸음 제한 — 튀어나가지 않게
    mag = np.sqrt((force ** 2).sum(-1))[:, None] + 1e-9
    pos += force / mag * np.minimum(mag, min(9.0, 90.0 / (it + 9)))

# 이완이 전체를 조금 부풀린다. 가장 바깥이 R_MAX 에 닿도록 되돌린다.
rel = pos - np.array([CX, CY])
rmax_now = np.sqrt((rel ** 2).sum(-1)).max()
pos = np.array([CX, CY]) + rel * (R_MAX * 0.995 / rmax_now)

# 얼마나 퍼졌는지 — 클래스별 반지름이 선이 아니라 띠여야 한다
rel = pos - np.array([CX, CY])
rn = np.sqrt((rel ** 2).sum(-1))
dd = np.sqrt(((pos[:, None, :] - pos[None, :, :]) ** 2).sum(-1))
np.fill_diagonal(dd, 1e9)
print('  최근접 이웃 거리  중앙 %.1f · 최소 %.1f · 6 미만 %d개'
      % (float(np.median(dd.min(axis=1))), float(dd.min()), int((dd.min(axis=1) < 6).sum())))
for t in ['eq', 'part', 'vOK', 'src']:
    sel = [i for i, tt in enumerate(types) if tt == t]
    if sel:
        print('  %-5s 띠 %3.0f~%3.0f (평균 %3.0f, 두께 %.1f)'
              % (t, rn[sel].min(), rn[sel].max(), rn[sel].mean(), rn[sel].std()))

# 확산 뒤의 실제 각도로 갱신한다 — 렌더러가 회전과 라벨 방향에 이 값을 쓴다
for i in range(len(ids)):
    ang[i] = math.atan2(pos[i, 1] - CY, pos[i, 0] - CX)

degree = np.zeros(len(ids))
for a, b_, p in E:
    degree[a] += 1
    degree[b_] += 1

# 트리 엣지와 현을 구분해 둔다 — 렌더러는 현만 중심으로 당겨 묶는다
tree_edge = []
for k, (a, b_, p) in enumerate(E):
    tree_edge.append(1 if parent.get(b_) == a else 0)
print('트리 엣지 %d · 현 %d' % (sum(tree_edge), len(E) - sum(tree_edge)))

out_nodes = []
for i, k in enumerate(ids):
    nd = nodes[k]
    out_nodes.append({
        't': nd['t'],
        'l': nd['l'],
        'x': round(float(pos[i, 0]), 1),
        'y': round(float(pos[i, 1]), 1),
        'a': round(float(ang[i]), 4),          # 각도 — 렌더러가 라벨을 눕히는 데 쓴다
        'd': int(degree[i]),
    })

payload = {
    'w': 1000, 'h': 1000,
    'cx': CX, 'cy': CY, 'r': R_MAX,
    'rings': {t: RING[t] for t in RING},
    'nodes': out_nodes,
    # [부모, 자식, 술어, 트리엣지여부]
    'edges': [[a, b_, p, tree_edge[k]] for k, (a, b_, p) in enumerate(E)],
}

js = '''/* 온톨로지 서브그래프 — ontology.ttl 에서 뽑아낸 실제 개체와 관계
   ============================================================
   손으로 만든 그림이 아니다. 장비 %d대를 씨앗으로 삼아 hasPart · serves ·
   hasLocation · hasQuantityValue · selectedBy · derivedFrom · basedOn ·
   sourcedFrom 을 따라가며 모은 부분 그래프다.

   값 노드는 교차검증(VERIFIED) · 불일치(DIVERGENT) · 허용오차(TOLERANCE_OK)
   인 것만 담았다 — 단일출처 2,614개까지 뿌리면 그림이 아니라 안개가 된다.

   ── 배치 ──
   x, y 는 미리 계산해 굳힌 좌표다. 브라우저에서 물리를 돌리지 않는다.
   포스터 스크린샷이 매번 같은 그림이어야 하고, 휴대폰에서 프레임이 떨어지면
   안 되기 때문이다.

   힘-지향 배치를 먼저 써 봤고, 484개 노드에서는 헤어볼이 되었다. 그래서
   구조를 배치로 드러내는 방식으로 바꿨다 —

     반지름은 클래스가 정한다   장비(%.3f)가 가운데, 출처(%.3f)가 테두리
     각도는 트리가 정한다       장비마다 부채꼴 하나, 그 아래 것은 그 안에만

   덕분에 엣지 %d개 중 %d개가 같은 각도의 짧은 방사선이고, 여러 장비가
   공유하는 출처만 현으로 남는다. edges 의 네 번째 값이 그 구분이다
   (1 = 트리 엣지, 0 = 현). 렌더러는 현만 중심 쪽으로 당겨 묶는다.

   노드 %d · 엣지 %d
   ============================================================ */

const GRAPH = %s;
''' % (len(seeds), RING['eq'], RING['src'],
       len(E), sum(tree_edge), len(out_nodes), len(E),
       json.dumps(payload, ensure_ascii=False, separators=(',', ':')))

io.open(OUT_PATH, 'w', encoding='utf-8').write(js)
print('wrote', OUT_PATH, len(js), 'bytes')
