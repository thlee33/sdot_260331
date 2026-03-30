/**
 * ml-overlay.js — ML 오염 확산 예측 레이어 보조 기능
 * 실제 ML 결과(wind_pollution_ml.geojson)가 없을 때
 * S-DOT 풍향/풍속 + PM2.5 데이터로 클라이언트 사이드 근사 확산 폴리곤 생성
 */

/**
 * S-DOT 포인트 데이터에서 바람 방향 기반 오염 확산 폴리곤을 근사 생성
 * @param {Object} sdotGeojson - sdot_august_avg.geojson
 * @returns {Object} GeoJSON FeatureCollection
 */
function generateWindPollutionOverlay(sdotGeojson) {
  const features = [];

  sdotGeojson.features.forEach(f => {
    const props = f.properties;
    const pm25 = props.avg_pm25;
    const windDir = props.avg_wind_dir;
    const windSpd = props.avg_wind_speed;

    if (pm25 === undefined || windDir === undefined || pm25 < 15) return;

    const [lng, lat] = f.geometry.coordinates;

    // 풍속에 따른 확산 거리 (m → 위경도 근사)
    const spreadKm = Math.min(3, 0.3 + windSpd * 0.25);
    const spreadLat = spreadKm / 111;
    const spreadLng = spreadKm / (111 * Math.cos(lat * Math.PI / 180));

    // 풍향의 하류(바람이 불어가는 방향)
    const downstreamRad = (windDir + 180) % 360 * Math.PI / 180;

    // 타원형 확산 폴리곤 생성
    const ellipseCoords = generateEllipse(
      lat, lng,
      spreadLat * 0.6,   // 단축 (횡방향)
      spreadLat,         // 장축 (하류방향)
      windDir,
      24
    );

    // PM2.5 농도에 따른 위험등급
    const risk = pm25 > 50 ? 'high' : pm25 > 25 ? 'medium' : 'low';

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [ellipseCoords]
      },
      properties: {
        predicted_pm25: pm25 * (1 + windSpd * 0.05), // 풍속 영향 가중
        risk_level: risk,
        source_dir: windDirName180(windDir),
        wind_speed: windSpd,
        source_location: props.equip_nm || props.location_name || '센서',
        method: 'client_approximate'
      }
    });
  });

  return { type: 'FeatureCollection', features };
}

// 타원 좌표 생성
function generateEllipse(centerLat, centerLng, semiMinor, semiMajor, rotationDeg, numPoints) {
  const coords = [];
  const rotRad = rotationDeg * Math.PI / 180;

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const x = semiMinor * Math.cos(angle);
    const y = semiMajor * Math.sin(angle);

    // 회전 적용
    const xR = x * Math.cos(rotRad) - y * Math.sin(rotRad);
    const yR = x * Math.sin(rotRad) + y * Math.cos(rotRad);

    coords.push([centerLng + xR, centerLat + yR]);
  }

  return coords;
}

function windDirName180(deg) {
  const dirs = ['북','북북동','북동','동북동','동','동남동','남동','남남동',
                '남','남남서','남서','서남서','서','서북서','북서','북북서'];
  // 하류 방향 (오염이 이동하는 방향)
  const downstream = (deg + 180) % 360;
  return dirs[Math.round(downstream / 22.5) % 16];
}
