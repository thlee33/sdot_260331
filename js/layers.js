/**
 * layers.js — 레이어 생성 함수 모음
 */

// ===== 브이월드 타일 =====
const BASEMAP_TILES = {
  normal:    'https://xdworld.vworld.kr/2d/Base/service/{z}/{x}/{y}.png',
  satellite: 'https://xdworld.vworld.kr/2d/Satellite/service/{z}/{x}/{y}.jpeg',
  night:     'https://xdworld.vworld.kr/2d/midnight/service/{z}/{x}/{y}.png',
  white:     'https://xdworld.vworld.kr/2d/white/service/{z}/{x}/{y}.png'
};
const HYBRID_URL = 'https://xdworld.vworld.kr/2d/Hybrid/service/{z}/{x}/{y}.png';

// ===== 컬러 스케일 =====
// 센서 포인트: YlOrRd (온도), Reds (소음·NO₂), Purples (UV)
const SCALES = {
  temperature: chroma.scale(['#ffffb2','#fecc5c','#fd8d3c','#f03b20','#bd0026']).domain([20, 37]),
  noise:       chroma.scale(['#fff5f0','#fdcab5','#fc8a6a','#f24636','#bd0017']).domain([35, 72]),
  air:         chroma.scale(['#fff5f0','#fdcab5','#fc8a6a','#f24636','#bd0017']).domain([0, 2]),
  uv:          chroma.scale(['#f2f0f7','#cbc9e2','#9e9ac8','#756bb1','#54278f','#3f007d']).domain([0, 2]),
};

// 분포 폴리곤: gist_heat (온도), Blues (소음/NO₂), Purples (UV), Blue (인구)
const RASTER_COLORS = {
  // gist_heat 6단계 (저온→고온): black → dark red → red → orange → yellow → white
  temperature: ['#000000','#600000','#c00000','#ff4000','#ffb200','#ffffff'],
  noise:       ['#f0f9ff','#bdd7ee','#6baed6','#2171b5','#084594','#03254c'],
  air:         ['#f0f9ff','#bdd7ee','#6baed6','#2171b5','#084594','#03254c'],
  uv:          ['#f2f0f7','#cbc9e2','#9e9ac8','#756bb1','#54278f','#3f007d'],
  population:  ['#ffffcc','#a1dab4','#41b6c4','#2c7fb8','#253494'],
};

// ===== 범례 메타데이터 =====
const LEGEND_META = {
  sensorTemp:  { label: '센서-온도',   unit: '°C',   min: 20,   max: 37,    css: 'sensor-ylorrd'   },
  heatSdot:    { label: '온도 분포',   unit: '°C',   min: 28.5, max: 32.0,  css: 'raster-gist-heat'},
  sensorNoise: { label: '센서-소음',   unit: 'dB',   min: 35,   max: 72,    css: 'sensor-reds'     },
  noise:       { label: '소음 분포',   unit: 'dB',   min: 35,   max: 72,    css: 'raster-blues'    },
  sensorUv:    { label: '센서-UV',     unit: 'UV',   min: 0,    max: 2,     css: 'sensor-purples'  },
  uv:          { label: 'UV 분포',     unit: 'UV',   min: 0.05, max: 1.28,  css: 'raster-uv'       },
  sensorAir:   { label: '센서-NO₂',   unit: 'ppm',  min: 0,    max: 2,     css: 'sensor-reds'     },
  air:         { label: 'NO₂ 분포',   unit: 'ppm',  min: 0.5,  max: 1.15,  css: 'raster-blues'    },
  population:  {
    label: '생활인구', unit: '명/h', min: 0, max: 16804, css: 'raster-ylgnbu',
    steps: [
      { color: '#ffffcc', label: '0 ~ 706' },
      { color: '#a1dab4', label: '707 ~ 1,867' },
      { color: '#41b6c4', label: '1,868 ~ 3,404' },
      { color: '#2c7fb8', label: '3,405 ~ 6,290' },
      { color: '#253494', label: '6,291 ~ 16,804' },
    ]
  },
};

// ===== 등급 계산 =====
function getGrade(val, min, max) {
  const t = Math.min(1, Math.max(0, (val - min) / (max - min)));
  return Math.min(5, Math.floor(t * 5) + 1);
}
function gradeColor(grade) {
  return ['#3b82f6','#22c55e','#eab308','#f97316','#ef4444'][grade - 1] || '#94a3b8';
}

