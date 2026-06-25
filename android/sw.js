/**
 * AgriSwarm Service Worker (Offline Cache Manager)
 * 
 * Кеширует ресурсы приложения на телефоне для мгновенного запуска
 * в полевых условиях без подключения к интернету.
 */

const CACHE_NAME = "agriswarm-v1";
const ASSETS = [
  "index.html",
  "style.css",
  "app.js",
  "manifest.json"
];

// Установка сервис-воркера и кеширование статики
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Кеширование ресурсов статики...");
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Активация и очистка старых кешей
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Удаление старого кеша:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Обработка запросов к сети с откатом на кеш (Cache-First для статики)
self.addEventListener("fetch", (event) => {
  // Пропускаем сетевые API запросы к ESP32, их кешировать нельзя
  if (event.request.url.includes("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then((networkResponse) => {
        // Добавляем новые ресурсы динамически в кеш (например, шрифты Google)
        if (event.request.url.startsWith("http")) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      }).catch(() => {
        // Оффлайн fallback, если сеть недоступна и ресурса нет в кеше
        if (event.request.headers.get("accept").includes("text/html")) {
          return caches.match("index.html");
        }
      });
    })
  );
});
