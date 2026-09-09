/* HVAC Knowledge Platform — 데이터 레이어
   ============================================================
   이 파일의 모든 값은 레퍼런스/hvac 경진대회/ 의 원본 자료에서 확인한 것이다.

     ontology.ttl                    ABox — 개체·값·관계·출처
     hvo.ttl                         TBox — 클래스·속성·관계 술어
     CQ 전달.docx                     검증된 Competency Question 10문항
     HVAC 경진대회 0908 검토용.pdf      구축 규모·검증 결과

   화면에 쓰이는 숫자와 문자열은 위 네 자료에 실제로 존재하는 것만 담는다.
   근거를 확인할 수 있도록 항목마다 원본 위치를 주석으로 적어 둔다.

   나중에 SPARQL endpoint 나 API 로 갈아끼울 것을 전제로,
   화면 코드(app.js)는 이 객체의 형태만 알고 출처는 모른다.
   ============================================================ */

const KB = {

  /* ── 대상 건물 ── 포스터 §2 대상건물 개요 ───────────────────── */
  building: {
    use:      { ko: '업무시설 (복합단지 내)',      en: 'Office (in a mixed-use complex)' },
    location: { ko: '수도권 · 위치 비공개',              en: 'Seoul metropolitan area (site withheld)' },
    scale:    { ko: '지하 7층 / 지상 13층 · A~D 4개동',  en: 'B7 / 13F · 4 buildings (A–D)' },
    area:     { ko: '약 33만 ㎡',                      en: 'approx. 330,000 m²' },
    basis:    { ko: '2023년 변경설계',                en: '2023 revised design' }
  },

  /* ── 원본 문서 ── ontology.ttl 의 hvo:sourceDrawing 실측 분포 ──
     921개 SourceReference 가 아래 5개 문서를 가리킨다. */
  documents: [
    { name: '설비계산서-A.pdf',                kind: 'hvo:CalculationSheet',  refs: 733 },
    { name: '장비일람표-A (업무).dwg',   kind: 'hvo:EquipmentSchedule', refs: 165 },
    { name: '장비일람표-B (컨벤션).dwg', kind: 'hvo:EquipmentSchedule', refs: 13 },
    { name: '장비일람표-C (호텔).dwg',   kind: 'hvo:EquipmentSchedule', refs: 8 },
    { name: '장비일람표-D (판매시설).dwg', kind: 'hvo:EquipmentSchedule', refs: 2 }
  ],

  /* ── 구축 규모 ── 포스터 §4 "구축 규모와 검증 결과" 표 ────────
     ontology.ttl 을 직접 세어 교차확인한 항목에 verified: true 를 둔다.
       값 노드 4,081        = hvo:QuantityValue 개체 수
       sourcedFrom 15,983  = src: 참조 16,904 − SourceReference 주어 921
       교차검증 948 / 불일치 493 / 허용오차 24 = hvo:valueStatus 실측
       계산단계 83 · 설계전제 29 · 선정근거 16 = 해당 클래스 개체 수 */
  scale: {
    headline: [
      { value: 55791, label: { ko: '트리플',           en: 'Triples' },
        note: { ko: 'RDF 트리플 총수',     en: 'total RDF triples' } },
      { value: 15983, label: { ko: '출처 연결',         en: 'Source links' },
        note: { ko: '트리플 4개 중 1개',   en: '1 of every 4 triples' }, verified: true },
      { value: 4081,  label: { ko: '값 노드',           en: 'Value nodes' },
        note: { ko: 'QuantityValue 개체',  en: 'QuantityValue individuals' }, verified: true },
      { value: 949,   label: { ko: 'HVAC 설비 · 공간 · 부품', en: 'HVAC / Space / Parts' },
        note: { ko: '개체 5,051 중',       en: 'of 5,051 individuals' } },
      { value: 948,   label: { ko: '교차검증',          en: 'Cross-validated' },
        note: { ko: '도면과 계산서 일치',   en: 'drawing = calculation' }, verified: true },
      { value: 493,   label: { ko: '값 불일치',         en: 'Divergent' },
        note: { ko: '두 값 모두 보존',      en: 'both values preserved' }, verified: true }
    ],
    detail: [
      { label: { ko: '노드 / 엣지',       en: 'Nodes / edges' },        value: '5,972 / 20,847' },
      { label: { ko: '개체',             en: 'Individuals' },          value: '5,051' },
      { label: { ko: '스키마 클래스',     en: 'Schema classes' },       value: '83  (Brick 58 + New 25)' },
      { label: { ko: '스키마 속성',       en: 'Schema properties' },    value: '74' },
      { label: { ko: '근거 사슬',         en: 'Evidence chain' },       value: '계산단계 83 · 설계전제 29 · 선정근거 16' },
      { label: { ko: '두 자료 교차확인',   en: 'Both-source objects' },  value: '개체 78%' },
      { label: { ko: '자동생성 소요',      en: 'Build time / cost' },    value: '87분 28초 / $24.19' },
      { label: { ko: 'CQ 테스트',        en: 'CQ test' },              value: '58문항 중 57문항 통과 (98.3%)' }
    ]
  },

  /* ── 값 상태 분포 ── ontology.ttl 의 hvo:valueStatus 전수 집계 ──
     2,614 + 948 + 493 + 24 + 2 = 4,081 → 값 노드 총수와 정확히 일치한다. */
  valueStatus: [
    { code: 'VERIFIED',      count: 948,  tone: 'ok',
      label: { ko: '교차검증',    en: 'Cross-validated' },
      desc:  { ko: '서로 다른 자료에서 같은 값이 확인됨',
               en: 'the same value confirmed in different documents' } },
    { code: 'DIVERGENT',     count: 493,  tone: 'warn',
      label: { ko: '값 불일치',   en: 'Divergent' },
      desc:  { ko: '문서 간 값이 다름 — 어느 쪽도 지우지 않고 둘 다 보존',
               en: 'documents disagree — both values preserved, neither discarded' } },
    { code: 'TOLERANCE_OK',  count: 24,   tone: 'tol',
      label: { ko: '허용오차 내',  en: 'Within tolerance' },
      desc:  { ko: '값이 다르지만 허용오차 안 — 실제 모순과 구분',
               en: 'values differ but stay within tolerance — separated from real conflict' } },
    { code: 'SINGLE_SOURCE', count: 2614, tone: 'neutral',
      label: { ko: '단일 출처',    en: 'Single source' },
      desc:  { ko: '한 자료에서만 확인 — 교차확인할 상대가 없음',
               en: 'found in one document only — nothing to cross-check against' } },
    { code: 'UNRESOLVED',    count: 2,    tone: 'neutral',
      label: { ko: '미해결',      en: 'Unresolved' },
      desc:  { ko: '판정 보류 — 상태 자체를 기록해 남긴다',
               en: 'verdict withheld — the state itself is recorded' } }
  ]
};

