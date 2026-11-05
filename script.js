// 미세먼지 정보를 대신 받아 주는 내 서버 주소이다
const API_URL = "/api/dust";
// 측정값이 없을 때 보여줄 문구이다
const NO_DATA_TEXT = "측정 안 됨";
// 등급 숫자별 이름표이다
const GRADE_NAMES = { 1: "좋음", 2: "보통", 3: "나쁨", 4: "매우나쁨" };
// 등급 숫자별 이모지이다
const GRADE_EMOJIS = { 1: "🔵", 2: "🟢", 3: "🟠", 4: "🔴" };
// 등급 숫자별 한 줄 안내 문구이다
const GRADE_ADVICE = {
  // 좋음일 때 문구
  1: "바깥 활동하기 좋은 날이에요",
  // 보통일 때 문구
  2: "평소처럼 활동해도 괜찮아요",
  // 나쁨일 때 문구
  3: "외출 시 마스크를 챙기세요",
  // 매우나쁨일 때 문구
  4: "외출 시 마스크를 챙기세요",
};

// 등급 숫자별로 style.css의 색 이름을 연결한다
const GRADE_COLOR_VARS = { 1: "--blue", 2: "--green", 3: "--orange", 4: "--red" };
// 그래프에 보여줄 측정소 수이다
const CHART_LIMIT = 10;

// 그래프 영역을 찾는다
const chartPanel = document.getElementById("chart-panel");
// 그래프 제목 자리를 찾는다
const chartTitle = document.getElementById("chart-title");
// 그래프 안내 문구 자리를 찾는다
const chartNote = document.getElementById("chart-note");
// 그래프 틀을 찾는다
const chartBox = document.getElementById("chart-box");
// 그래프를 그릴 자리를 찾는다
const chartCanvas = document.getElementById("dust-chart");
// 지금 화면에 있는 그래프를 기억한다
let dustChart = null;
// 시도 드롭다운을 찾는다
const sidoSelect = document.getElementById("sido-select");
// 대표 상태 영역을 찾는다
const hero = document.getElementById("hero");
// 대표 상태 제목 자리를 찾는다
const averageLabel = document.getElementById("average-label");
// 등급 이모지 자리를 찾는다
const statusEmoji = document.getElementById("status-emoji");
// 등급 이름 자리를 찾는다
const statusName = document.getElementById("status-name");
// 한 줄 안내 문구 자리를 찾는다
const adviceText = document.getElementById("advice");
// 평균 숫자 자리를 찾는다
const averageValue = document.getElementById("average-value");
// 평균 안내 자리를 찾는다
const averageNote = document.getElementById("average-note");
// 안내 문구 자리를 찾는다
const statusText = document.getElementById("status");
// 카드 목록 자리를 찾는다
const cardList = document.getElementById("card-list");
// 가장 마지막 요청 번호를 기억한다
let latestRequest = 0;

// 측정값을 숫자로 바꾸고, 쓸 수 없는 값이면 null을 돌려준다
function toNumber(value) {
  // "-"나 빈 값은 숫자로 계산하지 않는다
  if (value === null || value === undefined || value === "" || value === "-") return null;
  // 글자로 온 값을 숫자로 바꾼다
  const number = Number(value);
  // 숫자가 아니면 null, 숫자면 그 값을 돌려준다
  return Number.isNaN(number) ? null : number;
}

// 측정값을 화면에 보여줄 글자로 바꾼다
function formatValue(value) {
  // 숫자로 바꿔 본다
  const number = toNumber(value);
  // 값이 없으면 안내 문구, 있으면 단위를 붙여 돌려준다
  return number === null ? NO_DATA_TEXT : `${number} ㎍/㎥`;
}

// "2026-10-28 16:00"을 "2026년 10월 28일 16시 기준"으로 바꾼다
function formatTime(dataTime) {
  // 년, 월, 일, 시를 나눠서 찾는다
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):/.exec(dataTime ?? "");
  // 형식이 맞지 않으면 안내 문구를 돌려준다
  if (!match) return NO_DATA_TEXT;
  // 찾은 값을 꺼낸다
  const [, year, month, day, hour] = match;
  // 앞의 0을 없애서 한국어 문장으로 만든다
  return `${year}년 ${Number(month)}월 ${Number(day)}일 ${Number(hour)}시 기준`;
}