// ===== 온도 분포 폴리곤 레이어 (IDW 보간, Magma, 툴팁 없음) =====
function createHeatIslandLayer(geojsonData) {
  if (!geojsonData || !geojsonData.features.length) return null;
  const colors = RASTER_COLORS.temperature;
  return L.geoJSON(geojsonData, {
    style: feat => {
      const g = Math.min(colors.length, Math.max(1, feat.properties.grade || 1));
      return { fillColor: colors[g - 1], fillOpacity: 0.6, color: 'transparent', weight: 0 };
    }
  });
}

// ===== 자외선 분포 폴리곤 레이어 (Purples, 툴팁 없음) =====
function createUvPolygonLayer(geojsonData, onClick) {
  if (!geojsonData || !geojsonData.features.length) return null;
  return L.geoJSON(geojsonData, {
    style: feat => {
      const g = Math.min(6, Math.max(1, feat.properties.grade || 1));
      return { fillColor: RASTER_COLORS.uv[g - 1], fillOpacity: 0.55, color: 'transparent', weight: 0 };
    },
    onEachFeature: (feat, layer) => {
      if (onClick) layer.on('click', e => { L.DomEvent.stopPropagation(e); onClick(feat); });
    }
  });
}

// ===== 소음 분포 폴리곤 레이어 (Blues, 툴팁 없음) =====
function createNoisePolygonLayer(geojsonData, onClick) {
  if (!geojsonData || !geojsonData.features.length) return null;
  return L.geoJSON(geojsonData, {
    style: feat => {
      const g = Math.min(5, Math.max(1, feat.properties.grade || 1));
      return { fillColor: RASTER_COLORS.noise[g - 1], fillOpacity: 0.55, color: 'transparent', weight: 0 };
    },
    onEachFeature: (feat, layer) => {
      if (onClick) layer.on('click', e => { L.DomEvent.stopPropagation(e); onClick(feat); });
    }
  });
}

// ===== 대기오염 분포 폴리곤 레이어 (Blues, 툴팁 없음) =====
function createAirPolygonLayer(geojsonData, onClick) {
  if (!geojsonData || !geojsonData.features.length) return null;
  return L.geoJSON(geojsonData, {
    style: feat => {
      const g = Math.min(5, Math.max(1, feat.properties.grade || 1));
      return { fillColor: RASTER_COLORS.air[g - 1], fillOpacity: 0.55, color: 'transparent', weight: 0 };
    },
    onEachFeature: (feat, layer) => {
      if (onClick) layer.on('click', e => { L.DomEvent.stopPropagation(e); onClick(feat); });
    }
  });
}

