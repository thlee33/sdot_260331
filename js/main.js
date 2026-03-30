/**
 * main.js — 지도 초기화 및 레이어 관리
 */

// ===== 지도 초기화 =====
const map = L.map('map', {
  center: [37.5665, 126.9780],
  zoom: 12,
  zoomControl: true,
  attributionControl: true,
  preferCanvas: true
});

// ===== 배경지도 =====
const baseLayers = {};
Object.entries(BASEMAP_TILES).forEach(([k, url]) => {
  baseLayers[k] = L.tileLayer(url, { attribution: '© VWorld', maxZoom: 19 });
});
const hybridLayer = L.tileLayer(HYBRID_URL, { attribution: '© VWorld', maxZoom: 19 });
baseLayers['normal'].addTo(map);
let currentBase = 'normal';

document.querySelectorAll('input[name="basemap"]').forEach(r => {
  r.addEventListener('change', e => {
    map.removeLayer(baseLayers[currentBase]);
    baseLayers[e.target.value].addTo(map);
    currentBase = e.target.value;
  });
});

document.getElementById('layer-hybrid').addEventListener('change', e => {
  e.target.checked ? hybridLayer.addTo(map) : map.removeLayer(hybridLayer);
});

// ===== 레이어 저장소 =====
const layers = {};
const dataCache = {};

// ===== 범례 관리 =====
const activeLegends = {};   // key → true/false