// 평균 수치로 대표 등급을 정한다
function getAverageGrade(average) {
  // 30 이하는 좋음이다
  if (average <= 30) return 1;
  // 80 이하는 보통이다
  if (average <= 80) return 2;
  // 150 이하는 나쁨이다
  if (average <= 150) return 3;
  // 그보다 크면 매우나쁨이다
  return 4;
}

// 대표 상태 영역의 내용을 한 번에 바꾼다
function setHero({ sido, grade = null, name, average = null, advice = "", note = "" }) {
  // 등급에 맞는 색을 입힌다
  hero.className = `summary ${grade ? `grade-${grade}` : "grade-none"}`;
  // 어느 지역의 상태인지 적는다
  averageLabel.textContent = `${sido} 공기 상태`;
  // 등급 이모지를 적는다
  statusEmoji.textContent = grade ? GRADE_EMOJIS[grade] : "";
  // 등급 이름을 적는다
  statusName.textContent = name;
  // 평균 숫자를 적거나 비운다
  averageValue.textContent = average ?? "";
  // 평균이 있을 때만 단위를 붙인다
  if (average !== null) {
    // 단위 글자를 만든다
    const unit = document.createElement("span");
    // 단위 디자인을 입힌다
    unit.className = "summary-unit";
    // 단위를 적는다
    unit.textContent = "㎍/㎥";
    // 숫자 옆에 붙인다
    averageValue.append(unit);
  }
  // 안내 문구를 적는다
  adviceText.textContent = advice;
  // 측정소 수 안내를 적는다
  averageNote.textContent = note;
}

// 내 서버에서 시도의 측정소 목록을 받아 온다
async function fetchStations(sido) {
  // 서버 응답을 담을 변수이다
  let response;
  // 서버에 요청을 보내 본다
  try {
    // 시도 이름을 넣어 요청하고 응답을 기다린다
    response = await fetch(`${API_URL}?sido=${encodeURIComponent(sido)}`);
  } catch {
    // 인터넷이 끊겼을 때 한국어로 안내한다
    throw new Error("인터넷 연결을 확인해 주세요.");
  }
  // 응답을 글자로 먼저 받는다 (서버 오류 화면은 JSON이 아닐 수 있다)
  const text = await response.text();
  // 응답을 담을 변수이다
  let data;
  // JSON으로 해석해 본다
  try {
    // 글자를 객체로 바꾼다
    data = JSON.parse(text);
  } catch {
    // 해석이 안 되면 서버 문제로 안내한다
    throw new Error(`서버 응답을 읽을 수 없습니다. (${response.status})`);
  }
  // 서버가 실패를 알리면 서버가 보낸 한국어 문구를 보여준다
  if (!response.ok) throw new Error(data.message ?? `서버 응답 오류 (${response.status})`);
  // 측정소 목록과 전체 개수를 돌려준다
  return { items: data.items ?? [], totalCount: data.totalCount ?? 0 };
}

// 평균 미세먼지를 계산한다
function getAverage(items) {
  // 숫자로 쓸 수 있는 값만 골라낸다
  const values = items.map((item) => toNumber(item.pm10Value)).filter((value) => value !== null);
  // 쓸 수 있는 값이 없으면 평균도 없다
  if (values.length === 0) return { average: null, count: 0 };
  // 모든 값을 더한다
  const sum = values.reduce((total, value) => total + value, 0);
  // 평균을 반올림해 개수와 함께 돌려준다
  return { average: Math.round(sum / values.length), count: values.length };
}

// 대표 상태 영역을 화면에 그린다
function renderSummary(sido, items, totalCount) {
  // 평균과 계산에 쓴 측정소 수를 구한다
  const { average, count } = getAverage(items);
  // 평균이 없으면 회색 상태로 보여준다
  if (average === null) {
    // 측정값이 없다고 알려준다
    setHero({ sido, name: NO_DATA_TEXT });
  } else {
    // 평균 수치로 대표 등급을 정한다
    const grade = getAverageGrade(average);
    // 등급, 평균, 안내 문구를 보여준다
    setHero({ sido, grade, name: GRADE_NAMES[grade], average, advice: GRADE_ADVICE[grade], note: `측정소 ${count}곳 평균` });
  }
  // 일부만 받아 왔으면 그 사실을 함께 알려준다
  statusText.textContent = totalCount > items.length ? `전체 ${totalCount}곳 중 ${items.length}곳만 표시합니다.` : "";
}