/* ── 장비 ── ontology.ttl 의 inst:ZHUA01 / inst:ZHUA02 / inst:OHUA03 ──
   status·kind 는 각 장비의 hvo:QuantityValue 노드에서 가져왔다.
   한 속성에 값이 여러 개면(모터동력 2.2 / 3.0) 배열로 그대로 남긴다.
   ontology.ttl 이 두 값을 지우지 않았으므로 화면도 지우지 않는다. */
KB.equipment = [
  {
    id: 'ZHUA01',
    cls: 'hvo:UnderfloorAirHandlingUnit',
    clsLabel: { ko: '바닥공기조화기 (ZHU)', en: 'Underfloor Air Handling Unit' },
    parent: 'brick:Air_Handling_Unit',
    quantity: 1,
    /* hvo:installationLocation 에 두 값이 함께 기록되어 있다 */
    location: ['2층 공조실', '해당층'],
    /* hvo:serves — 두 Zone 식별자가 같은 개체라는 관계가 없으므로 합치지 않는다 (CQ #2) */
    serves: ['2층_바닥공조_ZONE1', 'A_2층_바닥공조_ZONE1'],
    hasLocation: '해당층',
    parts: [
      { id: 'ZHUA01_SF',   cls: 'brick:Supply_Fan',         label: { ko: '급기팬',   en: 'Supply Fan' } },
      { id: 'ZHUA01_MOT',  cls: 'brick:Motor',              label: { ko: '전동기',   en: 'Motor' } },
      { id: 'A_H_Coil',    cls: 'brick:Hot_Water_Coil',     label: { ko: '가열코일', en: 'Heating Coil' } },
      { id: 'Cool_g_Coil', cls: 'brick:Chilled_Water_Coil', label: { ko: '냉수코일', en: 'Chilled Water Coil' } }
    ],
    specs: [
      { prop: 'hvo:designAirFlow', label: { ko: '설계풍량', en: 'Design air flow' }, key: true,
        values: [{ v: 7300, unit: 'CMH', kind: 'rated', status: 'VERIFIED', dtype: 'C' }] },
      { prop: 'hvo:designStaticPressure', label: { ko: '설계정압', en: 'Static pressure' },
        values: [{ v: 610, unit: 'Pa', kind: 'rated', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:controlMethod', label: { ko: '제어방식', en: 'Control method' },
        values: [{ v: 'CAV', unit: '', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:motorPower', label: { ko: '모터동력', en: 'Motor power' }, key: true,
        values: [
          { v: 2.2, unit: 'kW', kind: 'rated', status: 'DIVERGENT', dtype: 'A' },
          { v: 3.0, dp: 1, unit: 'kW', kind: 'rated', status: 'SINGLE_SOURCE' }
        ] },
      { prop: 'hvo:coilCapacity', label: { ko: '코일용량 · 냉방 재열', en: 'Coil capacity · cooling' },
        values: [{ v: 32265, unit: 'W', status: 'VERIFIED', dtype: 'C' }] },
      { prop: 'hvo:coilCapacity', label: { ko: '코일용량 · 난방 예열', en: 'Coil capacity · heating' },
        values: [{ v: 11030, unit: 'W', status: 'VERIFIED', dtype: 'C' }] },
      { prop: 'hvo:sensibleCoolingLoad', label: { ko: '실내냉방부하 · 현열', en: 'Sensible cooling load' },
        values: [{ v: 24282, unit: 'W', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:heatingLoad', label: { ko: '실내난방부하 · 전열', en: 'Heating load' },
        values: [{ v: 9888, unit: 'W', kind: 'calculated', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:fanType', label: { ko: '팬 형식', en: 'Fan type' },
        values: [{ v: 'EC FAN · AirFoil', unit: '', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:enteringAirTemp', label: { ko: '입구 공기온도', en: 'Entering air temp' },
        values: [{ v: 20, unit: '℃', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:leavingAirTemp', label: { ko: '출구 공기온도', en: 'Leaving air temp' },
        values: [
          { v: 16, unit: '℃', status: 'DIVERGENT', dtype: 'A' },
          { v: 24.1, unit: '℃', status: 'DIVERGENT', dtype: 'A' }
        ] }
    ],
    sources: ['계산서 p.205', '계산서 p.228', '계산서 p.252', '계산서 p.253',
              '계산서 p.538', '계산서 p.547', '계산서 p.551', 'SCH-A03'],
    basis: 'inst:ZHUA01_BASIS'
  },

  {
    id: 'ZHUA02',
    cls: 'hvo:UnderfloorAirHandlingUnit',
    clsLabel: { ko: '바닥공기조화기 (ZHU)', en: 'Underfloor Air Handling Unit' },
    parent: 'brick:Air_Handling_Unit',
    quantity: 1,
    location: ['2층 공조실', '해당층'],
    serves: ['A_2층_바닥공조_ZONE2'],
    hasLocation: '해당층',
    parts: [
      { id: 'ZHUA02_SF',  cls: 'brick:Supply_Fan', label: { ko: '급기팬', en: 'Supply Fan' } },
      { id: 'ZHUA02_MOT', cls: 'brick:Motor',      label: { ko: '전동기', en: 'Motor' } }
    ],
    specs: [
      { prop: 'hvo:designAirFlow', label: { ko: '설계풍량', en: 'Design air flow' }, key: true,
        values: [
          { v: 6200, unit: 'CMH', kind: 'rated',      status: 'TOLERANCE_OK', dtype: 'B' },
          { v: 6201, unit: 'CMH', kind: 'calculated', status: 'TOLERANCE_OK', dtype: 'B' }
        ] },
      { prop: 'hvo:designStaticPressure', label: { ko: '설계정압', en: 'Static pressure' },
        values: [{ v: 610, unit: 'Pa', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:controlMethod', label: { ko: '제어방식', en: 'Control method' },
        values: [{ v: '(CAV)', unit: '', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:motorPower', label: { ko: '모터동력', en: 'Motor power' },
        values: [{ v: 3.0, dp: 1, unit: 'kW', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:coilCapacity', label: { ko: '코일용량 · 냉방', en: 'Coil capacity · cooling' },
        values: [{ v: 30274, unit: 'W', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:coilCapacity', label: { ko: '코일용량 · 난방', en: 'Coil capacity · heating' },
        values: [{ v: 10282, unit: 'W', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:sensibleCoolingLoad', label: { ko: '실내냉방부하 · 현열', en: 'Sensible cooling load' },
        values: [{ v: 20733, unit: 'W', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:heatingLoad', label: { ko: '실내난방부하 · 전열', en: 'Heating load' },
        values: [{ v: 9320, unit: 'W', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:fanType', label: { ko: '팬 형식', en: 'Fan type' },
        values: [{ v: 'EC FAN', unit: '', status: 'SINGLE_SOURCE' }] }
    ],
    sources: ['계산서 p.205', '계산서 p.228', '계산서 p.538',
              '계산서 p.547', '계산서 p.551', 'SCH-A03'],
    basis: null
  },

  {
    id: 'OHUA03',
    cls: 'brick:Dedicated_Outdoor_Air_System_Unit',
    clsLabel: { ko: '외기조화기 (OHU)', en: 'Dedicated Outdoor Air System Unit' },
    parent: 'brick:HVAC_Equipment',
    quantity: 1,
    location: ['A동 옥탑층', '해당층'],
    serves: [],
    hasLocation: null,
    parts: [
      { id: 'OHUA03_SF',         cls: 'brick:Supply_Fan', label: { ko: '급기팬', en: 'Supply Fan' } },
      { id: 'OHUA03_SUPPLY_FAN', cls: 'brick:Supply_Fan', label: { ko: '급기팬', en: 'Supply Fan' } },
      { id: 'OHUA03_RETURN_FAN', cls: 'brick:Return_Fan', label: { ko: '환기팬', en: 'Return Fan' } },
      { id: 'OHUA03_MOT',        cls: 'brick:Motor',      label: { ko: '전동기', en: 'Motor' } }
    ],
    specs: [
      { prop: 'hvo:designAirFlow', label: { ko: '설계풍량', en: 'Design air flow' }, key: true,
        values: [{ v: 17800, unit: 'CMH', kind: 'rated', status: 'VERIFIED', dtype: 'C' }] },
      { prop: 'hvo:designStaticPressure', label: { ko: '설계정압', en: 'Static pressure' },
        values: [{ v: 975, unit: 'Pa', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:controlMethod', label: { ko: '제어방식', en: 'Control method' },
        values: [{ v: 'CAV', unit: '', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:motorPower', label: { ko: '모터동력', en: 'Motor power' },
        values: [{ v: 11.0, dp: 1, unit: 'kW', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:fanDesignation', label: { ko: '팬 규격', en: 'Fan designation' },
        values: [{ v: '63B', unit: '', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:fanType', label: { ko: '팬 형식', en: 'Fan type' },
        values: [{ v: 'Plenum', unit: '', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:totalCoolingLoad', label: { ko: '총 냉방부하', en: 'Total cooling load' }, key: true,
        values: [{ v: 209010, unit: 'W', status: 'SINGLE_SOURCE' }] },
      { prop: 'hvo:coolingCapacity', label: { ko: '냉방능력', en: 'Cooling capacity' },
        values: [
          { v: 209010, unit: 'W', status: 'DIVERGENT', dtype: 'A' },
          { v: 124493, unit: 'W', status: 'DIVERGENT', dtype: 'A' }
        ] },
      { prop: 'hvo:heatingLoad', label: { ko: '난방부하', en: 'Heating load' },
        values: [
          { v: 0,     unit: 'W', kind: 'calculated', status: 'DIVERGENT', dtype: 'A' },
          { v: 98390, unit: 'W', kind: 'calculated', status: 'DIVERGENT', dtype: 'A' }
        ] },
      { prop: 'hvo:outdoorAirFlow', label: { ko: '외기도입량', en: 'Outdoor air flow' },
        values: [{ v: 17800, unit: 'CMH', status: 'SINGLE_SOURCE' }] }
    ],
    sources: ['계산서 p.217', '계산서 p.240', '계산서 p.500', '계산서 p.501',
              '계산서 p.543', '계산서 p.549', '계산서 p.554', 'SCH-A02'],
    basis: 'inst:OHUA03_BASIS'
  }
];

/* ── 근거 사슬 ── ontology.ttl 의 selectedBy → derivedFrom → basedOn → sourcedFrom ──
   step 의 relation 은 hvo.ttl 에 정의된 실제 관계 술어 이름이고,
   text 는 hvo:sourceBasis 문자열을 그대로 옮긴 것이다. */
KB.evidence = [
  {
    id: 'ZHUA01-airflow',
    equipment: 'ZHUA01',
    prop: 'hvo:designAirFlow',
    question: {
      ko: 'ZHUA01의 설계풍량 7,300 CMH는 왜 이 값으로 선정되었는가?',
      en: 'Why was ZHUA01’s design air flow set to 7,300 CMH?'
    },
    answer: {
      ko: '계산 근거에서는 (24,282 + 0) W ÷ (0.335 × 10℃) = 7,249 CMH로 요구 풍량을 계산한다. ABox의 최종 설계풍량은 7,300 CMH로 기록되어 있으므로, 계산 요구량 7,249 CMH를 바탕으로 7,300 CMH가 설계값으로 채택된 것으로 조회된다.',
      en: 'The calculation derives a required air volume of (24,282 + 0) W ÷ (0.335 × 10℃) = 7,249 CMH. The ABox records 7,300 CMH as the final design air flow, so 7,300 CMH was adopted on the basis of the 7,249 CMH requirement.'
    },
    steps: [
      { relation: null,
        node: 'hvo:QuantityValue',
        title: { ko: '최종 설계값', en: 'Final design value' },
        value: '7,300', unit: 'CMH',
        meta: [['valueKind', 'rated'], ['valueStatus', 'VERIFIED']],
        source: 'SCH-A03 · 계산서 p.252 · p.253' },
      { relation: 'hvo:selectedBy',
        node: 'hvo:DesignBasis',
        title: { ko: '선정 근거', en: 'Design basis' },
        value: 'inst:ZHUA01_BASIS', unit: '',
        text: { ko: 'HVAC 설비를 이 용량으로 고른 근거. 계산단계 8개가 이 아래에 매달려 있다.',
                en: 'Why the unit was chosen at this capacity. Eight calculation steps hang below it.' },
        source: '계산서 p.252' },
      { relation: 'hvo:derivedFrom',
        node: 'hvo:CalculationStep',
        title: { ko: '계산 단계 · 요구 풍량', en: 'Calculation step · required air volume' },
        value: '7,249', unit: 'CMH',
        text: { ko: 'Supply Air Volume: (24282 + 0) W ÷ (0.335 × 10 ℃) = 7249',
                en: 'Supply Air Volume: (24282 + 0) W ÷ (0.335 × 10 ℃) = 7249' },
        mono: true,
        source: '계산서 p.252' },
      { relation: 'hvo:basedOn',
        node: 'hvo:DesignCondition',
        title: { ko: '설계 조건', en: 'Design conditions' },
        value: '', unit: '',
        text: { ko: '냉방 · 외기건구온도 31.2 · 외기상대습도 58.0 · 실내건구온도 26.0 · 실내엔탈피 53.18 · Zone Block Peak Time 17:00 · 면적 291 · 인원수 44',
                en: 'Cooling · OA 31.2℃ DB · OA RH 58.0 · Indoor 26.0℃ DB · Indoor enthalpy 53.18 · Zone block peak 17:00 · Area 291 · Occupancy 44' },
        source: '계산서 p.252' },
      { relation: 'hvo:sourcedFrom',
        node: 'hvo:SourceReference',
        title: { ko: '출처', en: 'Source' },
        value: '계산서 p.252', unit: '',
        text: { ko: '설비계산서-A.pdf · 3-4. AHU SELECTION · ZHUA01:A 2층 바닥공조 ZONE1 · 추출 2026-09-03',
                en: '설비계산서-A.pdf · 3-4. AHU SELECTION · ZHUA01:A 2층 바닥공조 ZONE1 · extracted 2026-09-03' },
        excerpt: '3-4. AHU SELECTION\nZHUA01:A 2층 바닥공조 ZONE1\n수량 : 1, 설치 위치 : 해당층\n실내냉방부하 - 현열 : 24,282 W\n장치냉방부하(W/㎡) : 110.88\n급기 풍량(㎥/h/㎡) : 25.09',
        terminal: true }
    ],
    siblings: [
      'Ps: Ps = 7300㎥/h×610Pa ÷(3600×1000×0.65) ×1.15 = 2.19',
      'SPs: SPs = 460+150',
      '냉방용 재열: 냉방 : 0.334 × 7300 ㎥/h × (53.18 − 41.15) kJ/kg × 1.1 ＝ 32,265 W',
      '난방용 예열: 가열 : 0.335 × 7300 ㎥/h × (24.1 − 20) ℃ × 1.1 ＝ 11,030 W',
      '냉방 MAtemp: MAtemp = 0 × 31.2 ℃ ＋ 1 × 26 ℃ = 26 → 26.0 ℃ DB',
      '냉방 MAabso: MAabso = 0×0.0167 kg/kg′＋1×0.0106 kg/kg′= 0.0106',
      'RA Load: RA Load = Q1 + Q3 = 0 + 0 = 0 W'
    ]
  },

  {
    id: 'OHUA03-cooling',
    equipment: 'OHUA03',
    prop: 'hvo:totalCoolingLoad',
    question: {
      ko: 'OHUA03의 총 냉방부하 209,010 W는 어떻게 산정되었는가?',
      en: 'How was OHUA03’s total cooling load of 209,010 W derived?'
    },
    answer: {
      ko: '계산 단계에는 0.334 × 17,800 m³/h × (74.12 − 42.16) kJ/kg × 1.1 = 209,010 W가 기록되어 있다. 17,800 CMH의 공기량과 입·출구 공기 엔탈피 차를 기반으로 총 냉방부하가 산정된 것이다.',
      en: 'The calculation step records 0.334 × 17,800 m³/h × (74.12 − 42.16) kJ/kg × 1.1 = 209,010 W. The total cooling load follows from the 17,800 CMH air volume and the enthalpy difference across the unit.'
    },
    steps: [
      { relation: null,
        node: 'hvo:QuantityValue',
        title: { ko: '최종 설계값', en: 'Final design value' },
        value: '209,010', unit: 'W',
        meta: [['valueOfProperty', 'hvo:totalCoolingLoad']],
        source: '계산서 p.500 · SCH-A02' },
      { relation: 'hvo:selectedBy',
        node: 'hvo:DesignBasis',
        title: { ko: '선정 근거', en: 'Design basis' },
        value: 'inst:OHUA03_BASIS', unit: '',
        text: { ko: '계산단계 8개를 묶는 선정 근거.', en: 'The design basis binding eight calculation steps.' },
        source: '계산서 p.500' },
      { relation: 'hvo:derivedFrom',
        node: 'hvo:CalculationStep',
        title: { ko: '계산 단계 · 냉방', en: 'Calculation step · cooling' },
        value: '209,010', unit: 'W',
        text: { ko: '냉방: 냉방 : 0.334 × 17800 ㎥/h × (74.12 − 42.16) kJ/kg × 1.1 ＝ 209,010 W',
                en: '냉방: 0.334 × 17800 ㎥/h × (74.12 − 42.16) kJ/kg × 1.1 ＝ 209,010 W' },
        mono: true,
        source: '계산서 p.500' },
      { relation: 'hvo:basedOn',
        node: 'hvo:DesignCondition',
        title: { ko: '설계 조건', en: 'Design conditions' },
        value: '', unit: '',
        text: { ko: '냉방 · 외기건구온도 31.2 · 외기상대습도 58.0 · 외기엔탈피 74.12 · 실내건구온도 26.0 · 실내엔탈피 53.18 · OA Peak Time 15:00',
                en: 'Cooling · OA 31.2℃ DB · OA RH 58.0 · OA enthalpy 74.12 · Indoor 26.0℃ DB · Indoor enthalpy 53.18 · OA peak 15:00' },
        source: '계산서 p.500' },
      { relation: 'hvo:sourcedFrom',
        node: 'hvo:SourceReference',
        title: { ko: '출처', en: 'Source' },
        value: '계산서 p.500', unit: '',
        text: { ko: '설비계산서-A.pdf · 추출 2026-09-03 · 도면 SCH-A02의 17,800 값과 함께 보존',
                en: '설비계산서-A.pdf · extracted 2026-09-03 · preserved alongside the 17,800 value from drawing SCH-A02' },
        terminal: true }
    ],
    siblings: [
      'MAtemp: MAtemp = 1 × 31.2 ℃ ＋ 0 × 26 ℃ = 31.2 → 31.2 ℃ DB',
      'MAtemp: MAtemp = 1 × (−11.3) ℃ ＋ 0 × 20 ℃ = −11.3 → −11.3 ℃ DB',
      'MAabso: MAabso = 1×0.0167 kg/kg′＋0×0.0106 kg/kg′= 0.0167',
      '가열: 가열 : 0.335 × 17800 ㎥/h × (20 − 5) ℃ × 1.1 ＝ 98,390 W',
      '난방용 예열: 0.335 × 17800 ㎥/h × (5 + 11.3) ℃ × 1.1 ＝ 106,917 W',
      'SPs: SPs = 570+405',
      'RA Load: RA Load = Q1 + Q3 = 0 + 0 = 0 W'
    ]
  }
];

/* ── 문서 간 정보 검증 ── ontology.ttl 의 hvo:valueStatus / discrepancyType ──
   claims 의 값과 출처는 해당 QuantityValue 노드의 sourcedFrom 을 따른다. */
KB.validation = [
  {
    id: 'verified',
    status: 'VERIFIED',
    dtype: 'C',
    equipment: 'ZHUA01',
    prop: 'hvo:designAirFlow',
    propLabel: { ko: '설계풍량', en: 'Design air flow' },
    cq: 8,
    question: {
      ko: 'ZHUA01의 설계풍량 7,300 CMH는 여러 자료에서 확인된 값인가?',
      en: 'Is ZHUA01’s design air flow of 7,300 CMH confirmed by more than one document?'
    },
    claims: [
      { doc: { ko: '계산서', en: 'Calculation sheet' }, ref: '설비계산서-A.pdf p.252 · p.253',
        value: '7,300', unit: 'CMH', kind: 'rated', excerpt: 'Air Vol.: 7300 ㎥/h x 1' },
      { doc: { ko: '장비일람표 (도면)', en: 'Equipment schedule (drawing)' }, ref: '장비일람표-A (업무).dwg · SCH-A03',
        value: '7,300', unit: 'CMH', kind: 'rated', excerpt: '7,300' }
    ],
    verdict: {
      ko: '서로 다른 자료에서 동일한 값이 확인되었다. 두 출처가 모두 값 노드에 연결되어 보존되므로 교차확인된 값으로 판단할 수 있다.',
      en: 'The same value appears in two different documents. Both sources stay attached to the value node, so the figure can be treated as cross-confirmed.'
    }
  },
  {
    id: 'divergent',
    status: 'DIVERGENT',
    dtype: 'A',
    equipment: 'ZHUA01',
    prop: 'hvo:motorPower',
    propLabel: { ko: '모터동력', en: 'Motor power' },
    cq: 9,
    question: {
      ko: 'ZHUA01의 모터동력은 몇 kW인가?',
      en: 'What is ZHUA01’s motor power in kW?'
    },
    claims: [
      { doc: { ko: '계산서', en: 'Calculation sheet' }, ref: '설비계산서-A.pdf p.253',
        value: '2.2', unit: 'kW', kind: 'rated', status: 'DIVERGENT', excerpt: 'Motor : 2.2 kW x 1' },
      { doc: { ko: '장비일람표 (도면)', en: 'Equipment schedule (drawing)' }, ref: 'SCH-A03 · 계산서 p.205 외',
        value: '3.0', unit: 'kW', kind: 'rated', status: 'SINGLE_SOURCE', excerpt: '3.0' }
    ],
    verdict: {
      ko: '단일 값으로 확정해서 답하면 안 된다. ABox에는 2.2 kW와 3.0 kW가 모두 존재하고, 2.2 kW 정격값은 DIVERGENT로 명시되어 있다. 어느 쪽이 맞는지 시스템이 임의로 고르지 않고 두 값과 각각의 출처를 그대로 보존한 뒤 "문서 간 값이 불일치하므로 확인이 필요하다"는 상태를 남긴다.',
      en: 'This must not be answered with a single figure. The ABox holds both 2.2 kW and 3.0 kW, and the 2.2 kW rating is explicitly marked DIVERGENT. The system does not pick a winner: it keeps both values with their own sources and records that the documents disagree and need checking.'
    },
    philosophy: {
      ko: '모순을 임의로 해소하지 않는다 — 불일치 자체를 지식으로 남긴다.',
      en: 'Conflicts are not silently resolved — the disagreement itself is kept as knowledge.'
    }
  },
  {
    id: 'tolerance',
    status: 'TOLERANCE_OK',
    dtype: 'B',
    equipment: 'ZHUA02',
    prop: 'hvo:designAirFlow',
    propLabel: { ko: '설계풍량', en: 'Design air flow' },
    cq: 10,
    question: {
      ko: 'ZHUA02의 설계풍량이 6,200 CMH와 6,201 CMH로 다른데 오류인가?',
      en: 'ZHUA02’s design air flow appears as both 6,200 and 6,201 CMH — is that an error?'
    },
    claims: [
      { doc: { ko: '장비일람표 (도면)', en: 'Equipment schedule (drawing)' }, ref: 'SCH-A03',
        value: '6,200', unit: 'CMH', kind: 'rated' },
      { doc: { ko: '계산서', en: 'Calculation sheet' }, ref: '설비계산서-A.pdf',
        value: '6,201', unit: 'CMH', kind: 'calculated' }
    ],
    /* 차이 1 CMH 는 기록된 두 값(6,200 / 6,201)의 차이고 dtype 은 ABox 기록이다.
       상대차이 백분율은 어느 자료에도 없어서 넣지 않는다. */
    diff: { value: '1', unit: 'CMH' },
    verdict: {
      ko: '중대한 불일치로 판단하지 않는다. 두 값 모두 TOLERANCE_OK로 분류되어 있으므로 1 CMH 차이는 허용오차 내 차이로 보존하며 DIVERGENT로 처리하지 않는다.',
      en: 'Not treated as a material conflict. Both values are classified TOLERANCE_OK, so the 1 CMH gap is preserved as a within-tolerance difference rather than promoted to DIVERGENT.'
    },
    philosophy: {
      ko: '"값이 다르다"와 "실제 오류다"를 같게 처리하지 않는다.',
      en: '"The values differ" and "the value is wrong" are not the same finding.'
    }
  }
];

/* ── 검증된 Competency Question ── CQ 전달.docx 10문항 전문 ──
   answer 는 문서에 적힌 검증된 예상 답변을 그대로 옮긴 것이다. */
KB.queries = [
  { no: 1, type: 'what', subject: 'ZHUA01',
    q: { ko: 'ZHUA01은 어떤 장비이며 주요 설계 사양은 무엇인가?',
         en: 'What kind of equipment is ZHUA01 and what are its main design specifications?' },
    a: { ko: 'ZHUA01은 바닥공기조화기(ZHU)입니다. 설계풍량은 7,300 CMH, 설계 정압은 610 Pa이며 제어방식은 CAV로 기록되어 있습니다. 코일 용량으로는 32,265 W와 11,030 W가 연결되어 있습니다.',
         en: 'ZHUA01 is an underfloor air handling unit (ZHU). Its design air flow is recorded as 7,300 CMH, static pressure 610 Pa, control method CAV. Two coil capacities are attached: 32,265 W and 11,030 W.' },
    evidence: ['hvo:UnderfloorAirHandlingUnit', 'hvo:designAirFlow 7300', 'hvo:designStaticPressure 610',
               'hvo:controlMethod CAV', 'hvo:coilCapacity 32265 / 11030'],
    source: ['계산서 p.252', '계산서 p.253', 'SCH-A03'],
    status: 'VERIFIED' },

  { no: 2, type: 'what', subject: 'ZHUA01',
    q: { ko: 'ZHUA01은 어디에 설치되어 있으며 어느 Zone을 담당하는가?',
         en: 'Where is ZHUA01 installed and which zone does it serve?' },
    a: { ko: '설치 위치는 ABox에 "2층 공조실"과 "해당층"으로 기록되어 있습니다. 담당 대상으로는 2층_바닥공조_ZONE1과 A_2층_바닥공조_ZONE1이 serves 관계로 연결되어 있습니다. 두 Zone 식별자가 동일 개체라는 명시적 관계는 없으므로 임의로 하나로 합치지는 않습니다.',
         en: 'The ABox records the installation location as both "2층 공조실" and "해당층". Two zones are attached through hvo:serves — 2층_바닥공조_ZONE1 and A_2층_바닥공조_ZONE1. No explicit relation states that the two zone identifiers are the same individual, so they are not merged.' },
    evidence: ['hvo:installationLocation "2층 공조실" / "해당층"', 'hvo:serves inst:2층_바닥공조_ZONE1',
               'hvo:serves inst:A_2층_바닥공조_ZONE1', 'brick:hasLocation inst:해당층'],
    source: ['계산서 p.252', '계산서 p.253', '계산서 p.538'],
    status: 'SINGLE_SOURCE',
    note: { ko: '동일 개체라는 근거가 없으면 합치지 않는다 — 판단을 지식으로 위장하지 않는다.',
            en: 'Without evidence of identity, the two are not merged — a guess is not recorded as knowledge.' } },

  { no: 3, type: 'what', subject: 'OHUA03',
    q: { ko: 'OHUA03은 어떤 장비이며 주요 사양은 무엇인가?',
         en: 'What kind of equipment is OHUA03 and what are its main specifications?' },
    a: { ko: 'OHUA03은 외기조화기(OHU, Dedicated Outdoor Air System Unit)입니다. 제어방식은 CAV, 설계풍량은 17,800 CMH, 설계 정압은 975 Pa, 팬 형식은 Plenum, 팬 규격은 63B입니다. 모터동력은 11 kW이며 설치 위치로 A동 옥탑층과 해당층이 기록되어 있습니다.',
         en: 'OHUA03 is a dedicated outdoor air system unit (OHU). Control method CAV, design air flow 17,800 CMH, static pressure 975 Pa, fan type Plenum, fan designation 63B. Motor power is 11 kW, and the installation location is recorded as both "A동 옥탑층" and "해당층".' },
    evidence: ['brick:Dedicated_Outdoor_Air_System_Unit', 'hvo:designAirFlow 17800',
               'hvo:designStaticPressure 975', 'hvo:fanType Plenum', 'hvo:fanDesignation 63B',
               'hvo:motorPower 11.0'],
    source: ['계산서 p.500', '계산서 p.501', 'SCH-A02'],
    status: 'VERIFIED' },

  { no: 4, type: 'what', subject: 'OHUA03',
    q: { ko: 'OHUA03을 구성하는 부품은 무엇인가?',
         en: 'Which components make up OHUA03?' },
    a: { ko: 'OHUA03에는 OHUA03_MOT, OHUA03_RETURN_FAN, OHUA03_SF, OHUA03_SUPPLY_FAN이 hasPart 관계로 연결되어 있습니다. 따라서 모터와 환기팬·급기팬 계열 부품을 구성요소로 조회할 수 있습니다.',
         en: 'OHUA03 has OHUA03_MOT, OHUA03_RETURN_FAN, OHUA03_SF and OHUA03_SUPPLY_FAN attached through brick:hasPart, so the motor and the supply/return fan components can be retrieved as its parts.' },
    evidence: ['brick:hasPart inst:OHUA03_MOT', 'brick:hasPart inst:OHUA03_RETURN_FAN',
               'brick:hasPart inst:OHUA03_SF', 'brick:hasPart inst:OHUA03_SUPPLY_FAN'],
    source: ['계산서 p.500', 'SCH-A02'],
    status: 'SINGLE_SOURCE' },

  { no: 5, type: 'why', subject: 'ZHUA01', flagship: true,
    q: { ko: 'ZHUA01의 설계풍량 7,300 CMH는 왜 이 값으로 선정되었는가?',
         en: 'Why was ZHUA01’s design air flow set to 7,300 CMH?' },
    a: { ko: '계산 근거에서는 (24,282 + 0) W ÷ (0.335 × 10℃) = 7,249 CMH로 요구 풍량을 계산합니다. ABox의 최종 설계풍량은 7,300 CMH로 기록되어 있으므로, 계산 요구량 7,249 CMH를 바탕으로 7,300 CMH가 설계값으로 채택된 것으로 조회됩니다.',
         en: 'The calculation derives a required air volume of (24,282 + 0) W ÷ (0.335 × 10℃) = 7,249 CMH. The ABox records 7,300 CMH as the final design air flow, so 7,300 CMH was adopted on the basis of the 7,249 CMH requirement.' },
    evidence: ['hvo:selectedBy inst:ZHUA01_BASIS', 'hvo:derivedFrom inst:ZHUA01_CALC_b331b097',
               'hvo:sourceBasis "Supply Air Volume: (24282 + 0) W ÷ (0.335 × 10 ℃) = 7249"',
               'hvo:basedOn inst:ZHUA01_DC_COOLING', 'hvo:designAirFlow 7300'],
    source: ['계산서 p.252'],
    status: 'VERIFIED',
    trace: 'ZHUA01-airflow' },

  { no: 6, type: 'why', subject: 'OHUA03',
    q: { ko: 'OHUA03의 총 냉방부하 209,010 W는 어떻게 산정되었는가?',
         en: 'How was OHUA03’s total cooling load of 209,010 W derived?' },
    a: { ko: '계산 단계에는 0.334 × 17,800 m³/h × (74.12 − 42.16) kJ/kg × 1.1 = 209,010 W가 기록되어 있습니다. 따라서 17,800 CMH의 공기량과 입·출구 공기 엔탈피 차를 기반으로 총 냉방부하가 산정된 것입니다.',
         en: 'The calculation step records 0.334 × 17,800 m³/h × (74.12 − 42.16) kJ/kg × 1.1 = 209,010 W, so the total cooling load follows from the 17,800 CMH air volume and the enthalpy difference across the unit.' },
    evidence: ['hvo:derivedFrom inst:OHUA03_CALC_cd545e4d',
               'hvo:sourceBasis "냉방 : 0.334 × 17800 ㎥/h × (74.12 − 42.16) kJ/kg × 1.1 ＝ 209,010 W"',
               'hvo:totalCoolingLoad 209010'],
    source: ['계산서 p.500'],
    status: 'VERIFIED',
    trace: 'OHUA03-cooling' },

  { no: 7, type: 'why', subject: 'OHUA03',
    q: { ko: 'OHUA03 선정에 사용된 냉·난방 설계조건은 무엇인가?',
         en: 'Which cooling and heating design conditions were used to select OHUA03?' },
    a: { ko: '냉방 조건은 외기 31.2℃ DB, RH 58%, 습도비 0.0167, 엔탈피 74.12 kJ/kg, 실내 26℃, RH 50%입니다. 난방 조건은 외기 −11.3℃, RH 63%, 실내 20℃, RH 40%이며, 외기 Peak Time은 15:00으로 기록되어 있습니다.',
         en: 'Cooling: outdoor 31.2℃ DB, RH 58%, humidity ratio 0.0167, enthalpy 74.12 kJ/kg; indoor 26℃, RH 50%. Heating: outdoor −11.3℃, RH 63%; indoor 20℃, RH 40%. The outdoor air peak time is recorded as 15:00.' },
    evidence: ['hvo:basedOn inst:OHUA03_DC_COOLING', 'hvo:basedOn inst:OHUA03_DC_HEATING',
               'hvo:basedOn inst:OHUA03_DC_GEN'],
    source: ['계산서 p.500'],
    status: 'VERIFIED' },

  { no: 8, type: 'trust', subject: 'ZHUA01', flagship: true,
    q: { ko: 'ZHUA01의 설계풍량 7,300 CMH는 여러 자료에서 확인된 값인가?',
         en: 'Is ZHUA01’s design air flow of 7,300 CMH confirmed by more than one document?' },
    a: { ko: '예. VERIFIED 상태입니다. 7,300 CMH가 계산서 자료와 장비일람표 자료에 함께 연결되어 있습니다. 계산서의 ZHUA01 자료와 DWG SCH-A03의 7,300 값이 출처로 보존되어 있으므로 교차확인된 값으로 판단할 수 있습니다.',
         en: 'Yes — the status is VERIFIED. 7,300 CMH is attached to both the calculation sheet and the equipment schedule: the ZHUA01 record in the calculation and the 7,300 figure in DWG SCH-A03 are both preserved as sources, so the value is cross-confirmed.' },
    evidence: ['hvo:valueStatus "VERIFIED"', 'hvo:discrepancyType "C"',
               'hvo:sourcedFrom 계산서 p.252 · p.253', 'hvo:sourcedFrom SCH-A03'],
    source: ['계산서 p.252', '계산서 p.253', 'SCH-A03'],
    status: 'VERIFIED',
    validation: 'verified' },

  { no: 9, type: 'trust', subject: 'ZHUA01', flagship: true,
    q: { ko: 'ZHUA01의 모터동력은 몇 kW인가?',
         en: 'What is ZHUA01’s motor power in kW?' },
    a: { ko: '단일 값으로 확정해서 답하면 안 됩니다. ABox에는 2.2 kW와 3.0 kW가 모두 존재합니다. 특히 2.2 kW 정격값은 DIVERGENT로 명시되어 있으므로, 에이전트는 "문서 간 값이 불일치하므로 확인이 필요하다"고 답하는 것이 적절합니다.',
         en: 'This must not be answered with a single figure. The ABox holds both 2.2 kW and 3.0 kW, and the 2.2 kW rating is explicitly marked DIVERGENT — so the correct answer is that the documents disagree and the value needs checking.' },
    evidence: ['hvo:motorPower 2.2 → valueStatus "DIVERGENT" · discrepancyType "A"',
               'hvo:motorPower 3.0 → valueStatus "SINGLE_SOURCE"',
               'hvo:sourceExcerpt "Motor : 2.2 kW x 1" (계산서 p.253)'],
    source: ['계산서 p.253', 'SCH-A03'],
    status: 'DIVERGENT',
    validation: 'divergent' },

  { no: 10, type: 'trust', subject: 'ZHUA02', flagship: true,
    q: { ko: 'ZHUA02의 설계풍량이 6,200 CMH와 6,201 CMH로 다른데 오류인가?',
         en: 'ZHUA02’s design air flow appears as both 6,200 and 6,201 CMH — is that an error?' },
    a: { ko: '중대한 불일치로 판단하지 않습니다. ABox에는 6,200 CMH와 계산값 6,201 CMH가 모두 존재하지만 두 값 모두 TOLERANCE_OK로 분류되어 있습니다. 따라서 1 CMH 차이는 허용오차 내 차이로 보존하며, DIVERGENT로 처리하지 않습니다.',
         en: 'Not a material conflict. The ABox holds both 6,200 CMH and the calculated 6,201 CMH, but both are classified TOLERANCE_OK — so the 1 CMH difference is preserved as within tolerance and is not promoted to DIVERGENT.' },
    evidence: ['hvo:designAirFlow 6200 → valueKind "rated" · valueStatus "TOLERANCE_OK"',
               'hvo:designAirFlow 6201 → valueKind "calculated" · valueStatus "TOLERANCE_OK"',
               'hvo:discrepancyType "B"'],
    source: ['계산서 p.205', 'SCH-A03'],
    status: 'TOLERANCE_OK',
    validation: 'tolerance' }
];

KB.queryTypes = [
  { key: 'why',   label: { ko: '왜 이 값인가',  en: 'Why this value' },
    note: { ko: '계산 근거 추적',      en: 'trace the calculation' } },
  { key: 'trust', label: { ko: '믿을 수 있나',  en: 'Can it be trusted' },
    note: { ko: '복수 문서 교차검증',   en: 'cross-document validation' } },
  { key: 'what',  label: { ko: '무엇인가',     en: 'What it is' },
    note: { ko: 'HVAC 설비 · 공간 · 부품 조회', en: 'HVAC, space, parts' } }
];

/* ── 구축 워크플로 ── 포스터 §3 을 웹 사용자 수준으로 압축 ──────────
   주의: 포스터는 L 번호를 두 체계로 쓴다. 시스템 아키텍처 패널은
   L1 추출및구조화 / L2 의미해석 / L3 온톨로지구성 / L4 검증및출력 이고,
   "Layer별 구축 규모" 표는 L1 도면·문서추출 / L3 정제 / L4 개체·관계단언 /
   L5 검증·계획·어휘심사 다. 두 체계가 어긋나므로 여기서는 L 번호를 쓰지 않고
   01~06 순번만 두고, 각 단계의 stat 은 표에 적힌 그 단계의 값을 그대로 옮긴다.
   알고리즘 상세와 L 번호는 포스터 §3 에서 본다. */
KB.pipeline = [
  { key: 'extract',
    name:  { ko: '추출 및 구조화',  en: 'Extract & structure' },
    what:  { ko: 'DWG의 괘선으로 셀 격자를 복원하고, PDF의 쪽·표 구조를 뜯어낸다. 여기서는 뜻을 붙이지 않는다 — "이 값은 풍량 칸에 있었다"까지만 안다.',
             en: 'Cell grids are rebuilt from the drawing’s ruling lines and the PDF’s page and table structure is pulled apart. No meaning is attached yet — only "this figure sat in the air-flow column".' },
    stat:  { ko: '도면 추출 40.4초 · 문서 추출 1.5초',
             en: 'drawing extraction 40.4 s · document extraction 1.5 s' } },

  { key: 'interpret',
    name:  { ko: '의미 해석',      en: 'Semantic interpretation' },
    what:  { ko: 'HVAC과 무관한 청크를 걸러내고 개체·속성·단위·맥락에 뜻을 붙인다. LLM이 의미를 해석하는 유일한 지점이며, 전체 소요의 절반이 여기서 쓰인다.',
             en: 'Chunks unrelated to HVAC are filtered out and meaning is attached to individuals, properties, units and context. This is the only point where the LLM interprets meaning, and it takes half the total run.' },
    stat:  { ko: '48분 35초 · 전체 소요의 55.7%',
             en: '48 min 35 s · 55.7% of the run' } },

  { key: 'build',
    name:  { ko: 'TBox / RBox 구성', en: 'TBox / RBox construction' },
    what:  { ko: 'Brick 기반 클래스 목록 안에서만 고른다. 목록 밖 이름은 거부하고 따로 기록한다. 속성도 단위를 함께 보여주고 단위가 다르면 붙이지 않는다 — 그래서 온톨로지가 스키마를 벗어날 수 없다.',
             en: 'Classes are chosen only from the Brick-based list; names outside it are refused and logged separately. Properties are offered with their units and never attached when the unit disagrees — so the ontology cannot leave its schema.' },
    stat:  { ko: '클래스 83 (Brick 58 + 신설 25) · 속성 74',
             en: '83 classes (58 Brick + 25 new) · 74 properties' } },

  { key: 'assert',
    name:  { ko: 'ABox 단언',      en: 'ABox assertion' },
    what:  { ko: '개체·데이터속성·관계·근거 사슬을 단언한다. 도면과 계산서의 값이 다르면 어느 쪽도 버리지 않고 둘 다 남기고 관계만 표시한다.',
             en: 'Individuals, data properties, relations and evidence chains are asserted. Where drawing and calculation disagree, neither is discarded — both are kept and only the relation is marked.' },
    stat:  { ko: '개체 단언 9분 28초 · 관계 단언 14분 49초 · 트리플 55,791',
             en: 'individuals 9 min 28 s · relations 14 min 49 s · 55,791 triples' } },

  { key: 'validate',
    name:  { ko: '검증',          en: 'Validation' },
    what:  { ko: 'SHACL·출처·고립·미매핑을 검사한다. 고치지 않고 상태를 기록한다. 못 만든 것은 사라지지 않고 "왜 못 넣었는지"와 함께 남아 다음 단계의 입력이 된다.',
             en: 'SHACL, provenance, isolation and unmapped items are checked. Nothing is corrected — the state is recorded. What could not be built is not dropped: it stays with the reason, and becomes the input to the next round.' },
    stat:  { ko: 'CQ 58문항 중 57문항 통과 (98.3%) · 전체 87분 28초 · $24.19',
             en: '57 of 58 CQs passed (98.3%) · 87 min 28 s total · $24.19' } },

  { key: 'utilize', highlight: true,
    name:  { ko: '활용',          en: 'Utilization' },
    what:  { ko: '이 페이지가 그 자리다. HVAC 설비를 탐색하고, 설계값의 근거를 거슬러 올라가고, 문서 간 정보의 신뢰성을 검토한다.',
             en: 'This page is that step: explore the equipment, walk back up the evidence behind a design value, and review how far the documents agree.' },
    stat:  { ko: '탐색 · 근거 추적 · 정보 검증',
             en: 'explore · trace · validate' } }
];

/* ── 향후 계획 ── 포스터 §6 ────────────────────────────────── */
KB.future = [
  { label: { ko: '확장', en: 'Extend' },
    text:  { ko: 'HVAC을 중심으로 구축한 온톨로지를 다양한 건물 분야로',
             en: 'from an HVAC-centred ontology out to the other building disciplines' } },
  { label: { ko: '발전', en: 'Develop' },
    text:  { ko: '분야 간 정보를 연계·관리하는 통합 건물 지식체계로',
             en: 'into an integrated building knowledge base that links and manages information across disciplines' } },
  { label: { ko: '효과', en: 'Effect' },
    text:  { ko: '한 분야의 변경이 타 분야에 영향을 주는지 즉시 추적 가능',
             en: 'a change in one discipline can be traced immediately into the others' } }
];

/* ── 질의응답 장면 ── §05 스크롤 스토리 ─────────────────────────
   출처: 레퍼런스/08_질문·정답_카탈로그.md (2026-09-04 추출) 에서 세 문항만 뽑았다.
   질문 문장과 정답은 그 문서에 적힌 것을 그대로 옮겼고, 문서명·도면 시트 번호만
   가명(README "가명화" 표)으로 바꿨다.

   세 문항을 고른 이유는 서로 다른 능력을 하나씩 보여주기 때문이다.
     E1  근거추적 — 값에서 문서와 쪽으로 되짚는다
     X10 파생계산 — 두 값을 이어 어느 문서에도 없는 지표를 만든다
     R2  거부     — 없는 것은 없다고 답한다 (0행이 정답)

   정답은 챗봇 출력이 아니다. 사람이 쓴 SPARQL 을 그래프에 직접 돌려 받은 값이다.
   챗봇은 같은 질문에 매번 조금 다른 질의를 짓기 때문에, 그 출력을 정답으로 적으면
   다음에 다르게 답했을 때 어느 쪽이 틀렸는지 판단할 기준이 사라진다. */
KB.qa = [
  { id: 'E1', kind: { ko: '근거 추적', en: 'Evidence trace' },
    q: { ko: 'ZHUA01 풍량은 어느 문서 몇 쪽에서 나온 거야',
         en: 'Which document and page does the ZHUA01 air flow come from?' },
    /* 8행 중 카탈로그에 적힌 6행. 나머지 2행은 그 문서에도 생략되어 있어 적지 않는다. */
    rows: [
      { k: '설비계산서-A.pdf',        v: 'p.252' },
      { k: '설비계산서-A.pdf',        v: 'p.253' },
      { k: '장비일람표-A (업무).dwg', v: 'SCH-A03', dwg: true },
      { k: '설비계산서-A.pdf',        v: 'p.205' },
      { k: '설비계산서-A.pdf',        v: 'p.228' },
      { k: '설비계산서-A.pdf',        v: 'p.538' }
    ],
    more: { ko: '… 총 8행', en: '… 8 rows in total' },
    note: { ko: '한 값의 출처로 도면과 계산서가 함께 나옵니다. 값을 찾은 것이 아니라 값이 선 자리를 찾은 것입니다.',
            en: 'A single value cites both the drawing and the calculation sheet — the query returns where the value stands, not just the value.' },
    trace: true },

  { id: 'X10', kind: { ko: '파생 계산', en: 'Derived metric' },
    q: { ko: '풍량 대비 냉방부하 밀도 알려줘',
         en: 'What is the cooling load density per unit air flow?' },
    rows: [
      { k: 'OHUA03',   v: '11.7 W/CMH' },
      { k: 'OHUC01',   v: '11.7 W/CMH' },
      { k: 'ZHUA02:A', v: '4.9 W/CMH' },
      { k: 'ZHUC02:C', v: '4.7 W/CMH' },
      { k: 'ZHUC04:C', v: '4.7 W/CMH' }
    ],
    note: { ko: '이 숫자는 어느 문서에도 적혀 있지 않습니다. 풍량과 냉방부하가 한 그래프에 있으니 두 값을 이어 만든 지표입니다.',
            en: 'This number appears in no document. Air flow and cooling load sit in the same graph, so the metric is derived by joining them.' } },

  { id: 'R2', kind: { ko: '거부', en: 'Refusal' },
    q: { ko: '지금 ZHUA01이 몇 도로 돌고 있어',
         en: 'What temperature is ZHUA01 running at right now?' },
    empty: { ko: '해당 정보 없음', en: 'No such information' },
    note: { ko: '답이 없는 것이 정답입니다. 이 온톨로지에는 실시간 운전데이터가 없고 설계값만 있습니다. 없는 값을 지어내지 않는지 보는 문항입니다.',
            en: 'Returning nothing is the correct answer. This ontology holds design values, not live operating data. The question tests whether missing data gets invented.' } }
];