function renderLegendBar() {
  const bar = document.getElementById('legend-bar');
  const items = Object.entries(activeLegends)
    .filter(([k, on]) => on && LEGEND_META[k])
    .map(([k]) => LEGEND_META[k]);
  if (!items.length) { bar.innerHTML = ''; return; }
  bar.innerHTML = items.map(m => {
    if (m.steps) {
      // Natural Breaks: 구간별 색상 스와치
      const rows = m.steps.map(s =>
        `<div class="legend-step">
          <span class="step-swatch" style="background:${s.color}"></span>
          <span class="step-label">${s.label}${m.unit}</span>
        </div>`).join('');
      return `<div class="legend-item">
        <div class="legend-bar-wrap">
          <div class="legend-name">${m.label}</div>
          <div class="legend-steps">${rows}</div>
        </div>
      </div>`;
    }
    // 기본 그라디언트 바
    return `<div class="legend-item">
      <div class="legend-bar-wrap">
        <div class="legend-name">${m.label}</div>
        <div class="legend-gradient-bar ${m.css}"></div>
        <div class="legend-range-row">
          <span>${m.min}${m.unit}</span><span>${m.max}${m.unit}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function setLegendActive(key, on) {
  activeLegends[key] = on;
  renderLegendBar();
}

// ===== 데이터 로드 =====
async function loadJson(path) {
  if (dataCache[path]) return dataCache[path];
  try {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    dataCache[path] = d;
    return d;
  } catch (e) {
    console.warn('로드 실패:', path, e.message);
    return null;
  }
}

// ===== 레이어 토글 공통 =====
function bindLayer(checkboxId, key, loader, opacitySliderId) {
  const cb = document.getElementById(checkboxId);
  if (!cb) return;

  cb.addEventListener('change', async e => {
    if (e.target.checked) {
      if (!layers[key]) {
        layers[key] = await loader();
        if (!layers[key]) {
          cb.checked = false;
          showToast('데이터를 불러올 수 없습니다.');
          return;
        }
      }
      layers[key].addTo(map);
      setLegendActive(key, true);
    } else {
      if (layers[key]) map.removeLayer(layers[key]);
      setLegendActive(key, false);
    }
  });

  if (opacitySliderId) {
    const sl = document.getElementById(opacitySliderId);
    if (sl) sl.addEventListener('input', e => {
      const op = e.target.value / 100;
      const ly = layers[key];
      if (!ly) return;
      if (ly.setOpacity) ly.setOpacity(op);
      else if (ly.setStyle) ly.setStyle({ fillOpacity: op * 0.55 });
    });
  }
}

// ===== 클릭 핸들러 =====
const onSdotClick  = (feat, latlng) => showInfoPanel('sdot',       feat, latlng);
const onNoiseClick = feat => showInfoPanel('noise',      feat, null);
const onUvClick    = feat => showInfoPanel('uv',         feat, null);
const onAirClick   = feat => showInfoPanel('air',        feat, null);
const onPopClick   = feat => showInfoPanel('population', feat, null);

// ===== 레이어 등록 =====

// 1. 센서-온도
bindLayer('layer-sensor-temp', 'sensorTemp', async () => {
  const d = await loadJson('data/sdot_august_avg.geojson');
  if (!d) return null;
  return createSensorLayer(d.features, 'avg_temperature', [20, 37], 'temperature', onSdotClick);
});

// 2. 온도 분포 (IDW 보간 폴리곤)
bindLayer('layer-heat-sdot', 'heatSdot', async () => {
  const d = await loadJson('data/heat_island.geojson');
  if (!d) return null;
  return createHeatIslandLayer(d);
}, 'opacity-heat-sdot');

// 3. 센서-소음
bindLayer('layer-sensor-noise', 'sensorNoise', async () => {
  const d = await loadJson('data/sdot_august_avg.geojson');
  if (!d) return null;
  return createSensorLayer(d.features, 'avg_noise', [35, 72], 'noise', onSdotClick);
});

// 4. 소음 분포
bindLayer('layer-noise', 'noise', async () => {
  const d = await loadJson('data/noise.geojson');
  if (!d) return null;
  return createNoisePolygonLayer(d, onNoiseClick);
}, 'opacity-noise');

// 5. 센서-UV
bindLayer('layer-sensor-uv', 'sensorUv', async () => {
  const d = await loadJson('data/sdot_august_avg.geojson');
  if (!d) return null;
  return createSensorLayer(d.features, 'avg_uv', [0, 2], 'uv', onSdotClick);
});

// 6. UV 분포
bindLayer('layer-uv', 'uv', async () => {
  const d = await loadJson('data/uv.geojson');
  if (!d) return null;
  return createUvPolygonLayer(d, onUvClick);
}, 'opacity-uv');

// 7. 센서-NO₂
bindLayer('layer-sensor-air', 'sensorAir', async () => {
  const d = await loadJson('data/sdot_august_avg.geojson');
  if (!d) return null;
  const filtered = { ...d, features: d.features.filter(f => (f.properties.avg_no2 || 0) > 0) };
  if (!filtered.features.length) { showToast('NO₂ 데이터: 유효 센서 없음'); return null; }
  return createSensorLayer(filtered.features, 'avg_no2', [0, 2], 'air', onSdotClick);
});

// 9. NO₂ 분포
bindLayer('layer-air', 'air', async () => {
  const d = await loadJson('data/air_pollution.geojson');
  if (!d) return null;
  return createAirPolygonLayer(d, onAirClick);
}, 'opacity-air');

// 10. 생활인구 격자
bindLayer('layer-population', 'population', async () => {
  showToast('생활인구 데이터 로딩 중... (2.9MB)');
  const d = await loadJson('data/population_grid.geojson');
  if (!d) return null;
  return createPopulationLayer(d, onPopClick);
}, 'opacity-population');

// ===== ℹ 정보 버튼 =====
document.querySelectorAll('.info-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    showDataInfo(btn.dataset.info);
  });
});

// ===== 토스트 알림 =====
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed;bottom:60px;left:50%;transform:translateX(-50%);
      background:rgba(22,33,62,0.95);border:1px solid #3b82f6;
      color:#e2e8f0;padding:8px 16px;border-radius:6px;
      font-size:11px;z-index:9999;transition:opacity 0.3s;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.style.opacity = '0', 3000);
}

// ===== 초기화 완료 =====
console.log('서울 도시환경 분석 초기화 완료');
