/**
 * info-panel.js — 우측 정보 패널
 */

// 서울 구별 열섬 특성 맥락 데이터
const GU_CONTEXT = {
  '강남구': { type: '상업·업무', green_ratio: 18, notes: '대형 건물 밀집, 지하 열기 방출 심각' },
  '중구':   { type: '도심 상업', green_ratio: 8,  notes: '역사 지구 + 고밀 상업, 바람길 차단' },
  '영등포구':{ type: '산업·상업', green_ratio: 12, notes: '여의도 고층군 + 산업단지 열 복합' },
  '금천구': { type: '산업단지', green_ratio: 10, notes: '가산·독산 산업단지 폐열 방출' },
  '서초구': { type: '주거·업무', green_ratio: 22, notes: '양재천 냉기 활용 가능' },
  '종로구': { type: '도심 상업', green_ratio: 14, notes: '경복궁·종묘 녹지 인근, 주변 열섬 대비 심화' },
  '마포구': { type: '상업·주거', green_ratio: 16, notes: '한강 바람길 근접, 개발 압력 높음' },
  '용산구': { type: '상업·주거', green_ratio: 15, notes: '이태원·한남 개발지구, 남산 냉기 유입 가능' },
  '성동구': { type: '산업·주거', green_ratio: 13, notes: '뚝섬·성수 재개발 진행, 공장 폐열 잔재' },
  '관악구': { type: '주거', green_ratio: 20, notes: '관악산 냉기 유입, 저층 주거 밀집' },
  '동작구': { type: '주거', green_ratio: 17, notes: '한강·노들섬 바람길 영향권' },
  '강서구': { type: '산업·주거', green_ratio: 14, notes: '김포공항 인근 항공 소음 + 열 복합' },
  '노원구': { type: '주거', green_ratio: 25, notes: '북한산·수락산 냉기, 대규모 아파트 단지' },
};

function getGuContext(gu) {
  return GU_CONTEXT[gu] || null;
}

// ===== 데이터 정보 메타 =====
const DATA_INFO = {
  heatSdot: {
    title: '온도 분포 — 데이터 정보',
    rows: [
      ['출처', 'S-DoT (서울 도시데이터 센서)'],
      ['기간', '2025년 8월, 주간 평균 (06:00~17:59)'],
      ['보간', 'IDW (역거리가중) 공간 보간'],
      ['유효 센서', '897개 / 1,011개 (11% 누락)'],
      ['주요 누락', '일부 외곽 지역 센서 오작동'],
    ],
    quality: { valid: 88.7, missing: 11.3, zero: 0 },
    insight: '서울 도심(중구·강남)에서 기온이 높게 관측됨. 주거지역(노원·관악)은 상대적으로 낮은 편.'
  },
  noise: {
    title: '소음 분포 — 데이터 정보',
    rows: [
      ['출처', 'S-DoT (서울 도시데이터 센서)'],
      ['기간', '2025년 8월, 주간 평균 (06:00~17:59)'],
      ['보간', 'IDW (역거리가중) 공간 보간'],
      ['유효 센서', '988개 / 1,011개 (2% 누락)'],
    ],
    quality: { valid: 97.7, missing: 2.3, zero: 0 },
    insight: '도로변 및 상업지구(강남·종로)에서 55~70dB로 높게 나타남. 생활 소음 기준(65dB) 초과 구역 다수 존재.'
  },
  air: {
    title: 'NO₂ 분포 — 데이터 정보',
    rows: [
      ['출처', 'S-DoT (서울 도시데이터 센서)'],
      ['기간', '2025년 8월, 주간 평균 (06:00~17:59)'],
      ['보간', 'IDW + 최근접 이웃 보간 (서울 전역)'],
      ['NO₂ 유효', '63개 / 1,011개 → OC3CL 타입만 NO₂ 계측 (6%)'],
      ['풍향 유효', '54개 / 1,011개 → OC3CL 타입만 풍향 계측 (5%)'],
      ['측정 범위', '실측 0.19~2.0 ppm (WHO 기준: 0.053 ppm)'],
    ],
    quality: { valid: 6.2, missing: 93.8, zero: 0 },
    insight: '데이터 주의: NO₂·풍향/풍속 계측은 모두 OC3CL 타입 센서에 한정(약 54~63개). 전체의 6% 미만이어서 보간 불확실성이 높음. 풍향 데이터도 마찬가지로 매우 희박하여 바람 방향 분석에 한계가 있음. WHO NO₂ 기준 대비 전 지역이 초과 수준으로 계측됨.'
  },
  uv: {
    title: 'UV 분포 — 데이터 정보',
    rows: [
      ['출처', 'S-DoT (서울 도시데이터 센서)'],
      ['기간', '2025년 8월, 주간 평균 (06:00~17:59)'],
      ['보간', 'IDW 공간 보간 (convex hull + 1km 버퍼 클리핑)'],
      ['유효 센서', '773개 / 1,011개 (76.5%)'],
      ['측정 범위', '유효 센서: 0~16 UV / 99% 이하: 0~1.9 UV'],
      ['등급 기준', 'p5~p95 구간(0.05~1.28 UV) 6등급'],
    ],
    quality: { valid: 76.5, missing: 23.5, zero: 0 },
    insight: '대부분 센서(90% 이상)가 0~0.9 UV 범위. 등급 기준을 p5~p95로 설정해 공간 차이를 부각. 상위 1%에 11~16 UV 극단값 2개(이상치 가능). 06~17시 평균이므로 오전 일조 낮은 구역이 낮게 표시됨.'
  },
  population: {
    title: '생활인구 — 데이터 정보',
    rows: [
      ['출처', '서울시 생활인구 (KT 빅데이터)'],
      ['기간', '2025년 8월, 평일 주간 (06:00~17:59) 평균'],
      ['격자', '250m × 250m 格子'],
      ['인구 기준', '해당 격자에 실제 체류한 추정 인구'],
    ],
    quality: { valid: 100, missing: 0, zero: 0 },
    insight: '강남·여의도·종로 등 업무지구 주간 생활인구 집중. S-DoT 센서의 생활인구는 가장 가까운 250m 격자값으로, 격자 직접 클릭 시와 미세하게 다를 수 있음.'
  },
};

