// 저장 공간 이름이다 (파일 목록을 바꾸면 숫자를 올린다)
const CACHE_NAME = "air-signal-v1";
// 인터넷이 없어도 앱 화면을 열 수 있게 저장할 파일 목록이다
const APP_FILES = [
  // 앱 시작 주소
  "./",
  // 화면 파일
  "./index.html",
  // 디자인 파일
  "./style.css",
  // 동작 파일
  "./script.js",
  // 앱 정보 파일
  "./manifest.json",
  // 작은 아이콘
  "./icons/icon-192.png",
  // 큰 아이콘
  "./icons/icon-512.png",
];

// 설치될 때 앱 파일을 저장한다
self.addEventListener("install", (event) => {
  // 저장이 끝난 뒤 바로 새 버전을 쓸 수 있게 한다
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

// 새 버전이 켜질 때 예전 저장 공간을 지운다
self.addEventListener("activate", (event) => {
  // 이름이 다른 저장 공간을 모두 지운 뒤 열린 화면을 맡는다
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

// 화면이 파일을 요청할 때마다 실행한다
self.addEventListener("fetch", (event) => {
  // 요청 주소를 분석한다
  const url = new URL(event.request.url);
  // 외부 요청과 /api/ 미세먼지 요청은 실시간 값이어야 하므로 저장하지 않는다
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  // 인터넷에서 최신 파일을 먼저 받고, 실패하면 저장된 파일을 쓴다
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 정상 응답이면 복사본을 저장해 둔다
        if (response.ok) {
          // 응답은 한 번만 읽을 수 있어서 복사한다
          const copy = response.clone();
          // 복사본을 저장 공간에 넣는다
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        // 받은 응답을 화면에 넘긴다
        return response;
      })
      // 인터넷이 안 되면 저장된 파일을 꺼낸다
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
