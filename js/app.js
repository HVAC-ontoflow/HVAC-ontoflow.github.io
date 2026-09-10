/* HVAC Knowledge System — 화면 코드
   ============================================================
   이 파일은 data.js 의 KB 객체 모양만 알고, 그 값이 어디서 왔는지는 모른다.
   나중에 SPARQL endpoint 나 API 로 바꿀 때 손댈 곳이 render 함수 안이 아니라
   KB 를 채우는 쪽이 되도록 그렇게 두었다.

   화면은 전부 KB 로부터 그린다. 언어를 바꾸면 정적 마크업은 CSS 가 감추고,
   여기서 그린 부분은 다시 그린다.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var lang = function () { return root.getAttribute('data-lang') || 'ko'; };

  /* {ko, en} 객체와 평문 문자열을 같이 받는다 */
  function t(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    return v[lang()] !== undefined ? v[lang()] : (v.ko || '');
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* 1000 단위 구분. 소수는 그대로 둔다 — 2.2 를 2 로 만들면 안 된다.
     dp 를 주면 자리수를 고정한다: TTL 에 3.0 으로 적힌 값을 3 으로 줄이지 않기 위한 것. */
  function fmt(n, dp) {
    if (typeof n !== 'number') return String(n);
    var s;
    if (typeof dp === 'number') s = n.toFixed(dp);
    else if (Number.isInteger(n)) s = String(n);
    else s = n.toFixed(String(n).split('.')[1].length);
    var p = s.split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.join('.');
  }

  /* 요약을 자를 때 낱말 중간에서 끊지 않는다 — '· Z…' 같은 꼬리가 남지 않게 */
  function clip(str, n) {
    if (str.length <= n) return str;
    var cut = str.slice(0, n);
    var at = Math.max(cut.lastIndexOf(' · '), cut.lastIndexOf(' '));
    return (at > n * 0.5 ? cut.slice(0, at) : cut).replace(/[\s·]+$/, '') + ' …';
  }

  /* SVG 안의 글자 폭 추정. 모노 라틴은 약 0.6em, 한글·전각기호는 약 1.0em 이다.
     이 둘을 같은 계수로 재면 한글 라벨이 상자를 넘친다 — 실제로 넘쳤다. */
  function textW(str, size) {
    var w = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      /* 한글 음절·자모 · CJK · 전각 문장부호 */
      w += (c >= 0x1100 && c <= 0x11FF) || (c >= 0x2E80 && c <= 0xA4CF) ||
           (c >= 0xAC00 && c <= 0xD7A3) || (c >= 0xF900 && c <= 0xFAFF) ||
           (c >= 0xFF00 && c <= 0xFF60) || c === 0x00B7 || c === 0x2022
           ? 1.0 : 0.605;
    }
    return w * size;
  }

  function el(id) { return document.getElementById(id); }

  /* 상태 코드 → CSS 색 계열. 색만으로 구분되지 않도록 배지에 기호가 함께 붙는다. */
  var TONE = {
    VERIFIED: 'ok', DIVERGENT: 'warn', TOLERANCE_OK: 'tol',
    SINGLE_SOURCE: 'neutral', UNRESOLVED: 'neutral'
  };
  /* 상태 코드의 한글 뜻. DIVERGENT 를 코드만 크게 띄워 두면 '틀렸다 · 오류'로
     읽힌다. 이건 오류가 아니라 두 문서에 다르게 적혀 있다는 사실이므로, 코드와
     뜻을 늘 붙여 둔다. 코드 자체는 온톨로지의 실제 값이라 그대로 쓴다. */
  var STATUS_KO = {
    VERIFIED:      '두 자료가 같음',
    DIVERGENT:     '두 자료가 다름',
    TOLERANCE_OK:  '허용오차 안',
    SINGLE_SOURCE: '자료 한 곳',
    UNRESOLVED:    '판정 보류'
  };
  function badge(status, small) {
    if (!status) return '';
    /* 좁은 자리(badge--sm)에는 코드만 — 뜻까지 넣으면 값 옆에서 줄이 넘친다 */
    var gloss = (!small && lang() === 'ko' && STATUS_KO[status])
      ? '<i class="badge-ko">' + esc(STATUS_KO[status]) + '</i>' : '';
    return '<span class="badge is-' + (TONE[status] || 'neutral') + (small ? ' badge--sm' : '') + '">' +
           esc(status) + gloss + '</span>';
  }

  /* 상태별 관계 기호 — 두 값 사이에 세워 관계 자체를 먼저 읽히게 한다 */
  var OP = {
    VERIFIED:     { sym: '=', note: { ko: '값 일치',      en: 'values agree' } },
    DIVERGENT:    { sym: '≠', note: { ko: '두 자료가 다름', en: 'the two sources differ' } },
    TOLERANCE_OK: { sym: '≈', note: { ko: '허용오차 내', en: 'within tolerance' } }
  };

  /* 여러 곳에서 다시 그려야 하는 렌더러를 모아 둔다 */
  var renderers = [];
  function register(fn) { renderers.push(fn); fn(); }
  function renderAll() { renderers.forEach(function (fn) { fn(); }); }


  /* ═══ 언어 전환 ═══════════════════════════════════════════════════
     정적 마크업은 CSS 가 한쪽을 감추므로 여기서는 속성만 뒤집고,
     JS 로 그린 영역만 다시 그린다. */
  var TITLES = {
    ko: 'ONTOFLOW — HVAC Knowledge System · 온톨로지 기반 건물 지식 탐색',
    en: 'ONTOFLOW — HVAC Knowledge System · Ontology-based Building Knowledge Explorer'
  };
  (function () {
    var btn = el('langToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = lang() === 'ko' ? 'en' : 'ko';
      root.setAttribute('data-lang', next);
      root.setAttribute('lang', next === 'ko' ? 'ko' : 'en');
      document.title = TITLES[next];
      renderAll();
    });
  }());


  /* ═══ 규모 지표 ═══════════════════════════════════════════════════ */
  register(function kpi() {
    var host = el('kpiStrip');
    if (!host) return;
    host.innerHTML = KB.scale.headline.map(function (m) {
      return '<div>' +
        '<span class="tile-n num">' + fmt(m.value) + '</span>' +
        '<span class="tile-label">' + esc(t(m.label)) +
          (m.verified ? '<span class="tile-ck" title="ontology.ttl 직접 집계로 교차확인">✓</span>' : '') +
        '</span>' +
        '<span class="tile-note">' + esc(t(m.note)) + '</span>' +
      '</div>';
    }).join('');
  });

  /* 숫자에는 카운트업을 걸지 않는다.
     이 화면은 포스터에 스크린샷으로 들어가고, 애니메이션 중간에 캡처되면
     55,791 이 55,714 로 박힌다. 연구 결과 수치가 틀리게 남는 위험을
     움직임 하나와 바꿀 이유가 없다. 막대(분포)만 화면에 들어올 때 자란다. */



  /* ═══ 히어로 미리보기 ═════════════════════════════════════════════
     스크린샷 한 장에 근거 사슬과 검증 상태가 함께 보여야 한다.
     KB.evidence[0] (ZHUA01 설계풍량)을 압축해서 싣는다. */
  register(function preview() {
    var host = el('heroPreview');
    if (!host) return;
    var ev = KB.evidence[0];
    var head = ev.steps[0];
    /* 순번이 아니라 id 로 찾는다 — data.js 에서 장비 순서가 바뀌어도 따라온다 */
    var eq = KB.equipment.filter(function (x) { return x.id === ev.equipment; })[0] || KB.equipment[0];

    /* 사슬 2~5번째 단계를 요약으로 */
    var chain = ev.steps.slice(1).map(function (s) {
      var v = s.value ? '<span class="pc-val">' + esc(s.value) +
                (s.unit ? ' <em>' + esc(s.unit) + '</em>' : '') + '</span>' : '';
      var txt = (!s.value && s.text) ? '<span class="pc-val"><em>' + esc(clip(t(s.text), 58)) + '</em></span>' : '';
      return '<li>' +
        '<span class="pc-rel">' + esc(s.relation) + '</span>' +
        '<span class="pc-line">' +
          '<span class="pc-node">' + esc(s.node.replace(/^\w+:/, '')) + '</span>' +
          (v || txt) +
        '</span>' +
      '</li>';
    }).join('');

    var st = KB.valueStatus;
    function n(code) { var f = st.filter(function (s) { return s.code === code; })[0]; return f ? f.count : 0; }

    host.innerHTML =
      '<div class="preview-head">' +
        '<span class="pv-title">' +
          (lang() === 'ko' ? '근거 사슬' : 'Evidence chain') +
        '</span>' +
        '<span class="pv-id">' + esc(ev.equipment) + '</span>' +
        '<span class="pv-cls">' + esc(eq.cls) + '</span>' +
      '</div>' +

      '<div class="pv-body">' +
        '<div class="pv-value">' +
          '<span class="pvv-prop">' + esc(ev.prop) + '</span>' +
          '<span class="pvv-num">' + esc(head.value) + '</span>' +
          '<span class="pvv-unit">' + esc(head.unit) + '</span>' +
          badge('VERIFIED') +
        '</div>' +
        '<ul class="pv-chain">' + chain + '</ul>' +
      '</div>' +

      '<div class="pv-foot">' +
        '<div class="is-ok"><span class="pf-n num">' + fmt(n('VERIFIED')) + '</span>' +
          '<span class="pf-l">Verified</span></div>' +
        '<div class="is-warn"><span class="pf-n num">' + fmt(n('DIVERGENT')) + '</span>' +
          '<span class="pf-l">Divergent</span></div>' +
        '<div class="is-tol"><span class="pf-n num">' + fmt(n('TOLERANCE_OK')) + '</span>' +
          '<span class="pf-l">Tolerance ok</span></div>' +
      '</div>';
  });


  /* ═══ 개요 — 건물 · 문서 · 규모 상세 ══════════════════════════════ */
  register(function overview() {
    var b = el('bldgFacts');
    if (b) {
      var B = KB.building;
      var rows = [
        [{ ko: '용도', en: 'Use' }, B.use],
        [{ ko: '위치', en: 'Location' }, B.location],
        [{ ko: '층 규모', en: 'Scale' }, B.scale],
        [{ ko: '연면적', en: 'Gross area' }, B.area],
        [{ ko: '설계기준', en: 'Design basis' }, B.basis]
      ];
      b.innerHTML = rows.map(function (r) {
        return '<div><dt>' + esc(t(r[0])) + '</dt><dd>' + esc(t(r[1])) + '</dd></div>';
      }).join('');
    }

    var d = el('docList');
    if (d) {
      var unit = lang() === 'ko' ? '건' : 'refs';
      d.innerHTML =
        '<li style="border-top:0;padding-top:0"><span class="doc-n" style="color:var(--dim)">' +
          (lang() === 'ko' ? '원본 설계문서 — SourceReference 921개가 가리키는 곳'
                           : 'Source documents — where the 921 SourceReference nodes point') +
        '</span></li>' +
        KB.documents.map(function (doc) {
          return '<li>' +
            '<span class="doc-n">' + esc(doc.name) + '</span>' +
            '<span class="doc-k">' + esc(doc.kind) + '</span>' +
            '<span class="doc-c">' + fmt(doc.refs) + ' <em>' + esc(unit) + '</em></span>' +
          '</li>';
        }).join('');
    }

    var f = el('detailFacts');
    if (f) {
      f.innerHTML = KB.scale.detail.map(function (r) {
        return '<div><dt>' + esc(t(r.label)) + '</dt><dd>' + esc(r.value) + '</dd></div>';
      }).join('');
    }
  });


  /* ═══ 01 근거 추적 ════════════════════════════════════════════════ */
  var traceIdx = 0;
  register(function trace() {
    var tabs = el('traceTabs'), panel = el('tracePanel');
    if (!tabs || !panel) return;

    tabs.innerHTML = KB.evidence.map(function (ev, i) {
      return '<button type="button" role="tab" data-i="' + i + '"' +
        ' aria-selected="' + (i === traceIdx) + '">' +
        '<span class="tt-id">' + esc(ev.equipment) + ' · ' + esc(ev.prop) + '</span>' +
        '<span class="tt-q">' + esc(t(ev.question)) + '</span>' +
      '</button>';
    }).join('');

    Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (btn) {
      btn.addEventListener('click', function () {
        traceIdx = Number(btn.getAttribute('data-i'));
        trace();
      });
    });

    panel.innerHTML = traceMarkup(KB.evidence[traceIdx]);
  });

  function traceMarkup(ev) {
    var steps = ev.steps.map(function (s, i) {
      var relBig = s.relation
        ? '<div class="ch-rel">' + esc(s.relation) +
            '<span>' + (lang() === 'ko' ? '이 값의 근거' : 'basis of the value') + '</span></div>'
        : '<div class="ch-rel"><span>' + (lang() === 'ko' ? 'ABox에 기록된 값' : 'value as recorded') + '</span></div>';

      var relSmall = s.relation
        ? '<span class="ch-rel-sm">' + esc(s.relation) + '</span>' : '';

      var val = '';
      if (s.value) {
        var isUri = /^inst:|^계산서|^SCH-/.test(s.value);
        val = '<div class="ch-val">' +
          (isUri
            ? '<span class="cv-uri">' + esc(s.value) + '</span>'
            : '<span class="cv-n">' + esc(s.value) + '</span>' +
              (s.unit ? '<span class="cv-u">' + esc(s.unit) + '</span>' : '')) +
        '</div>';
      }

      /* 계산식(is-mono)은 한 줄로 흘러야 하므로 문장 끊기를 걸지 않는다 */
      var text = s.text
        ? '<p class="step-text' + (s.mono ? ' is-mono' : '') + '">' +
          (s.mono ? esc(t(s.text)) : brs(esc(t(s.text)))) + '</p>' : '';

      var meta = s.meta
        ? '<ul class="ch-meta">' + s.meta.map(function (m) {
            return '<li><b>' + esc(m[0]) + '</b> ' + esc(m[1]) + '</li>';
          }).join('') + '</ul>'
        : '';

      var src = s.source ? '<span class="ch-src">' + esc(s.source) + '</span>' : '';

      var exc = s.excerpt
        ? '<details class="excerpt"><summary>' +
            (lang() === 'ko' ? '원문 발췌' : 'Source excerpt') +
          '</summary><pre>' + esc(s.excerpt) + '</pre></details>'
        : '';

      return '<li>' +
        relBig +
        '<div class="ch-rail"><span class="ch-dot"></span>' + relSmall + '</div>' +
        '<div class="ch-body">' +
          '<span class="ch-node">' + esc(s.node) + '</span>' +
          '<p class="ch-title">' + esc(t(s.title)) + '</p>' +
          val + text + meta + src + exc +
        '</div>' +
      '</li>';
    }).join('');

    var sib = ev.siblings && ev.siblings.length
      ? '<div class="siblings">' +
          '<h3>' + (lang() === 'ko'
            ? '같은 선정근거에 매달린 나머지 계산단계 ' + ev.siblings.length + '개'
            : 'The other ' + ev.siblings.length + ' calculation steps under the same basis') + '</h3>' +
          '<ul>' + ev.siblings.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' +
        '</div>'
      : '';

    return '<div class="trace-q">' +
        '<span class="tq-tag">Query</span>' +
        '<p class="tq-text">' + esc(t(ev.question)) + '</p>' +
      '</div>' +
      '<div class="trace-q">' +
        '<span class="tq-tag">Result</span>' +
        '<p class="tq-answer">' + brs(numify(esc(t(ev.answer)))) + '</p>' +
      '</div>' +
      '<ol class="chain">' + steps + '</ol>' + sib;
  }

  /* 한글 본문을 문장 단위로 끊는다.
     레퍼런스(도시공원)가 같은 결론에 도달해 CSS 주석에 적어 둔 방식이다 —
     "한글 단어를 쪼개지 않으려다 줄 끝에 100~200 px 씩 비는 문제가 있었고,
      대신 문장이 끝날 때마다 줄을 바꾸는 방식(마크업의 <br>)으로 리듬을 잡습니다."

     마침표 뒤에 공백이 오는 자리만 끊으므로 0.335 · p.252 · SCH-A03 은 걸리지 않는다.
     영문은 그대로 흐르게 둔다 — 라틴은 자연스럽게 감기는 편이 낫다.
     이미 escape 된 문자열에 넣으므로 반드시 esc() 다음에 부른다. */
  function brs(html) {
    if (lang() !== 'ko') return html;
    return String(html).replace(/(\.)\s+(?=\S)/g, '$1<br>');
  }

  /* 문장 안의 수치를 모노로 올려 눈에 걸리게 한다 (표시만 바꾸고 값은 그대로) */
  function numify(html) {
    return html.replace(/(\d[\d,\.]*\s?(?:CMH|kW|Pa|W|℃|%)?)/g, function (m) {
      return /\d/.test(m) ? '<span class="num">' + m + '</span>' : m;
    });
  }


  /* ═══ 02 정보 검증 ════════════════════════════════════════════════ */
  register(function validation() {
    var host = el('vcases');
    if (host) {
      host.innerHTML = KB.validation.map(function (c) {
        var tone = TONE[c.status];
        var op = OP[c.status] || OP.VERIFIED;

        var claims = c.claims.map(function (cl, i) {
          return '<div class="claim">' +
            '<span class="claim-doc">' + (lang() === 'ko' ? '출처 0' + (i + 1) + ' · ' : 'Source 0' + (i + 1) + ' · ') + esc(t(cl.doc)) + '</span>' +
            '<span class="claim-ref">' + esc(cl.ref) + '</span>' +
            '<div class="claim-v">' +
              '<span class="cl-n">' + esc(cl.value) + '</span>' +
              '<span class="cl-u">' + esc(cl.unit) + '</span>' +
            '</div>' +
            (cl.excerpt ? '<p class="claim-ex">' + esc(cl.excerpt) + '</p>' : '') +
            '<div class="claim-badges">' +
              (cl.kind ? '<span class="kind">valueKind ' + esc(cl.kind) + '</span>' : '') +
              (cl.status ? badge(cl.status, true) : '') +
            '</div>' +
          '</div>';
        }).join('<div class="vc-op is-' + tone + '">' +
              '<span class="op-sym">' + op.sym + '</span>' +
              '<span class="op-note">' + esc(t(op.note)) + '</span>' +
            '</div>');

        var diff = c.diff
          ? '<ul class="vc-diff">' +
              '<li>' + (lang() === 'ko' ? '차이' : 'Difference') + ' <b>' + esc(c.diff.value) + ' ' + esc(c.diff.unit) + '</b></li>' +
              '<li>discrepancyType <b>' + esc(c.dtype) + '</b></li>' +
            '</ul>'
          : '';

        return '<article class="vcase" id="v-' + esc(c.id) + '">' +
          '<div class="vc-head">' +
            '<span class="vh-cq">CQ #' + c.cq + '</span>' +
            '<span class="vh-eq">' + esc(c.equipment) + '</span>' +
            '<span class="vh-prop">' + esc(t(c.propLabel)) + ' <em>' + esc(c.prop) + '</em></span>' +
            badge(c.status) +
          '</div>' +
          '<p class="vc-q">' + esc(t(c.question)) + '</p>' +
          '<div class="vc-claims">' + claims + '</div>' +
          '<div class="vc-verdict is-' + tone + '">' +
            '<span class="vv-tag">' + (lang() === 'ko' ? '판정' : 'Verdict') + '</span>' +
            diff +
            '<p class="verdict">' + brs(numify(esc(t(c.verdict)))) + '</p>' +
            (c.philosophy ? '<p class="philosophy">' + esc(t(c.philosophy)) + '</p>' : '') +
          '</div>' +
        '</article>';
      }).join('');
    }

    var dl = el('distList');
    if (dl) {
      var total = KB.valueStatus.reduce(function (a, s) { return a + s.count; }, 0);
      var max = Math.max.apply(null, KB.valueStatus.map(function (s) { return s.count; }));
      dl.innerHTML = KB.valueStatus.map(function (s) {
        var pct = (s.count / total * 100).toFixed(1);
        return '<li class="is-' + s.tone + '">' +
          '<span class="d-code"><i class="dot"></i>' + esc(s.code) + '</span>' +
          '<span class="d-track"><i class="d-fill" data-w="' + (s.count / max * 100) + '"></i></span>' +
          '<span class="d-n">' + fmt(s.count) + '<em>' + pct + ' %</em></span>' +
          '<span class="d-desc">' + esc(t(s.label)) + ' — ' + esc(t(s.desc)) + '</span>' +
        '</li>';
      }).join('') +
      '<li style="border-top:1px solid var(--line-2)">' +
        '<span class="d-code" style="color:var(--text)">' + (lang() === 'ko' ? '합계' : 'Total') + '</span>' +
        '<span></span>' +
        '<span class="d-n" style="color:var(--text)">' + fmt(total) +
          '<em>' + (lang() === 'ko' ? '값 노드' : 'value nodes') + '</em></span>' +
      '</li>';
      growBars(dl);
    }
  });

  /* 막대는 화면에 들어올 때 자라게 한다. 안 보이는 곳에서 다 끝나 버리면
     분포가 얼마나 치우쳐 있는지 알아채지 못한다. */
  function growBars(host) {
    var bars = host.querySelectorAll('.d-fill');
    function fill() {
      Array.prototype.forEach.call(bars, function (b) {
        b.style.width = b.getAttribute('data-w') + '%';
      });
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.IntersectionObserver) {
      fill(); return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { fill(); io.disconnect(); } });
    }, { threshold: .25 });
    io.observe(host);
  }


  /* ═══ 03 장비 탐색 ════════════════════════════════════════════════ */
  var eqIdx = 0;
  register(function explorer() {
    var list = el('eqList'), panel = el('eqPanel');
    if (!list || !panel) return;

    list.innerHTML = KB.equipment.map(function (e, i) {
      var vals = e.specs.reduce(function (a, s) { return a + s.values.length; }, 0);
      return '<button type="button" class="eq-item" role="tab" data-i="' + i + '"' +
        ' aria-selected="' + (i === eqIdx) + '">' +
        '<span class="ei-id">' + esc(e.id) + '</span>' +
        '<span class="ei-cls">' + esc(t(e.clsLabel)) + '</span>' +
        '<span class="ei-cnt">' + (lang() === 'ko'
          ? '값 ' + vals + ' · 부품 ' + e.parts.length + ' · 출처 ' + e.sources.length
          : vals + ' values · ' + e.parts.length + ' parts · ' + e.sources.length + ' sources') +
        '</span>' +
      '</button>';
    }).join('');

    Array.prototype.forEach.call(list.querySelectorAll('button'), function (btn) {
      btn.addEventListener('click', function () {
        eqIdx = Number(btn.getAttribute('data-i'));
        explorer();
      });
    });

    panel.innerHTML = eqMarkup(KB.equipment[eqIdx]);
  });

  function eqMarkup(e) {
    var L = lang() === 'ko';

    var specs = e.specs.map(function (s) {
      var vals = s.values.map(function (v) {
        return '<div class="spec-val">' +
          '<span class="sv-n">' + esc(fmt(v.v, v.dp)) + '</span>' +
          (v.unit ? '<span class="sv-u">' + esc(v.unit) + '</span>' : '') +
          (v.kind ? '<span class="kind">' + esc(v.kind) + '</span>' : '') +
          badge(v.status, true) +
        '</div>';
      }).join('');
      return '<div class="spec' + (s.key ? ' is-key' : '') + '">' +
        '<div class="spec-prop">' + esc(t(s.label)) +
          '<span class="sp-uri">' + esc(s.prop) + '</span>' +
        '</div>' +
        '<div class="spec-vals">' + vals + '</div>' +
      '</div>';
    }).join('');

    function row(rel, note, body) {
      return '<div class="eq-rel-row">' +
        '<span class="err-rel">' + esc(rel) + '<em>' + esc(note) + '</em></span>' +
        '<span class="err-val">' + body + '</span>' +
      '</div>';
    }

    var rels =
      row('hvo:installationLocation', L ? '설치 위치' : 'installation location',
          e.location.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join(' <span class="muted">/</span> ') +
          (e.location.length > 1
            ? ' <span class="muted">— ' + (L ? '두 표기가 함께 기록되어 있어 합치지 않습니다'
                                                  : 'both spellings are recorded, so they are not merged') + '</span>'
            : '')) +

      row('brick:hasLocation', L ? '공간 개체' : 'space individual',
          e.hasLocation ? 'inst:' + esc(e.hasLocation) + ' <span class="muted">(hvo:Room)</span>'
                        : '<span class="err-none">' + (L ? '기록 없음' : 'not recorded') + '</span>') +

      row('hvo:serves', L ? '담당 Zone' : 'zone served',
          e.serves.length
            ? e.serves.map(function (z) { return 'inst:' + esc(z); }).join(' <span class="muted">/</span> ') +
              (e.serves.length > 1
                ? ' <span class="muted">— ' + (L ? '동일 개체라는 관계가 없어 하나로 합치지 않습니다'
                                                       : 'no relation asserts they are the same individual') + '</span>'
                : '')
            : '<span class="err-none">' + (L ? '기록 없음' : 'not recorded') + '</span>') +

      row('brick:hasPart', L ? '구성 부품' : 'parts',
          e.parts.map(function (p) {
            return 'inst:' + esc(p.id) + ' <span class="muted">(' + esc(p.cls) + ')</span>';
          }).join('<br>')) +

      row('hvo:selectedBy', L ? '선정 근거' : 'design basis',
          e.basis
            ? esc(e.basis) + ' <span class="muted">(hvo:DesignBasis)</span>'
            : '<span class="err-none">' + (L ? '이 HVAC 설비에는 선정근거 개체가 연결되어 있지 않습니다'
                                             : 'no design-basis individual is attached to this unit') + '</span>') +

      row('hvo:sourcedFrom', L ? '출처' : 'sources',
          '<ul class="chips">' + e.sources.map(function (s) {
            return '<li' + (/^SCH-/.test(s) ? ' class="is-dwg"' : '') + '>' + esc(s) + '</li>';
          }).join('') + '</ul>');

    return '<div class="eq-head">' +
        '<span class="eh-id">' + esc(e.id) + '</span>' +
        '<span class="eh-cls">' + esc(t(e.clsLabel)) + '</span>' +
        '<span class="eh-uri">a <b>' + esc(e.cls) + '</b> → rdfs:subClassOf ' + esc(e.parent) +
          ' · hvo:quantity ' + e.quantity + '</span>' +
      '</div>' +
      '<div class="spec-grid">' + specs + '</div>' +
      '<div class="eq-rel">' + rels + '</div>' +
      graphMarkup(e);
  }


  /* ── 1-hop 관계 그래프 ──
     전체 그래프는 그리지 않는다. 고른 HVAC 설비 하나에서 한 걸음 나간 관계만,
     "이것이 표가 아니라 관계로 묶인 지식이다"가 보이는 정도로 그린다.
     레이아웃은 세로 트렁크 하나에 관계별 가지가 붙는 형태 — 인쇄해도 읽힌다. */
  function graphMarkup(e) {
    var L = lang() === 'ko';

    /* 값 노드는 눈에 걸리는 것 위주로 셋만. 그래프는 요약이지 대체물이 아니다. */
    var keyVals = e.specs.filter(function (s) { return s.key; }).slice(0, 2);
    if (!keyVals.length) keyVals = e.specs.slice(0, 2);

    var groups = [];

    groups.push({
      rel: 'hvo:hasQuantityValue',
      rows: keyVals.map(function (s) {
        return {
          label: s.values.map(function (v) { return fmt(v.v, v.dp); }).join(' / ') +
                 (s.values[0].unit ? ' ' + s.values[0].unit : ''),
          sub: s.prop.replace('hvo:', ''),
          kind: 'val'
        };
      })
    });

    if (e.hasLocation) {
      groups.push({ rel: 'brick:hasLocation', rows: [{ label: e.hasLocation, sub: 'hvo:Room' }] });
    }
    if (e.serves.length) {
      groups.push({
        rel: 'hvo:serves',
        rows: e.serves.map(function (z) { return { label: z, sub: 'hvo:Zone' }; })
      });
    }
    groups.push({
      rel: 'brick:hasPart',
      rows: e.parts.map(function (p) { return { label: p.id, sub: p.cls.replace(/^\w+:/, '') }; })
    });
    if (e.basis) {
      groups.push({
        rel: 'hvo:selectedBy',
        rows: [{ label: e.basis.replace('inst:', ''), sub: 'hvo:DesignBasis' }]
      });
    }

    /* ── 레이아웃 ──
       단위는 viewBox 좌표다. SVG 를 폭 100% 로 늘리면 이 단위가 그대로 확대되어
       11 단위 글자가 화면에서 30px 로 찍힌다. 그래서 자연 크기를 기준으로 잡고
       확대는 1.35 배까지만 허용한다(아래 max-width). */
    var ROW = 34, BOXH = 30, GAP = 16, LEFT = 6, TRUNK = 216, BOXX = 300, PADT = 12;
    var y = PADT, maxW = 0;

    groups.forEach(function (g) {
      g.labelY = y + 9;
      g.top = y + 16;
      g.rows.forEach(function (r, i) {
        r.y = g.top + i * ROW;
        r.w = Math.max(150, textW(r.label, 11) + 24, textW(r.sub, 9) + 24);
        maxW = Math.max(maxW, r.w);
      });
      y = g.top + g.rows.length * ROW + GAP;
    });

    var H = y - GAP + PADT;
    var W = BOXX + maxW + 10;
    var rootY = H / 2, rootH = 46, rootW = TRUNK - LEFT - 14;

    var firstY = groups[0].rows[0].y + BOXH / 2;
    var lastG = groups[groups.length - 1];
    var lastY = lastG.rows[lastG.rows.length - 1].y + BOXH / 2;

    var svg = [];

    /* 트렁크와 루트로 이어지는 선 */
    svg.push('<path class="g-edge" d="M' + (LEFT + rootW) + ' ' + rootY + ' H' + TRUNK + '"/>');
    svg.push('<path class="g-edge" d="M' + TRUNK + ' ' + firstY + ' V' + lastY + '"/>');

    /* 가지 — 관계 이름은 그 가지의 첫 칸 위에 선다 */
    groups.forEach(function (g) {
      svg.push('<text class="g-rel" x="' + (TRUNK + 8) + '" y="' + g.labelY + '">' +
               esc(g.rel) + '</text>');
      g.rows.forEach(function (r) {
        var cy = r.y + BOXH / 2;
        svg.push('<path class="g-edge" d="M' + TRUNK + ' ' + cy + ' H' + BOXX + '"/>');
        svg.push('<rect class="g-box' + (r.kind === 'val' ? ' is-val' : '') + '" x="' + BOXX +
                 '" y="' + r.y + '" width="' + r.w.toFixed(0) + '" height="' + BOXH + '" rx="2"/>');
        svg.push('<text class="g-label" x="' + (BOXX + 10) + '" y="' + (r.y + 13) + '">' +
                 esc(r.label) + '</text>');
        svg.push('<text class="g-sub" x="' + (BOXX + 10) + '" y="' + (r.y + 24) + '">' +
                 esc(r.sub) + '</text>');
      });
    });

    /* 루트 */
    svg.push('<rect class="g-box is-root" x="' + LEFT + '" y="' + (rootY - rootH / 2) +
             '" width="' + rootW + '" height="' + rootH + '" rx="2"/>');
    svg.push('<text class="g-label is-root" x="' + (LEFT + 13) + '" y="' + (rootY - 2) +
             '" style="font-size:14px">' + esc(e.id) + '</text>');
    svg.push('<text class="g-sub is-root" x="' + (LEFT + 13) + '" y="' + (rootY + 13) + '">' +
             esc(e.cls) + '</text>');

    return '<div class="graph-wrap">' +
      '<div class="graph-cap">' +
        '<span class="gc-t">' + (L ? '1-hop 관계' : '1-hop relations') + '</span>' +
        '<span class="gc-n">' + (L
          ? '고른 HVAC 설비에서 한 걸음 나간 관계만 그립니다 · 관계 이름은 TBox에 정의된 술어'
          : 'only one step out from the selected unit · relation names are TBox predicates') +
        '</span>' +
      '</div>' +
      '<svg class="graph" width="' + W + '" height="' + H.toFixed(0) + '"' +
        ' viewBox="0 0 ' + W + ' ' + H.toFixed(0) + '"' +
        ' style="max-width:min(100%,' + Math.round(W * 1.35) + 'px)" role="img" ' +
        'aria-label="' + esc(e.id) + (L ? ' 의 1-hop 관계 그래프' : ' 1-hop relation graph') + '">' +
        svg.join('') +
      '</svg>' +
    '</div>';
  }


  /* ═══ 04 지식 질의 ════════════════════════════════════════════════ */
  var qNo = 5;   /* CQ #5 — 계산 근거 추적. 이 연구를 가장 잘 보여주는 질문 */
  register(function query() {
    var list = el('qList'), panel = el('qPanel');
    if (!list || !panel) return;

    list.innerHTML = KB.queryTypes.map(function (grp) {
      var items = KB.queries.filter(function (q) { return q.type === grp.key; });
      return '<div class="q-group">' +
        '<div class="q-group-h">' +
          '<span class="qg-t">' + esc(t(grp.label)) + '</span>' +
          '<span class="qg-n">' + esc(t(grp.note)) + '</span>' +
        '</div>' +
        '<ul class="q-list">' + items.map(function (q) {
          return '<li><button type="button" class="q-item" data-no="' + q.no + '"' +
            ' aria-selected="' + (q.no === qNo) + '">' +
            '<span class="qi-n">CQ ' + (q.no < 10 ? '0' : '') + q.no + '</span>' +
            esc(t(q.q)) +
            (q.flagship ? '<span class="qi-star" title="대표 사례">◆</span>' : '') +
          '</button></li>';
        }).join('') + '</ul>' +
      '</div>';
    }).join('');

    Array.prototype.forEach.call(list.querySelectorAll('.q-item'), function (btn) {
      btn.addEventListener('click', function () {
        qNo = Number(btn.getAttribute('data-no'));
        query();
      });
    });

    var q = KB.queries.filter(function (x) { return x.no === qNo; })[0];
    panel.innerHTML = qMarkup(q);
  });

  function qMarkup(q) {
    var L = lang() === 'ko';

    var jumps = '';
    if (q.trace) {
      jumps += '<a class="q-jump" href="#evidence" data-trace="' + esc(q.trace) + '">' +
               (L ? '근거 사슬 전체 보기' : 'See the full evidence chain') + '</a>';
    }
    if (q.validation) {
      jumps += '<a class="q-jump" href="#v-' + esc(q.validation) + '">' +
               (L ? '문서 대조 화면으로' : 'Open the document comparison') + '</a>';
    }

    return '<div class="q-row q-row--q">' +
        '<span class="q-tag">Query</span>' +
        '<p class="q-text">' + esc(t(q.q)) + '</p>' +
      '</div>' +

      '<div class="q-row q-row--a">' +
        '<span class="q-tag">Result</span>' +
        '<div><p class="a-text">' + brs(numify(esc(t(q.a)))) + '</p>' +
          (q.note ? '<p class="q-note">' + brs(esc(t(q.note))) + '</p>' : '') +
        '</div>' +
      '</div>' +

      '<div class="q-row">' +
        '<span class="q-tag">Evidence</span>' +
        '<ul class="ev-list">' + q.evidence.map(function (x) {
          return '<li>' + esc(x) + '</li>';
        }).join('') + '</ul>' +
      '</div>' +

      '<div class="q-row">' +
        '<span class="q-tag">Source</span>' +
        '<ul class="chips">' + q.source.map(function (s) {
          return '<li' + (/^SCH-/.test(s) ? ' class="is-dwg"' : '') + '>' + esc(s) + '</li>';
        }).join('') + '</ul>' +
      '</div>' +

      '<div class="q-row">' +
        '<span class="q-tag">Status</span>' +
        '<div>' + badge(q.status) +
          (jumps ? '<div class="q-actions" style="margin-top:12px">' + jumps + '</div>' : '') +
        '</div>' +
      '</div>';
  }

  /* 근거 사슬로 건너가는 링크는 해당 사슬을 먼저 골라 놓고 이동한다 */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('[data-trace]') : null;
    if (!a) return;
    var id = a.getAttribute('data-trace');
    KB.evidence.forEach(function (e, i) { if (e.id === id) traceIdx = i; });
    renderAll();
  });


  /* ── 자유 질의 (beta) ──
     검증된 10문항 안에서 키워드를 찾아 해당 CQ 로 보내는 것까지만 한다.
     추론하는 척하지 않는다. 못 찾으면 못 찾았다고 말한다. */
  (function betaSearch() {
    var form = el('betaForm'), input = el('betaInput'), out = el('betaOut');
    if (!form) return;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var qs = (input.value || '').trim().toLowerCase();
      var L = lang() === 'ko';
      if (!qs) { out.hidden = true; return; }

      var hay = KB.queries.map(function (q) {
        return {
          q: q,
          text: (t(q.q) + ' ' + t(q.a) + ' ' + q.evidence.join(' ') + ' ' +
                 q.source.join(' ') + ' ' + q.subject).toLowerCase()
        };
      });
      var words = qs.split(/\s+/);
      var scored = hay.map(function (h) {
        return { q: h.q, score: words.filter(function (w) { return h.text.indexOf(w) > -1; }).length };
      }).filter(function (s) { return s.score > 0; })
        .sort(function (a, b) { return b.score - a.score; });

      out.hidden = false;
      if (!scored.length) {
        out.innerHTML = L
          ? '검증된 10문항 안에서 <b>일치하는 질의를 찾지 못했습니다.</b> ' +
            '이 페이지는 사전 검증된 CQ 결과만 제공하므로, 임의의 질문에 대한 답을 만들어내지 않습니다. ' +
            '왼쪽 목록에서 질의를 골라 주세요.'
          : '<b>No matching query</b> among the ten validated questions. ' +
            'This page serves only pre-verified CQ results and will not fabricate an answer for an ' +
            'arbitrary question — please pick a query from the list on the left.';
        return;
      }
      qNo = scored[0].q.no;
      renderAll();
      out.hidden = false;
      out.innerHTML = (L
        ? '검증된 CQ <b>#' + scored[0].q.no + '</b> 결과를 표시했습니다.'
        : 'Jumped to validated CQ <b>#' + scored[0].q.no + '</b>.') +
        (scored.length > 1
          ? (L ? ' 다른 후보: ' : ' Other matches: ') +
            scored.slice(1, 4).map(function (s) { return 'CQ #' + s.q.no; }).join(', ')
          : '');
      out.scrollIntoView({ block: 'nearest' });
    });
  }());


  /* ═══ 07 구축 과정 · 08 향후 ═════════════════════════════════════════ */
  register(function build() {
    var f = el('flowList');
    if (f) {
      f.innerHTML = KB.pipeline.map(function (s, i) {
        return '<li' + (s.highlight ? ' class="is-here"' : '') + '>' +
          '<div class="flow-side">' +
            /* 순번 마커. 포스터의 L 번호는 두 체계가 어긋나므로 쓰지 않는다(data.js 주석).
               두 언어 모두 라틴으로 둔다 — 한글이 들어가면 라벨 자간에 흩어진다. */
            '<span class="flow-l">' + (s.highlight ? 'NOW' : '0' + (i + 1)) + '</span>' +
            '<span class="flow-n">' + esc(t(s.name)) + '</span>' +
            '<span class="flow-s">' + esc(t(s.stat)) + '</span>' +
          '</div>' +
          '<p class="flow-w">' + brs(esc(t(s.what))) + '</p>' +
        '</li>';
      }).join('');
    }

    var fu = el('futureList');
    if (fu) {
      fu.innerHTML = KB.future.map(function (x) {
        return '<li><span class="fu-l">' + esc(t(x.label)) + '</span>' +
               '<span class="fu-t">' + esc(t(x.text)) + '</span></li>';
      }).join('');
    }
  });


  /* ═══ 온톨로지 그래프 ═════════════════════════════════════════════
     히어로 배경 한 개와 지도 섹션 한 개. 둘 다 같은 GRAPH 를 쓰지만
     배경은 상호작용이 없고 지도는 hover 로 개체를 읽어 준다. */
  var mapGraph = null;

  (function graphs() {
    if (typeof GRAPH === 'undefined' || !global_OntoGraph()) return;
    var OG = global_OntoGraph();

    var heroCanvas = el('heroGraph');
    if (heroCanvas) OG.create(heroCanvas, { mode: 'hero', threeD: true });

    var mapCanvas = el('mapGraph');
    if (!mapCanvas) return;

    mapGraph = OG.create(mapCanvas, {
      mode: 'map',
      /* 주소에 ?3d 를 붙이면 3D 로 열린다. 시연에서 3D 화면을 바로 띄우거나
         링크로 건네줄 때 쓴다. 기본은 2D — 구조를 읽기에는 평면이 낫다. */
      threeD: /(^|[?&])3d(&|=|$)/.test(global_search()),
      onHover: function (nd) { renderRead(nd); },
      /* 장비 노드를 누르면 그 장비가 탐색 화면에 있으면 거기로 보낸다 */
      onSelect: function (nd) {
        if (nd.type !== 'eq') return;
        var hit = -1;
        KB.equipment.forEach(function (e, i) { if (e.id === nd.label) hit = i; });
        if (hit < 0) return;
        eqIdx = hit;
        renderAll();
        var t = document.getElementById('explorer');
        if (t) t.scrollIntoView({ behavior: OG.reduced ? 'auto' : 'smooth', block: 'start' });
      }
    });
    renderRead(null);
  }());

  function global_OntoGraph() { return window.OntoGraph || null; }
  function global_search() { try { return window.location.search || ''; } catch (e) { return ''; } }
  function global_w() {
    try { return document.documentElement.clientWidth || window.innerWidth; }
    catch (e) { return 0; }
  }

  /* 커서를 올린 노드의 정체를 캔버스 아래 고정 자리에 쓴다.
     따라다니는 말풍선은 커서가 가려 읽기 어렵고 스크린샷에서 자리가 흔들린다. */
  function renderRead(nd) {
    var host = el('mapRead');
    if (!host) return;
    var L = lang() === 'ko';

    if (!nd) {
      host.innerHTML =
        '<div><span class="mr-tag">' + (L ? '개체' : 'Individual') + '</span>' +
          '<span class="mr-label" style="color:var(--dimmer)">—</span></div>' +
        '<div><p class="mr-idle">' + brs(
          L ? '노드에 커서를 올리면 그 개체의 클래스와, 어떤 관계로 무엇에 매달려 있는지가 여기에 표시됩니다. HVAC 설비 노드를 누르면 HVAC 설비 탐색 화면으로 이동합니다.'
             : 'Hover a node and its class — and which relations hold it to what — is read out here. Click an HVAC node to jump to the HVAC explorer.') +
        '</p></div>';
      return;
    }

    var m = nd.typeMeta;
    var rels = Object.keys(nd.rels).sort().map(function (k) {
      var objs = nd.rels[k];
      var shown = objs.slice(0, 4).join(', ');
      if (objs.length > 4) shown += ' … +' + (objs.length - 4);
      return '<li><span class="mr-p">' + esc(k) + '</span>' +
             '<span class="mr-o">' + esc(shown) + '</span></li>';
    }).join('');

    host.innerHTML =
      '<div>' +
        '<span class="mr-tag"><i style="background:' + m.c + '"></i>' +
          esc(L ? m.ko : m.en) + '</span>' +
        '<span class="mr-label">' + esc(nd.label) + '</span>' +
        '<span class="mr-deg">' +
          (L ? '이 노드에 연결된 관계 ' + nd.degree + '개' : nd.degree + ' relations on this node') +
        '</span>' +
      '</div>' +
      '<div><ul class="mr-rels">' + rels + '</ul></div>';
  }

  /* ── 2D / 3D 전환 ──
     기본은 2D 다. 회전하는 3D 는 눈에 잘 들어오지만 구조를 읽기에는 평면 바퀴가
     낫다 — 노드가 겹치고 커서로 짚기도 어렵다. 그래서 읽는 화면은 2D 로 두고,
     3D 는 눌러서 보는 쪽으로 뒀다. */
  register(function dimToggle() {
    var host = el('mapDim');
    if (!host || !mapGraph || !mapGraph.has3D) return;
    var L = lang() === 'ko';
    var on = mapGraph.is3D();
    /* 처음에는 2D · 3D 두 글자만 얹었는데 버튼이 너무 작아 아무도 찾지 못했다.
       무엇을 고르는 자리인지 앞에 이름을 붙이고, 버튼에도 무엇이 나오는지 적는다. */
    host.innerHTML =
      '<span class="md-label">' + (L ? '보기' : 'View') + '</span>' +
      '<button type="button" data-d="2" aria-pressed="' + (!on) + '">' +
        '2D<em>' + (L ? '평면' : 'flat') + '</em></button>' +
      '<button type="button" data-d="3" aria-pressed="' + (on) + '">' +
        '3D<em>' + (L ? '구체' : 'sphere') + '</em></button>' +
      '<span class="md-note">' +
        (L ? (on ? '회전하는 구 · 가운데가 HVAC 설비, 껍질이 출처입니다'
                 : '평면 바퀴 · 3D를 누르면 같은 그래프가 구로 펼쳐집니다')
           : (on ? 'rotating sphere · equipment at the core, sources on the outer shell'
                 : 'flat wheel · press 3D to unfold the same graph onto a sphere')) +
      '</span>';
    Array.prototype.forEach.call(host.querySelectorAll('button'), function (btn) {
      btn.addEventListener('click', function () {
        mapGraph.setThreeD(btn.getAttribute('data-d') === '3');
        dimToggle();
        renderRead(null);
      });
    });
  });

  /* 범례와 규모 표시 — 언어를 바꾸면 다시 그린다 */
  register(function graphChrome() {
    var OG = window.OntoGraph;
    if (!OG || typeof GRAPH === 'undefined') return;
    var L = lang() === 'ko';

    var lg = el('mapLegend');
    if (lg) {
      lg.innerHTML = OG.LEGEND.map(function (k) {
        var m = OG.TYPES[k];
        return '<li><i style="background:' + m.c + '"></i>' + esc(L ? m.ko : m.en) + '</li>';
      }).join('');
    }

    var cnt = el('mapCount');
    if (cnt) {
      cnt.innerHTML = L
        ? '노드 <b>' + fmt(GRAPH.nodes.length) + '</b> · 엣지 <b>' + fmt(GRAPH.edges.length) + '</b>'
        : '<b>' + fmt(GRAPH.nodes.length) + '</b> nodes · <b>' + fmt(GRAPH.edges.length) + '</b> edges';
    }

    var hint = el('mapHint');
    if (hint) {
      hint.textContent = L
        ? '노드에 커서를 올려 보세요 · HVAC 설비 노드는 클릭하면 탐색 화면으로'
        : 'hover a node · click an equipment node to open it in the explorer';
    }

    /* 판독 영역도 현재 언어로 다시 쓴다 */
    renderRead(null);
  });


  /* ═══ 05 질의응답 ═══════════════════════════════════
     스크롤이 장면을 넘긴다. 도시공원 레퍼런스의 방식이다 —
     sticky 무대 위에 카드 세 장을 겹쳐 두고, 트랙의 스크롤 위치가
     장면 번호를 정하고, 장면은 카드에 붙는 클래스로만 표현한다.
     연출은 CSS 가 하고 여기서는 '지금 몇 번째 장면인가'만 계산한다.

     장면은 여섯이다 — 질문 → 정답 을 세 번.
       0 질문 E1   1 정답 E1
       2 질문 X10  3 정답 X10
       4 질문 R2   5 정답 R2

     카드는 KB.qa 에서 그린다. 챗봇 UI 가 되지 않도록 말풍선 · 아바타 ·
     입력창 · 발화자 표시를 쓰지 않고, 라벨 · 질의문 · 결과 행 · 메모의
     질의 기록 형태로 짠다. */
  var qaBeat = -1;

  register(function qa() {
    var host = el('qaCards');
    if (!host || typeof KB === 'undefined' || !KB.qa) return;

    host.innerHTML = KB.qa.map(function (item, c) {
      var body;
      if (item.empty) {
        /* 0행이 정답인 문항. 빈 표를 그리면 '조회 실패'로 읽히므로
           없음 자체를 하나의 결과로 세운다. */
        body =
          '<div class="qa-empty">' +
            '<span class="qe-mark" aria-hidden="true">—</span>' +
            '<span>' +
              '<span class="qe-t">' + esc(t(item.empty)) + '</span><br>' +
              '<span class="qe-n">0 rows</span>' +
            '</span>' +
          '</div>';
      } else {
        body =
          '<ul class="qa-rows">' +
            item.rows.map(function (r, i) {
              return '<li class="' + (r.dwg ? 'is-dwg' : '') + '" style="--r:' + i + '">' +
                       '<span class="qr-k">' + esc(r.k) + '</span>' +
                       '<span class="qr-v">' + esc(r.v) + '</span>' +
                     '</li>';
            }).join('') +
          '</ul>' +
          (item.more ? '<p class="qa-more">' + esc(t(item.more)) + '</p>' : '');
      }

      var L = lang() === 'ko';
      /* 두 덩어리가 누구의 말인지 한눈에 갈라져야 한다 — 물어본 쪽(사람)과
         답한 쪽(온톨로지). 말풍선을 쓰지 않고 각 덩어리에 이름을 붙이고,
         응답만 다른 면(--panel) 위에 올려 '돌려받은 기록'으로 보이게 한다. */
      return '' +
        '<article class="qa-card" data-c="' + c + '">' +

          '<div class="qa-block qa-block--q">' +
            '<div class="qa-who">' +
              '<span class="qa-who-t">' + (L ? '질문' : 'Question') + '</span>' +
              '<span class="qa-who-s">' + (L ? '사람이 입력한 문장' : 'typed by a person') + '</span>' +
              '<span class="qa-tag">' + esc(t(item.kind)) + '</span>' +
            '</div>' +
            '<p class="qa-q">' + esc(t(item.q)) + '</p>' +
          '</div>' +

          '<div class="qa-block qa-block--a qa-a">' +
            '<div class="qa-who">' +
              '<span class="qa-who-t">' + (L ? '온톨로지 기반 답변' : 'Answer from the ontology') + '</span>' +
              '<span class="qa-who-s">' + (L ? '지어낸 문장이 아니라 그래프에서 직접 조회한 값입니다'
                                              : 'read directly from the graph, not generated') + '</span>' +
              '<span class="qa-tag is-q">' + (L ? 'SPARQL 직접 실행' : 'SPARQL, run directly') + '</span>' +
            '</div>' +
            '<div class="qa-res">' +
              body +
              '<p class="qa-note">' + brs(esc(t(item.note))) + '</p>' +
            '</div>' +
          '</div>' +

        '</article>';
    }).join('');

    var hud = el('qaHud');
    if (hud) {
      var dots = '';
      for (var d = 0; d < KB.qa.length * 2; d++) dots += '<i></i>';
      hud.innerHTML =
        '<span class="qh-n">' + (lang() === 'ko' ? '질의응답' : 'Question &amp; answer') + '</span>' +
        '<span class="qa-dots" id="qaDots" aria-hidden="true">' + dots + '</span>';
    }

    /* 언어를 바꿔 다시 그렸으면 지금 장면을 그 위에 다시 입힌다 */
    if (qaBeat >= 0) qaPaint(qaBeat);
  });

  /* 장면 → 화면. 카드 하나만 열고, 홀수 장면이면 그 카드의 정답까지 연다. */
  function qaPaint(i) {
    var cards = document.querySelectorAll('#qaCards .qa-card');
    var c = Math.floor(i / 2), ans = i % 2 === 1;
    for (var k = 0; k < cards.length; k++) {
      cards[k].classList.toggle('is-on', k === c);
      cards[k].classList.toggle('is-ans', k === c && ans);
    }
    var dots = document.querySelectorAll('#qaDots i');
    for (var d = 0; d < dots.length; d++) dots[d].classList.toggle('on', d <= i);
  }

  /* 스크롤 → 장면. 트랙을 다 지나면 마지막 장면에서 멈춘다. */
  (function qaScroll() {
    var sec = el('qa'), stage = el('qaStage'), track = el('qaTrack');
    if (!sec || !stage || !track || typeof KB === 'undefined' || !KB.qa) return;

    var N = KB.qa.length * 2;

    /* 스텝의 높이는 CSS 가 정한다(.qa-step). 여기서는 개수만 만든다. */
    var steps = '';
    for (var i = 0; i < N; i++) steps += '<div class="qa-step"></div>';
    track.innerHTML = steps;

    /* 연출을 켠다 — 이 클래스가 붙어야 sticky 무대와 숨김 상태가 산다.
       스크립트가 여기까지 오지 못하면 세 문항이 그냥 나열된 채로 남는다. */
    sec.classList.add('on');

    function render() {
      var top = sec.getBoundingClientRect().top;
      var span = sec.offsetHeight - stage.clientHeight;
      var p = (-top / (span || 1)) * N;
      var i = Math.floor(p);
      if (i < 0) i = 0;
      if (i > N - 1) i = N - 1;
      if (i !== qaBeat) { qaBeat = i; qaPaint(i); }
    }

    var queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () { queued = false; render(); });
    }
    render();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { qaBeat = -1; render(); });
  }());


  /* ═══ 등장 연줌 ══════════════════════════════════════
     섹션이 화면에 들어오면 살짝 올라오며 나타난다.

     <html> 에 .reveal 을 붙이는 것으로 시작한다 — CSS 의 숨김 규칙이 그
     클래스에 걸려 있으므로, 이 함수가 실행되지 못하면 아무것도 숨지 않는다.
     스크립트 실패가 빈 화면이 되지 않게 하는 것이 이 순서의 목적이다.

     히어로는 손대지 않는다. 첫 화면은 포스터 스크린샷으로 쓰이므로
     스크롤하지 않은 그 상태에서 이미 완성돼 있어야 한다. */
  (function reveal() {
    var still = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || !window.IntersectionObserver) return;

    /* 섹션마다 '올라올 것'을 고른다. 통째로 한 덩어리로 올리면 큰 판이
       한 번에 튀어 올라 어지럽다. 제목 · 리드 · 본문 블록을 따로 잡아
       조금씩 시차를 준다. */
    /* 무엇을 올릴지 고르는 규칙.

       처음에는 섹션의 본문 블록을 그대로 올렸다. 그런데 이 페이지의 블록은
       대부분 표 · 목록 · 격자여서, 한 덩어리로 통째로 떠오르면 '떠올랐다'로
       끝나고 읽는 리듬이 생기지 않는다. 그래서 한 단계 더 들어가서, 반복되는
       항목이 있으면 블록 대신 그 항목들을 차례로 올린다 — 값이 하나씩 도착하는
       것처럼 보이는 편이 이 페이지의 내용(조회 결과)에 맞는다.

       판정은 단순하게 둔다: 자식이 셋 이상이고 모두 같은 태그면 반복 항목이다. */
    function repeated(node) {
      var ch = node.children;
      if (ch.length < 3) return null;
      var tag = ch[0].tagName;
      for (var i = 1; i < ch.length; i++) if (ch[i].tagName !== tag) return null;
      return ch;
    }

    var targets = [];

    /* 요소마다 '어디서 들어올지'를 정한다.

       레퍼런스는 자치구 조각을 중심에서 바깥 방향으로 밀어 두고 제자리로
       불러들인다. 여기서도 같은 규칙을 쓴다 — 화면 가운데를 기준으로 왼쪽에
       있는 것은 왼쪽에서, 오른쪽에 있는 것은 오른쪽에서 들어온다. 그래서
       두 열·세 열짜리 격자가 가운데로 모이는 것처럼 보인다.

       세로는 항상 아래에서 올라온다. 위에서 내려오게 하면 스크롤 방향과
       반대로 움직여 읽는 흐름과 싸운다. */
    function mark(n, i, step) {
      n.classList.add('rv');

      var r = n.getBoundingClientRect();
      var mid = (global_w() || 1200) / 2;
      var cx = r.left + r.width / 2;
      /* 가운데에서 얼마나 벗어났는지를 -1~1 로 본다. 화면 폭의 절반을 다
         쓰는 넓은 블록은 0 에 가까워져 옆으로 흔들리지 않는다. */
      var off = r.width > mid ? 0 : Math.max(-1, Math.min(1, (cx - mid) / mid));

      n.style.setProperty('--ox', (off * 26).toFixed(1) + 'px');
      n.style.setProperty('--oy', (r.width > mid ? 24 : 18) + 'px');
      n.style.setProperty('--o', Math.min(i, 7) * (step / 68));
      targets.push(n);
    }

    Array.prototype.forEach.call(document.querySelectorAll('.sec'), function (sec) {
      var inn = sec.querySelector('.sec-in');
      if (!inn) return;
      /* 섹션의 구조는 .sec-in 안에 [.sec-label, 본문 칸] 두 칸이다.
         본문 칸은 클래스가 없는 <div> 이므로 이름으로 찾지 않고 위치로 찾는다. */
      var blocks = [];
      Array.prototype.forEach.call(inn.children, function (col) {
        if (col.classList.contains('sec-label')) { blocks.push(col); return; }
        Array.prototype.forEach.call(col.children, function (ch) {
          /* 트랙은 스크롤 길이를 만드는 빈 자리라 올릴 것이 없고, 무대는
             sticky 라 transform 을 걸면 붙어 있는 성질이 깨진다. 둘 다 뺀다. */
          if (ch.classList.contains('qa-track')) return;
          if (ch.classList.contains('qa-stage')) return;
          blocks.push(ch);
        });
      });

      blocks.forEach(function (b, bi) {
        var items = repeated(b);
        if (items) {
          /* 반복 항목이면 블록은 그대로 두고 항목만 하나씩 올린다.
             블록까지 같이 올리면 알파가 곱해져 시차가 묻힌다. */
          for (var k = 0; k < items.length; k++) mark(items[k], k, 55);
        } else {
          mark(b, bi, 70);
        }
      });
    });
    if (!targets.length) return;

    root.classList.add('reveal');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);   /* 한 번 올라오면 끝 — 되감아도 다시 숨지 않는다 */
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });

    targets.forEach(function (n) { io.observe(n); });

    /* ── 파트 전환 ──
       레퍼런스(도시공원)의 움직임이 살아 있는 이유는 곡선이 아니라 '무엇이
       움직임을 몰고 있는가'다. 저쪽은 스크롤 위치가 그대로 장면을 정한다 —
       스크롤을 멈추면 움직임도 멈추고, 되감으면 되감긴다.

       처음에 여기서는 CSS 전환 한 번으로 처리했다. 그러면 섹션이 화면에 들어온
       순간 0.7초간 재생되고 끝나서, 스크롤을 아무리 천천히 해도 '넘어간다'는
       감각이 생기지 않는다. 그래서 --enter 를 스크롤에서 계산해 넣고, CSS 는
       그 값을 위치와 불투명도로 옮기기만 한다.

       움직이는 것은 본문 칸뿐이다. 섹션 제목(.sec-label)은 sticky 로 붙어 있는
       쪽이라 건드리지 않는다 — 제목은 머물고 내용이 올라오는 것이 레퍼런스에서
       무대가 머물고 층이 바뀌는 구조와 같다. transform 을 sticky 의 조상에
       걸면 붙어 있는 성질이 깨지므로, 그 점에서도 본문 칸만 잡는 편이 안전하다. */
    var cols = [];
    Array.prototype.forEach.call(document.querySelectorAll('.sec'), function (sec) {
      /* 질의응답은 그 자체가 sticky 무대를 갖고 있다. 여기까지 움직이면
         무대가 두 번 움직여 흔들린다. */
      if (sec.id === 'qa') return;
      var inn = sec.querySelector('.sec-in');
      if (!inn) return;
      Array.prototype.forEach.call(inn.children, function (col) {
        if (!col.classList.contains('sec-label')) cols.push(col);
      });
    });

    function parts() {
      var vh = window.innerHeight || 800;
      for (var i = 0; i < cols.length; i++) {
        var r = cols[i].getBoundingClientRect();
        /* 아래 88% 지점에 닿을 때 시작해서 38% 지점에서 제자리에 앉는다.
           화면 절반을 지나는 동안 움직이므로 스크롤과 눈이 같이 간다. */
        var e = (vh * 0.88 - r.top) / (vh * 0.50);
        if (r.top < 0) e = 1;                  /* 이미 지나간 것은 붙잡지 않는다 */
        e = e < 0 ? 0 : e > 1 ? 1 : e;
        cols[i].style.setProperty('--enter', e.toFixed(3));
      }
    }

    /* ── 스크롤 진행 띠 ──
       파트가 많고 페이지가 길어서, 지금 어디쯤인지가 보이면 '넘어가는' 감각이
       생긴다. 요소를 하나 만들어 붙이는 쪽을 택했다 — 마크업에 두면 스크립트가
       실패했을 때 0폭짜리 띠가 남는다. */
    var bar = document.createElement('div');
    bar.className = 'scroll-prog';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var qb = false;
    function progress() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? window.scrollY / h : 0;
      bar.style.width = (Math.max(0, Math.min(1, p)) * 100).toFixed(2) + '%';
    }
    window.addEventListener('scroll', function () {
      if (qb) return;
      qb = true;
      window.requestAnimationFrame(function () { qb = false; progress(); parts(); });
    }, { passive: true });
    window.addEventListener('resize', function () { progress(); parts(); });
    progress();
    parts();

    /* 본문 칸이 스크롤에 반응한다는 표시. 이 클래스가 붙기 전에는 CSS 가
       --enter 를 보지 않으므로, 스크립트가 여기까지 오지 못하면 아무것도
       숨거나 밀리지 않는다. */
    root.classList.add('parts');

    /* ── 안전망 ──
       IntersectionObserver 의 콜백은 '렌더 갱신 뒤'에 온다. 브라우저가
       프레임을 아껴 주는 상황(백그라운드 탭 · 인쇄 · 헤드리스 캡처)에서는
       그 갱신이 오지 않아 콜백도 오지 않는다. 그러면 이 연출은 본문을
       영구히 숨기는 장치가 된다 — 실제로 헤드리스 스크린샷에서 히어로
       아래 전체가 빈 화면(표준편차 0.00)으로 찍혔다.

       그래서 시간으로 한 번 더 받쳐 둔다. 2.4초 뒤에 아직 숨어 있는 것은
       조건 없이 열어 버린다. 정상적인 브라우저에서는 그 전에 IO 가
       먼저 열기 때문에 이 타이머가 하는 일이 없다. */
    setTimeout(function () {
      targets.forEach(function (n) { n.classList.add('in'); });
    }, 2400);
  }());

  /* ═══ 내비게이션 현재 위치 ════════════════════════════════════════
     스크롤 위치에 따라 상단 바의 링크 하나만 켠다. */
  (function navState() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
    var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); })
                    .filter(Boolean);
    if (!secs.length || !window.IntersectionObserver) return;

    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen[e.target.id] = e.intersectionRatio; });
      var best = null, bestR = 0;
      Object.keys(seen).forEach(function (id) {
        if (seen[id] > bestR) { bestR = seen[id]; best = id; }
      });
      links.forEach(function (a) {
        a.classList.toggle('on', best !== null && a.getAttribute('href') === '#' + best);
      });
    }, { rootMargin: '-70px 0px -55% 0px', threshold: [0, .1, .3, .6, 1] });

    secs.forEach(function (s) { io.observe(s); });
  }());

}());