// ===== 데이터 정보 패널 표시 =====
function showDataInfo(key) {
  const info = DATA_INFO[key];
  if (!info) return;
  document.getElementById('info-placeholder').classList.add('hidden');
  const content = document.getElementById('info-content');
  content.classList.remove('hidden');

  const qb = info.quality;
  const totalW = qb.valid + qb.missing + qb.zero;

  content.innerHTML = `
    <div class="info-location">
      <span>${info.title}</span>
    </div>
    <div class="data-info-block">
      ${info.rows.map(([k, v]) => `
        <div class="info-row">
          <span class="info-key">${k}</span>
          <span class="info-val">${v}</span>
        </div>`).join('')}
      <div style="margin-top:6px;">
        <div class="info-row" style="margin-bottom:2px;">
          <span class="info-key" style="color:#475569;">데이터 품질</span>
          <span class="info-val">${qb.valid.toFixed(0)}% 유효 / ${qb.missing.toFixed(0)}% 누락</span>
        </div>
        <div class="data-quality-bar">
          <div class="dq-valid"  style="width:${qb.valid/totalW*100}%;"></div>
          <div class="dq-missing" style="width:${qb.missing/totalW*100}%;"></div>
          ${qb.zero > 0 ? `<div class="dq-zero" style="width:${qb.zero/totalW*100}%;"></div>` : ''}
        </div>
        <div style="font-size:8px;color:#475569;display:flex;gap:8px;margin-top:2px;">
          <span style="color:#22c55e;">■ 유효</span>
          <span style="color:#ef4444;">■ 누락</span>
          ${qb.zero > 0 ? '<span style="color:#f97316;">■ 비계측</span>' : ''}
        </div>
      </div>
    </div>
    ${info.insight ? `
    <div class="info-section-title">분석 인사이트</div>
    <div class="alternative-item info">${info.insight}</div>` : ''}
  `;
}

