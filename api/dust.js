// 시도별 실시간 측정정보를 요청할 공공데이터포털 주소이다
const API_URL = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty";

// Vercel이 /api/dust 요청을 받으면 실행하는 함수이다
module.exports = async function handler(req, res) {
  // 주소의 sido 값을 읽고, 없으면 서울을 쓴다
  const sido = [req.query?.sido].flat()[0] || "서울";
  // 인증키는 환경변수에서만 읽는다
  const key = process.env.AIRKOREA_KEY;

  // 환경변수가 없으면 원인을 알려주고 멈춘다
  if (!key) return res.status(500).json({ message: "서버에 인증키가 설정되어 있지 않습니다." });

  // Decoding 키를 주소에 넣을 수 있게 변환해서 요청 주소를 만든다
  const url = `${API_URL}?serviceKey=${encodeURIComponent(key)}&returnType=json&numOfRows=100&pageNo=1&ver=1.3&sidoName=${encodeURIComponent(sido)}`;

  // 응답 글자를 담을 변수이다
  let text;
  // 공공데이터포털에 요청을 보내 본다
  try {
    // 요청을 보내고 응답을 기다린다
    const response = await fetch(url);
    // 응답을 글자로 받는다 (XML 오류일 수 있어서 바로 JSON으로 읽지 않는다)
    text = await response.text();
  } catch {
    // 연결에 실패하면 한국어로 알려준다
    return res.status(502).json({ message: "공공데이터포털에 연결하지 못했습니다." });
  }

  // 해석한 응답을 담을 변수이다
  let data;
  // JSON으로 해석해 본다
  try {
    // 글자를 객체로 바꾼다
    data = JSON.parse(text);
  } catch {
    // XML 오류처럼 JSON이 아니면 안내 문구를 돌려준다
    return res.status(502).json({ message: "인증키 또는 요청값을 확인해주세요" });
  }

  // 결과 코드를 꺼낸다
  const resultCode = data?.response?.header?.resultCode;
  // 응답 본문을 꺼낸다
  const body = data?.response?.body;

  // 틀린 인증키처럼 결과 코드 없이 오면 안내 문구를 돌려준다
  if (!resultCode) return res.status(502).json({ message: "인증키 또는 요청값을 확인해주세요" });

  // 성공 코드가 아니면 코드와 함께 한국어로 알려준다
  if (resultCode !== "00" || !body) {
    // 어떤 코드인지 함께 보여준다
    return res.status(502).json({ message: `공공데이터 요청에 실패했습니다. (결과 코드: ${resultCode})` });
  }

  // 화면에 필요한 측정소 목록과 전체 개수만 돌려준다
  return res.status(200).json({ items: body.items ?? [], totalCount: body.totalCount ?? 0 });
};
