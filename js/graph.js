/* 온톨로지 그래프 렌더러 — canvas 2D, 외부 라이브러리 없음
   ============================================================
   graph-data.js 의 GRAPH(노드 484 · 엣지 832)를 그린다.

   ── 왜 방사형인가 ──
   처음에는 힘-지향 배치로 그렸다. 484개 노드를 그렇게 놓으면 결과가
   헤어볼이고, 색을 어떻게 만져도 지저분하다. 구조가 있는 데이터를 구조 없이
   놓았기 때문이다. 그래서 배치를 바꿨다(tools/extract_graph.py) —

     반지름은 클래스가 정한다   HVAC 설비가 가운데, 출처가 테두리
     각도는 트리가 정한다       설비마다 부채꼴 하나, 그 아래 것은 그 안에만

   그래서 엣지 832개 중 437개가 짧은 방사선이 되고, 나머지 현도 각도차가
   중앙값 0.06 rad 로 거의 방사선에 가깝다. 정돈되어 보이는 것은 색이 아니라
   이 배치 덕분이다.

   다만 정확한 동심원은 기계적으로 보인다. 그래서 클래스마다 목표 반지름을
   흔들어 고리를 두께 20 남짓의 '띠'로 번지게 하고, 그 상태에서 짧은 이완을
   돌렸다 — 구조는 남고 그림은 퍼진다. 자세한 것은 추출 스크립트 §6.

   ── 움직임 ──
   물리 시뮬레이션을 브라우저에서 돌리지 않는다. 좌표는 이미 굳어 있고,
   화면에서는 바퀴 전체가 아주 천천히 돌고 노드가 미세하게 숨쉰다.
   방사형에서 회전은 구조를 흐트러뜨리지 않는 유일한 움직임이다 — 좌우로
   흔들면 고리가 무너져 다시 헤어볼이 된다.

   두 가지 모드로 쓴다.
     hero : 히어로 배경. 상호작용 없음, 흐리게
     map  : 온톨로지 지도 섹션. 커서를 올리면 이웃을 밝히고 이름을 보여준다

   외부 CDN 을 쓰지 않는 것은 레퍼런스 문서의 권고를 따른 것이다 — 남의 서버에서
   불러온 스크립트는 그쪽이 바뀌면 같이 죽는다. 이 파일은 자기 완결이다.
   ============================================================ */
