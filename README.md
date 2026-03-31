# 서울 S-Dot 시각화 

서울시 S-DoT 스마트 센서 데이터(2025년 8월)를 활용해 기온·소음·자외선·대기오염·생활인구를 지도 위에 시각화하는 정적 웹 애플리케이션입니다.

## 주요 기능

| 레이어 | 설명 | 색상표 |
|--------|------|--------|
| 센서-온도 | S-DoT 센서 포인트 (기온) | YlOrRd |
| 온도 분포 | IDW 공간 보간 폴리곤 | gist_heat |
| 센서-소음 | S-DoT 센서 포인트 (소음 dB) | Reds |
| 소음 분포 | IDW 공간 보간 폴리곤 | Blues |
| 센서-UV | S-DoT 센서 포인트 (자외선) | Purples |
| UV 분포 | IDW 공간 보간 폴리곤 | Purples |
| 센서-NO₂ | S-DoT 센서 포인트 (이산화질소) | Reds |
| NO₂ 분포 | IDW 공간 보간 폴리곤 | Blues |
| 생활인구 | KT 빅데이터 250m 격자 (Natural Breaks) | YlGnBu |

- 배경지도 4종 전환: 일반 / 영상 / 야간 / 화이트 (브이월드)
- 지명 레이어 토글
- 레이어별 투명도 슬라이더
- 센서·격자 클릭 시 상세 수치 및 지역특성 표시
- 각 레이어 ℹ 버튼으로 데이터 출처·품질 확인

## 데이터 출처

| 데이터 | 출처 | 기간 |
|--------|------|------|
| S-DoT 센서 (기온·소음·UV·NO₂) | [서울 열린데이터광장](https://data.seoul.go.kr/dataList/OA-15969/S/1/datasetView.do) | 2025.07.28 ~ 08.31 (5주, 주중+주말), 주간 평균 (06:00 ~ 17:59) |
| 생활인구 250m 격자 | [서울시 생활인구 (KT 빅데이터)](https://data.seoul.go.kr) | 2025.08.01~08.05 (토·일 포함 5일), 시간당 평균 (07:00 ~ 19:59) |

> **데이터 주의사항**
> - NO₂·풍향·풍속은 OC3CL 타입 센서에서만 계측 (전체의 약 6%)
> - UV 분포는 p5 ~ p95 구간(0.05~1.28 UV) 기준으로 등급화
> - 생활인구는 공간 이상치 1건 제거 후 Natural Breaks 5단계 분류

## 기술 스택

- **지도**: [Leaflet.js](https://leafletjs.com/) 1.9.4
- **색상**: [chroma.js](https://gka.github.io/chroma.js/) 2.4.2
- **배경지도**: 브이월드 
- 별도 서버·빌드 도구 없음 — 순수 HTML/CSS/JS

## 로컬 실행

```bash
# 이 폴더에서 로컬 서버 실행 (브라우저의 CORS 정책 때문에 필요)
python -m http.server 8080
# 또는
npx serve .
```

브라우저에서 `http://localhost:8080` 접속

> `index.html`을 파일로 직접 열면 GeoJSON 로드가 CORS 오류로 실패합니다.

## GitHub Pages 배포

1. 이 폴더(`share/`) 내용을 GitHub 저장소 루트(또는 `docs/` 브랜치)에 push
2. Settings → Pages → Source 설정
3. 외부 CDN(unpkg.com)과 브이월드 타일 서버에 접근 가능한 환경이면 별도 설정 없이 동작

## 파일 구조

```
.
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── layers.js        # 레이어 생성 함수 (색상·범례 포함)
│   ├── main.js          # 지도 초기화, 레이어 토글
│   └── info-panel.js    # 클릭 시 상세 정보 패널
└── data/
    ├── sdot_august_avg.geojson    # S-DoT 센서 위치 + 8월 평균값
    ├── heat_island.geojson        # 온도 보간 폴리곤
    ├── noise.geojson              # 소음 보간 폴리곤
    ├── uv.geojson                 # UV 보간 폴리곤
    ├── air_pollution.geojson      # NO₂ 보간 폴리곤
    └── population_grid.geojson    # 생활인구 250m 격자
```