// ===== 풍향/풍속 SVG 마커 레이어 =====
function createWindLayer(geojsonData) {
  if (!geojsonData || !geojsonData.features.length) return null;
  return L.geoJSON(geojsonData, {
    pointToLayer: (feat, latlng) => {
      const dir   = feat.properties.avg_wind_dir   || 0;
      const speed = feat.properties.avg_wind_speed || 0;
      const spd   = Math.min(speed, 5);
      const size  = Math.round(20 + spd * 4);
      const svgHtml = `
        <svg width="${size}" height="${size}" viewBox="-12 -12 24 24"
             style="transform:rotate(${dir}deg);display:block;overflow:visible;">
          <polygon points="0,-10 5,6 0,2 -5,6"
                   fill="#60a5fa" stroke="white" stroke-width="1.2" opacity="0.92"/>
          <circle r="2.5" fill="white" opacity="0.8"/>
        </svg>`;
      const icon = L.divIcon({
        className: 'wind-marker',
        html: svgHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
      return L.marker(latlng, { icon });
    },
    onEachFeature: (feat, layer) => {
      const p = feat.properties;
      layer.bindTooltip(
        `<b>${p.equip_nm || '센서'}</b><br>풍향: ${windDirName(p.avg_wind_dir)} (${(p.avg_wind_dir||0).toFixed(0)}°)<br>풍속: ${(p.avg_wind_speed||0).toFixed(1)} m/s`,
        { direction: 'top', offset: [0, -10] }
      );
    }
  });
}

// ===== S-DoT 개별 센서 레이어 (단계구분도 - Reds) =====
function createSensorLayer(geojsonData, field, domain, scale, onClick) {
  const [minV, maxV] = domain;
  return L.geoJSON(geojsonData, {
    filter: feat => feat.properties[field] != null && feat.properties[field] !== 0,
    pointToLayer: (feat, latlng) => {
      const val = +feat.properties[field];
      const col = SCALES[scale] ? SCALES[scale](val).hex() : '#fc8a6a';
      const icon = L.divIcon({
        className: '',
        html: `<div class="sensor-dot" style="width:8px;height:8px;background:${col};"></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4]
      });
      return L.marker(latlng, { icon });
    },
    onEachFeature: (feat, layer) => {
      const p = feat.properties;
      const val = (+(p[field] || 0)).toFixed(2);
      const fieldLabel = { avg_temperature: '기온', avg_noise: '소음', avg_uv: '자외선', avg_no2: 'NO₂' }[field] || field;
      const unit = { avg_temperature: '°C', avg_noise: 'dB', avg_uv: 'UV', avg_no2: 'ppm' }[field] || '';
      layer.bindTooltip(
        `<b>${p.equip_nm || p.location_name || ''}</b><br>${fieldLabel}: ${val}${unit}`,
        { direction: 'top', offset: [0, -5] }
      );
      if (onClick) layer.on('click', e => { L.DomEvent.stopPropagation(e); onClick(feat, layer.getLatLng()); });
    }
  });
}

// ===== 보행위험 마커 레이어 =====
function createWalkingLayer(geojsonData, onClick) {
  if (!geojsonData || !geojsonData.features.length) return null;
  return L.geoJSON(geojsonData, {
    pointToLayer: (feat, latlng) => {
      const grade = feat.properties.heat_grade || 3;
      const col   = gradeColor(grade);
      const size  = 14 + (grade - 1) * 3;
      const icon  = L.divIcon({
        className: '',
        html: `<div class="walk-marker" style="width:${size}px;height:${size}px;background:${col};">${grade >= 4 ? '!' : '·'}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
      return L.marker(latlng, { icon });
    },
    onEachFeature: (feat, layer) => {
      const p = feat.properties;
      const t = p.avg_temperature ? p.avg_temperature.toFixed(1) : '-';
      layer.bindTooltip(
        `<b>${p.location_name || '보행구간'}</b><br>기온: ${t}°C / 등급: ${p.heat_grade || '-'}`,
        { direction: 'top', offset: [0, -8] }
      );
      if (onClick) layer.on('click', e => { L.DomEvent.stopPropagation(e); onClick(feat, layer.getLatLng()); });
    }
  });
}

// ===== ML 오염확산 레이어 =====
function createMlLayer(geojsonData, onClick) {
  if (!geojsonData || !geojsonData.features.length) return null;
  return L.geoJSON(geojsonData, {
    style: feat => {
      const risk = feat.properties.risk_level || 'low';
      const c = { high: '#ef4444', medium: '#f97316', low: '#eab308' }[risk] || '#eab308';
      return { fillColor: c, fillOpacity: 0.3, color: c, weight: 1, dashArray: '3,3' };
    },
    onEachFeature: (feat, layer) => {
      const p = feat.properties;
      layer.bindTooltip(
        `ML 예측<br>위험: ${p.risk_level || '-'}<br>오염원 방향: ${p.source_dir || '-'}<br>풍속: ${(p.wind_speed||0).toFixed(1)} m/s`,
        { direction: 'top' }
      );
      if (onClick) layer.on('click', e => { L.DomEvent.stopPropagation(e); onClick(feat); });
    }
  });
}

// ===== 생활인구 격자 레이어 (Blues, 툴팁 없음) =====
function createPopulationLayer(geojsonData, onClick) {
  if (!geojsonData || !geojsonData.features.length) return null;
  return L.geoJSON(geojsonData, {
    style: feat => {
      const grade = Math.min(5, Math.max(1, feat.properties.grade || 1));
      return {
        fillColor: RASTER_COLORS.population[grade - 1] || RASTER_COLORS.population[0],
        fillOpacity: 0.55,
        color: 'transparent',
        weight: 0
      };
    },
    onEachFeature: (feat, layer) => {
      if (onClick) layer.on('click', e => { L.DomEvent.stopPropagation(e); onClick(feat); });
    }
  });
}

// ===== 유틸 =====
function windDirName(deg) {
  if (deg == null) return '-';
  const dirs = ['북','북북동','북동','동북동','동','동남동','남동','남남동','남','남남서','남서','서남서','서','서북서','북서','북북서'];
  return dirs[Math.round(deg / 22.5) % 16];
}