(function (global) {
  'use strict';

  /* ── 종류별 색과 이름 ──
     파란 계열이 화면을 지배하고, 색을 따로 쓰는 것은 값의 검증 상태 셋뿐이다.
     색은 장식이 아니라 값이다. */
  var TYPES = {
    eq:    { c: '#0d3a6d', r: 3.8, ko: 'HVAC 설비',       en: 'HVAC equipment' },
    basis: { c: '#1a5fb4', r: 3.4, ko: '선정근거',         en: 'Design basis' },
    calc:  { c: '#3f6f9f', r: 3.0, ko: '계산단계',         en: 'Calculation step' },
    cond:  { c: '#93b0cc', r: 2.7, ko: '설계조건',         en: 'Design condition' },
    part:  { c: '#4a7fc0', r: 2.7, ko: '부품',            en: 'Part' },
    zone:  { c: '#7aa6d4', r: 2.9, ko: '존',              en: 'Zone' },
    space: { c: '#b0c4d8', r: 2.9, ko: '공간',            en: 'Space' },
    vOK:   { c: '#0f7a4f', r: 2.8, ko: '값 · 교차검증',    en: 'Value · cross-validated' },
    vNO:   { c: '#c2560c', r: 2.8, ko: '값 · 불일치',      en: 'Value · divergent' },
    vTOL:  { c: '#0d7490', r: 2.8, ko: '값 · 허용오차 내',  en: 'Value · within tolerance' },
    src:   { c: '#9aa3ae', r: 2.3, ko: '출처',            en: 'Source' }
  };

  /* 범례 순서 — 가운데 고리부터 바깥 고리 순. 그림의 반지름 순서와 같다. */
  var LEGEND = ['eq', 'basis', 'calc', 'cond', 'part', 'zone', 'vOK', 'vNO', 'vTOL', 'src'];

  var reduced = global.matchMedia &&
                global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function create(canvas, opts) {
    opts = opts || {};
    var mode = opts.mode || 'map';
    var isHero = mode === 'hero';
    var ctx = canvas.getContext('2d');

    var N = GRAPH.nodes, E = GRAPH.edges;
    var CX = GRAPH.cx, CY = GRAPH.cy, R0 = GRAPH.r;

    /* 이웃 목록 — hover 에서 1-hop 을 밝히는 데 쓴다 */
    var nbr = N.map(function () { return []; });
    for (var e = 0; e < E.length; e++) {
      nbr[E[e][0]].push(e);
      nbr[E[e][1]].push(e);
    }

    /* 극좌표를 그대로 들고 간다. 회전은 각도에 더하기만 하면 되고
       고리(반지름)는 절대 흐트러지지 않는다. */
    var ang0 = N.map(function (n) { return n.a; });
    var rad0 = N.map(function (n) {
      return Math.sqrt((n.x - CX) * (n.x - CX) + (n.y - CY) * (n.y - CY));
    });
    var brPh = N.map(function (n, i) { return (i * 2.399963) % 6.2832; });

    var view = { s: 1, cx: 0, cy: 0, w: 0, h: 0, R: 1 };
    var t0 = null, raf = null, running = false, rot = 0;
    var hover = -1, hoverEdges = null, hoverNodes = null;

    function resize() {
      var box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      canvas.width  = Math.round(box.width * dpr);
      canvas.height = Math.round(box.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      view.w = box.width; view.h = box.height;

      /* 원은 찌그러뜨리지 않는다 — 가로세로 같은 배율만 쓴다.
         지도는 전부 담고, 히어로는 조금 넘치게 두어 위아래가 잘린다. */
      var fit = Math.min(box.width, box.height) / (R0 * 2);
      if (isHero) {
        /* 확대하면(1.4배로 해 봤다) 화면에 남는 것이 방사선 줄무늬뿐이어서
           구조가 읽히지 않는다. 바퀴 전체가 들어오는 배율로 두고 오른쪽으로
           살짝 밀어, 미리보기 패널 뒤에서 반쯤 드러나게 한다. */
        view.s = fit * 1.02;
        view.cx = box.width * 0.575;
        view.cy = box.height * 0.42;
      } else {
        view.s = fit * 0.97;
        view.cx = box.width / 2;
        view.cy = box.height / 2;
      }
      view.R = R0 * view.s;
    }

    /* 극좌표 → 화면 좌표 */
    function P(i, prog, tt) {
      var a = ang0[i] + rot, r = rad0[i];
      if (prog < 1) {
        /* 등장 — 바깥에서 제 고리로 모인다. 결정적이라 매번 같다. */
        var p = ease(Math.min(1, Math.max(0, prog * 1.4 - (i % 32) * 0.009)));
        r = R0 * 1.3 * (1 - p) + r * p;
        a += (1 - p) * 0.2;
      } else if (!reduced) {
        r += Math.sin(tt * 0.5 + brPh[i]) * 1.5;
      }
      return { x: view.cx + Math.cos(a) * r * view.s,
               y: view.cy + Math.sin(a) * r * view.s };
    }

    function draw() {
      /* 시간은 rAF 타임스탬프가 아니라 벽시계로 잰다.
         rAF 로 재면 브라우저가 프레임을 아껴 주는 상황(백그라운드 탭 ·
         인쇄 · 스크린샷 캡처)에서 등장 애니메이션이 중간에 멈춘 채로 남는다.
         실제로 헤드리스 캡처에서 프레임이 세 번만 돌아 그래프가 투명한
         상태로 찍혔다. 벽시계를 쓰면 늦게 한 프레임만 그려도 완성된 그림이 된다. */
      var now = Date.now();
      if (t0 === null) t0 = now;
      var tt = (now - t0) / 1000;
      var prog = reduced ? 1 : Math.min(1, tt / 2.1);
      /* 아주 느리게. 살아 있다는 것만 보이면 된다. */
      if (!reduced) rot = tt * (isHero ? 0.0075 : 0.004);

      ctx.clearRect(0, 0, view.w, view.h);
      var dim = hover >= 0;

      /* 고리 안내선은 그리지 않는다. 노드가 고리 위에 정확히 앉아 있을 때는
         구조를 알려 주는 선이었지만, 지금은 각 클래스가 두께 20 남짓의 띠로
         번져 있어서(tools/extract_graph.py §6) 원을 그으면 노드가 선을 빗나간
         것처럼 보인다. 구조는 노드의 분포가 스스로 말한다. */

      var pt = new Array(N.length);
      for (var i = 0; i < N.length; i++) pt[i] = P(i, prog, tt);

      /* ── 엣지 ──
         트리 엣지는 곧은 방사선. 현은 안쪽으로 아주 살짝 배부르게 —
         각도차가 작으니 이 정도로 충분히 갈라져 보인다.

         히어로에서 엣지를 빼 본 적이 있다. 그러면 배경 평균 명도가 254/255 로
         사실상 백지가 되어(실측) 그래프가 있다는 것조차 안 보였다 — 잉크의
         대부분이 엣지에 있기 때문이다. 그래서 되살렸다. 처음에 줄무늬로 보였던
         것은 엣지 탓이 아니라 바퀴를 1.4배로 확대해 중심이 화면 밖으로 나갔던
         탓이고, 지금은 중심이 글과 패널 사이에 들어와 방사선이 한 점으로
         모이는 것이 보인다. */
      for (var e2 = 0; e2 < E.length; e2++) {
        var a = pt[E[e2][0]], b = pt[E[e2][1]];
        var lit = !isHero && dim && hoverEdges.has(e2);
        var al = (isHero ? 0.30 : (dim ? (lit ? 0.7 : 0.05) : 0.22)) * prog;
        if (al < 0.012) continue;
        ctx.strokeStyle = lit ? 'rgba(26,95,180,' + al + ')'
                              : 'rgba(45,86,134,' + al + ')';
        ctx.lineWidth = lit ? 1.6 : 0.9;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        if (E[e2][3]) {
          ctx.lineTo(b.x, b.y);
        } else {
          var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          ctx.quadraticCurveTo(mx + (view.cx - mx) * 0.16,
                               my + (view.cy - my) * 0.16, b.x, b.y);
        }
        ctx.stroke();
      }

      /* ── 노드 ── */
      for (var j = 0; j < N.length; j++) {
        var n = N[j], ty = TYPES[n.t] || TYPES.src, p = pt[j];
        var rr = (ty.r + Math.min(2.6, Math.sqrt(n.d) * 0.6)) * (isHero ? 0.9 : 1);
        var litN = !isHero && dim && hoverNodes.has(j);
        var al2 = (isHero ? 0.8 : (dim ? (litN ? 1 : 0.14) : 0.92)) * prog;

        ctx.globalAlpha = al2;
        ctx.fillStyle = ty.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr * (litN ? 1.45 : 1), 0, 6.2832);
        ctx.fill();
        /* 흰 테두리 한 줄 — 붙어 있는 노드가 서로 떨어져 보이게 한다 */
        if (!isHero || litN) {
          ctx.globalAlpha = al2 * 0.85;
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#fff';
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      /* ── 이름 ──
         hover 한 것과 그 이웃만. 라벨은 바퀴 바깥쪽으로 눕혀 겹침을 줄인다. */
      if (!isHero && dim) {
        ctx.textBaseline = 'middle';
        hoverNodes.forEach(function (j2) {
          var n2 = N[j2], p2 = pt[j2], isMain = j2 === hover;
          var label = n2.l.length > 24 ? n2.l.slice(0, 23) + '…' : n2.l;
          ctx.font = (isMain ? '600 12.5px' : '400 10.5px') +
                     ' "IBM Plex Mono", "Pretendard Variable", ui-monospace, monospace';
          var w = ctx.measureText(label).width;
          var out = Math.cos(ang0[j2] + rot) < 0 ? -1 : 1;
          var gap = (TYPES[n2.t] || TYPES.src).r + 7;
          var bx = out > 0 ? p2.x + gap : p2.x - gap - w;
          bx = Math.max(3, Math.min(bx, view.w - w - 4));
          ctx.fillStyle = 'rgba(255,255,255,.95)';
          ctx.fillRect(bx - 3, p2.y - 8, w + 7, 16);
          ctx.fillStyle = isMain ? '#0e2543' : '#5b7391';
          ctx.fillText(label, bx, p2.y);
        });
      }

      raf = running ? global.requestAnimationFrame(draw) : null;
    }

    function kick() { if (raf === null && running) raf = global.requestAnimationFrame(draw); }

    /* ── hover ── 현재 회전을 반영해 극좌표로 찍는다 ── */
    function pick(mx, my) {
      var best = -1, bd = 16 * 16;
      for (var i = 0; i < N.length; i++) {
        var a = ang0[i] + rot, r = rad0[i] * view.s;
        var px = view.cx + Math.cos(a) * r, py = view.cy + Math.sin(a) * r;
        var d = (px - mx) * (px - mx) + (py - my) * (py - my);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }

    function setHover(i) {
      if (i === hover) return;
      hover = i;
      if (i < 0) { hoverEdges = hoverNodes = null; }
      else {
        hoverEdges = new Set(nbr[i]);
        hoverNodes = new Set([i]);
        nbr[i].forEach(function (ei) {
          hoverNodes.add(E[ei][0]); hoverNodes.add(E[ei][1]);
        });
      }
      if (opts.onHover) opts.onHover(i < 0 ? null : info(i));
      kick();
    }

    /* 이 노드가 무엇이고 어떤 관계로 매달려 있는지 */
    function info(i) {
      var n = N[i], rels = {};
      nbr[i].forEach(function (ei) {
        var p = E[ei][2];
        var other = E[ei][0] === i ? E[ei][1] : E[ei][0];
        var dir = E[ei][0] === i ? '→' : '←';
        (rels[dir + ' ' + p] = rels[dir + ' ' + p] || []).push(N[other].l);
      });
      return { i: i, label: n.l, type: n.t, typeMeta: TYPES[n.t] || TYPES.src,
               degree: n.d, rels: rels };
    }

    if (!isHero) {
      canvas.addEventListener('pointermove', function (ev) {
        var b = canvas.getBoundingClientRect();
        setHover(pick(ev.clientX - b.left, ev.clientY - b.top));
      });
      canvas.addEventListener('pointerleave', function () { setHover(-1); });
      canvas.addEventListener('click', function () {
        if (hover >= 0 && opts.onSelect) opts.onSelect(info(hover));
      });
    }

    /* 화면 밖으로 나가면 멈춘다. 배터리를 쓸 이유가 없다. */
    function start() { if (!running) { running = true; kick(); } }
    function stop()  { running = false; if (raf) { global.cancelAnimationFrame(raf); raf = null; } }

    resize();
    if (global.ResizeObserver) {
      new global.ResizeObserver(function () { resize(); kick(); }).observe(canvas);
    } else {
      global.addEventListener('resize', function () { resize(); kick(); });
    }

    /* 첫 프레임은 조건 없이 그린다.
       예전에는 IntersectionObserver 가 start() 를 부를 때까지 기다렸는데,
       IO 콜백은 렌더 갱신이 일어난 뒤에 오고 렌더 갱신은 누군가 프레임을
       요청해야 일어나므로 교착이 생겼다 — 실측에서 rAF 호출 0회, 캔버스 0픽셀.
       IO 는 화면을 벗어났을 때 멈추고 다시 들어오면 재개하는 용도로만 쓴다. */
    start();

    if (global.IntersectionObserver) {
      new global.IntersectionObserver(function (en) {
        en.forEach(function (x) { x.isIntersecting ? start() : stop(); });
      }, { threshold: 0 }).observe(canvas);
    }

    return { start: start, stop: stop, resize: resize, info: info,
             count: { nodes: N.length, edges: E.length } };
  }

  global.OntoGraph = { create: create, TYPES: TYPES, LEGEND: LEGEND, reduced: reduced };

}(window));