// 측정소의 등급 값이 1~4이면 돌려주고, 아니면 null을 돌려준다
function getGrade(item) {
  // 알고 있는 등급인지 확인한다
  return GRADE_NAMES[item.pm10Grade] ? item.pm10Grade : null;
}

// 측정소 이름을 만든다
function getStationName(item, sido) {
  // 전국에서는 같은 이름을 구분하도록 시도를 앞에 붙인다
  return sido === "전국" ? `${item.sidoName} ${item.stationName}` : item.stationName;
}

// style.css에 적힌 색 값을 읽는다
function getCssColor(name) {
  // 문서 전체에 정의된 색을 꺼낸다
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// 막대 끝에 수치와 등급 이름을 글자로 적는 기능이다
const barLabelPlugin = {
  // 기능 이름이다
  id: "barLabels",
  // 막대를 다 그린 뒤에 실행한다
  afterDatasetsDraw(chart) {
    // 그리기 도구를 꺼낸다
    const { ctx } = chart;
    // 막대 정보와 글자 목록을 꺼낸다
    const dataset = chart.data.datasets[0];
    // 현재 그리기 설정을 저장한다
    ctx.save();
    // 글자 모양을 정한다
    ctx.font = `600 12px ${Chart.defaults.font.family}`;
    // 글자색을 기본 글자색으로 정한다
    ctx.fillStyle = getCssColor("--text");
    // 글자를 막대 높이의 가운데에 맞춘다
    ctx.textBaseline = "middle";
    // 막대마다 끝에서 조금 띄워 글자를 적는다
    chart.getDatasetMeta(0).data.forEach((bar, index) => ctx.fillText(dataset.barLabels[index], bar.x + 6, bar.y));
    // 그리기 설정을 되돌린다
    ctx.restore();
  },
};

// 측정소별 미세먼지 막대그래프를 그린다
function renderChart(sido, items, totalCount) {
  // 측정값이 있는 측정소만 높은 순으로 골라 상위 10곳을 남긴다
  const ranked = items
    // 측정값을 숫자로 바꿔 함께 담는다
    .map((item) => ({ item, value: toNumber(item.pm10Value), grade: getGrade(item) }))
    // 측정 안 됨인 측정소를 뺀다
    .filter(({ value }) => value !== null)
    // 수치가 높은 순으로 정렬한다
    .sort((a, b) => b.value - a.value)
    // 상위 10곳만 남긴다
    .slice(0, CHART_LIMIT);

  // 이전 그래프를 지운다
  dustChart?.destroy();
  // 지웠다는 것을 기억한다
  dustChart = null;
  // 그릴 측정소가 없으면 그래프 영역을 숨기고 끝낸다
  if (ranked.length === 0) {
    // 그래프 영역을 숨긴다
    chartPanel.hidden = true;
    // 함수를 끝낸다
    return;
  }

  // 그래프 영역을 보여준다
  chartPanel.hidden = false;
  // 몇 곳을 보여주는지 제목에 적는다
  chartTitle.textContent = `${sido} 미세먼지 높은 측정소 상위 ${ranked.length}곳`;
  // 일부만 받아 왔으면 그 안에서의 순위라고 알려준다
  chartNote.textContent = totalCount > items.length ? `전체 ${totalCount}곳 중 받아 온 ${items.length}곳 안에서의 순위입니다.` : "";

  // Chart.js를 불러오지 못했으면 카드만 쓸 수 있게 안내하고 끝낸다
  if (typeof Chart === "undefined") {
    // 그래프 틀을 숨긴다
    chartBox.hidden = true;
    // 안내 문구를 적는다
    chartNote.textContent = "그래프를 불러오지 못했습니다. 아래 카드에서 수치를 확인해 주세요.";
    // 함수를 끝낸다
    return;
  }

  // 막대 수에 맞춰 그래프 높이를 정한다
  chartBox.style.height = `${ranked.length * 34 + 48}px`;
  // 화면 낭독기가 읽을 설명을 적는다
  chartCanvas.setAttribute("aria-label", ranked.map(({ item, value }, index) => `${index + 1}위 ${getStationName(item, sido)} ${value}`).join(", "));
  // 앱 글꼴을 그래프에도 쓴다
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;

  // 새 그래프를 그린다
  dustChart = new Chart(chartCanvas, {
    // 막대그래프로 그린다
    type: "bar",
    // 막대 끝 글자 기능을 켠다
    plugins: [barLabelPlugin],
    // 그래프에 넣을 자료이다
    data: {
      // 측정소 이름을 항목으로 쓴다
      labels: ranked.map(({ item }) => getStationName(item, sido)),
      // 막대 묶음은 하나이다
      datasets: [{
        // 묶음 이름이다
        label: "미세먼지",
        // 막대 길이로 쓸 수치이다
        data: ranked.map(({ value }) => value),
        // 등급 색과 똑같이 칠한다 (등급이 없으면 회색)
        backgroundColor: ranked.map(({ grade }) => getCssColor(GRADE_COLOR_VARS[grade] ?? "--gray")),
        // 막대 끝만 둥글게 만든다
        borderRadius: 4,
        // 막대가 너무 두꺼워지지 않게 한다
        maxBarThickness: 20,
        // 막대 끝에 적을 글자이다
        barLabels: ranked.map(({ value, grade }) => `${value} ${grade ? GRADE_NAMES[grade] : "등급 없음"}`),
      }],
    },
    // 그래프 설정이다
    options: {
      // 막대를 가로로 눕힌다
      indexAxis: "y",
      // 틀 크기에 맞춘다
      responsive: true,
      // 정해 둔 높이를 그대로 쓴다
      maintainAspectRatio: false,
      // 움직임 없이 바로 보여준다
      animation: false,
      // 막대 끝 글자가 잘리지 않게 오른쪽을 비운다
      layout: { padding: { right: 72 } },
      // 축 설정이다
      scales: {
        // 가로축은 수치이다
        x: {
          // 0부터 시작한다
          beginAtZero: true,
          // 격자선을 연하게 한다
          grid: { color: "#e7e9ed" },
          // 축 이름에 단위를 적는다
          title: { display: true, text: "미세먼지 (㎍/㎥)", color: getCssColor("--muted") },
          // 눈금 글자색을 정한다
          ticks: { color: getCssColor("--muted") },
        },
        // 세로축은 측정소 이름이다
        y: {
          // 세로 격자선은 없앤다
          grid: { display: false },
          // 측정소 이름 글자 설정이다
          ticks: {
            // 모든 측정소 이름을 빠짐없이 보여준다
            autoSkip: false,
            // 이름 글자색을 정한다
            color: getCssColor("--text"),
            // 좁은 화면에서 긴 이름은 줄여서 잘리지 않게 한다 (전체 이름은 말풍선에 나온다)
            callback(value) {
              // 측정소 이름을 꺼낸다
              const label = this.getLabelForValue(value);
              // 좁은 화면의 긴 이름만 뒤를 줄인다
              return this.chart.width < 400 && label.length > 7 ? `${label.slice(0, 6)}…` : label;
            },
          },
        },
      },
      // 추가 기능 설정이다
      plugins: {
        // 색 설명은 HTML로 따로 보여주므로 끈다
        legend: { display: false },
        // 막대를 누르거나 올렸을 때 보여줄 내용이다
        tooltip: {
          // 말풍선 글자를 정한다
          callbacks: {
            // 수치와 등급을 함께 보여준다
            label: (context) => {
              // 등급 이름을 포함한 글자를 꺼낸다
              const text = context.dataset.barLabels[context.dataIndex];
              // 수치 뒤에 단위를 넣는다
              return text.replace(" ", " ㎍/㎥ · ");
            },
          },
        },
      },
    },
  });
}

// 측정소 하나의 카드를 만든다
function createCard(item, sido) {
  // 등급 값이 1~4인지 확인한다
  const grade = getGrade(item);
  // 카드 틀을 만든다
  const card = document.createElement("article");
  // 등급에 맞는 색을 입힌다 (없으면 회색)
  card.className = `card ${grade ? `grade-${grade}` : "grade-none"}`;

  // 이름과 등급을 담을 윗줄을 만든다
  const head = document.createElement("div");
  // 윗줄 디자인을 입힌다
  head.className = "card-head";
  // 측정소 이름 자리를 만든다
  const name = document.createElement("h2");
  // 이름 디자인을 입힌다
  name.className = "card-name";
  // 측정소 이름을 적는다
  name.textContent = getStationName(item, sido);
  // 등급 이름표를 만든다
  const badge = document.createElement("span");
  // 이름표 디자인을 입힌다
  badge.className = "card-badge";
  // 등급 이름을 적는다
  badge.textContent = grade ? GRADE_NAMES[grade] : "등급 없음";
  // 이름과 이름표를 윗줄에 넣는다
  head.append(name, badge);

  // 측정값 목록을 만든다
  const values = document.createElement("dl");
  // 목록 디자인을 입힌다
  values.className = "card-values";
  // 미세먼지와 초미세먼지 두 줄을 차례로 만든다
  [["미세먼지", item.pm10Value], ["초미세먼지", item.pm25Value]].forEach(([label, value]) => {
    // 한 줄을 만든다
    const row = document.createElement("div");
    // 줄 디자인을 입힌다
    row.className = "card-row";
    // 항목 이름 자리를 만든다
    const term = document.createElement("dt");
    // 항목 이름을 적는다
    term.textContent = label;
    // 측정값 자리를 만든다
    const detail = document.createElement("dd");
    // 측정값을 적는다
    detail.textContent = formatValue(value);
    // 이름과 값을 줄에 넣는다
    row.append(term, detail);
    // 줄을 목록에 넣는다
    values.append(row);
  });

  // 측정 시각 자리를 만든다
  const time = document.createElement("p");
  // 시각 디자인을 입힌다
  time.className = "card-time";
  // 측정 시각을 한국어 문장으로 적는다
  time.textContent = formatTime(item.dataTime);

  // 모든 조각을 카드에 넣는다
  card.append(head, values, time);
  // 완성한 카드를 돌려준다
  return card;
}

// 고른 시도의 정보를 불러와 화면을 새로 그린다
async function loadSido(sido) {
  // 이번 요청 번호를 정한다
  const requestId = ++latestRequest;
  // 이전 지역의 값이 남지 않게 불러오는 중으로 바꾼다
  setHero({ sido, name: "불러오는 중..." });
  // 이전 안내 문구를 지운다
  statusText.textContent = "";
  // 이전 지역의 그래프를 숨긴다
  chartPanel.hidden = true;
  // 이전 카드를 지운다
  cardList.replaceChildren();
  // 실패할 수 있는 작업을 시도한다
  try {
    // 측정소 목록을 받아 온다
    const { items, totalCount } = await fetchStations(sido);
    // 그사이 다른 지역을 골랐다면 이 결과는 버린다
    if (requestId !== latestRequest) return;
    // 평균 영역을 그린다
    renderSummary(sido, items, totalCount);
    // 막대그래프를 그린다
    renderChart(sido, items, totalCount);
    // 측정소가 없으면 안내한다
    if (items.length === 0) statusText.textContent = "측정소 정보가 없습니다.";
    // 측정소 카드를 모두 화면에 넣는다
    cardList.append(...items.map((item) => createCard(item, sido)));
  } catch (error) {
    // 그사이 다른 지역을 골랐다면 이 오류는 무시한다
    if (requestId !== latestRequest) return;
    // 대표 상태를 회색으로 되돌린다
    setHero({ sido, name: "알 수 없음" });
    // 오류 내용을 알려준다
    statusText.textContent = `불러오지 못했습니다. ${error.message}`;
  }
}

// 드롭다운을 바꾸면 그 지역을 불러온다
sidoSelect.addEventListener("change", () => loadSido(sidoSelect.value));
// 처음 열었을 때 선택된 지역을 불러온다
loadSido(sidoSelect.value);

// 브라우저가 서비스 워커를 지원하면 등록한다
if ("serviceWorker" in navigator) {
  // sw.js를 등록하고, 실패해도 앱은 그대로 쓸 수 있게 기록만 남긴다
  navigator.serviceWorker.register("sw.js").catch((error) => console.warn("서비스 워커 등록 실패:", error));
}
