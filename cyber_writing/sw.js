const CACHE_NAME = 'prompt-library-v1';

// 獲取當前基礎路徑
const getBasePath = () => {
  const path = self.location.pathname;
  return path.substring(0, path.lastIndexOf('/') + 1);
};

const basePath = getBasePath();

const urlsToCache = [
  basePath,
  basePath + 'index.html',
  basePath + 'manifest.json',
  basePath + 'icons/icon-192x192.png',
  basePath + 'icons/icon-512x512.png'
];

// 安裝事件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 取得事件
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果快取中有資源，直接返回
        if (response) {
          return response;
        }
        
        // 否則從網路取得
        return fetch(event.request).then((response) => {
          // 檢查是否為有效回應
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // 複製回應以供快取
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
    );
});

// 更新事件
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});