// ===== 메인 패널 렌더링 =====
function showInfoPanel(type, feature, latlng) {
  document.getElementById('info-placeholder').classList.add('hidden');
  const content = document.getElementById('info-content');
  content.classList.remove('hidden');

  const p = feature.properties;
  let html = '';

  const locName = p.location_name || p.equip_nm || `${p.gu || ''} ${p.dong || ''}`.trim();
  const badgeMap = {
    walking:    ['보행구간', 'badge-orange'],
    sdot:       ['S-DoT 센서', 'badge-blue'],
    noise:      ['소음', 'badge-orange'],
    uv:         ['자외선', 'badge-green'],
    air:        ['대기오염', 'badge-blue'],
    ml:         ['ML 예측', 'badge-red'],
    population: ['생활인구', 'badge-green']
  };
  const [badgeText, badgeCls] = badgeMap[type] || ['', ''];

  html += `<div class="info-location">
    <span>${locName}</span>
    ${badgeText ? `<span class="badge ${badgeCls}">${badgeText}</span>` : ''}
  </div>`;

  // 맥락 테이블
  html += `<table class="context-table">`;
  if (p.gu)   html += `<tr><td>행정구</td><td>${p.gu}</td></tr>`;
  if (p.dong) html += `<tr><td>행정동</td><td>${p.dong}</td></tr>`;
  if (p.region) html += `<tr><td>지역 유형</td><td>${p.region}</td></tr>`;
  if (p.pop_avg > 0) html += `<tr><td>생활인구</td><td>${Math.round(p.pop_avg).toLocaleString()}명/시간 <span style="font-size:8px;color:#475569;">(250m격자)</span></td></tr>`;
  html += `</table>`;

  // 수치 카드
  html += `<div class="info-metrics">`;
  if (p.avg_temperature != null) html += metricCard(`${(+p.avg_temperature).toFixed(1)}°C`, '기온', getGrade(p.avg_temperature, 20, 37));
  if (p.avg_uv != null && p.avg_uv > 0) html += metricCard((+p.avg_uv).toFixed(1), '자외선', getGrade(p.avg_uv, 0, 11));
  if (p.avg_noise != null)  html += metricCard(`${Math.round(p.avg_noise)}dB`, '소음', getGrade(p.avg_noise, 35, 72));
  if (p.avg_no2 != null)    html += metricCard(`${(+p.avg_no2).toFixed(3)}`, 'NO₂(ppm)', getGrade(p.avg_no2, 0, 0.1));
  if (p.noise_avg != null)  html += metricCard(`${Math.round(p.noise_avg)}dB`, '소음', getGrade(p.noise_avg, 35, 72));
  if (p.pop_avg > 0)        html += metricCard(Math.round(p.pop_avg).toLocaleString(), '생활인구', getGrade(p.pop_avg, 0, 9508));
  if (p.predicted_pm25 != null) html += metricCard((+p.predicted_pm25).toFixed(2), 'ML예측', getGrade(p.predicted_pm25, 0, 2));
  html += `</div>`;

  // 풍향/풍속
  if (p.avg_wind_dir != null) {
    html += `<div class="wind-info">
      <svg width="22" height="22" viewBox="-11 -11 22 22" style="transform:rotate(${p.avg_wind_dir}deg);flex-shrink:0;">
        <polygon points="0,-9 4,5 0,1 -4,5" fill="#60a5fa" stroke="white" stroke-width="1"/>
      </svg>
      <div class="wind-text">
        풍향: ${windDirName(p.avg_wind_dir)} (${(+p.avg_wind_dir).toFixed(0)}°)<br>
        풍속: ${p.avg_wind_speed ? (+p.avg_wind_speed).toFixed(1) : '-'} m/s
      </div>
    </div>`;
  }

  // 지역 특성 (GU_CONTEXT만)
  const gu = p.gu || '';
  const ctx = getGuContext(gu);
  if (ctx) {
    html += `<div class="info-section-title">지역특성</div>`;
    html += `<div class="alternative-item good">용도: ${ctx.type} / 녹지율 약 ${ctx.green_ratio}%</div>`;
    if (ctx.notes) html += `<div class="alternative-item info">${ctx.notes}</div>`;
  }

  content.innerHTML = html;
}

function metricCard(value, label, grade) {
  return `<div class="metric-card"><div class="metric-value grade-${grade}">${value}</div><div class="metric-label">${label}</div></div>`;
}

function getGrade(val, min, max) {
  const t = Math.min(1, Math.max(0, (val - min) / (max - min)));
  return Math.min(5, Math.floor(t * 5) + 1);
}

function windDirName(deg) {
  if (deg == null) return '-';
  const dirs = ['북','북북동','북동','동북동','동','동남동','남동','남남동','남','남남서','남서','서남서','서','서북서','북서','북북서'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function hideInfoPanel() {
  document.getElementById('info-placeholder').classList.remove('hidden');
  const c = document.getElementById('info-content');
  c.classList.add('hidden');
  c.innerHTML = '';
}
