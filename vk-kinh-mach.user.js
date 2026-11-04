// ==UserScript==
// @name         Trợ lý Kinh mạch - Vạn Kiếp Tu Tiên (tự chạy)
// @namespace    broxyxd
// @version      1.0
// @updateURL    https://broxyxd.github.io/BroXYxD-kinhmach/vk-kinh-mach.user.js
// @downloadURL  https://broxyxd.github.io/BroXYxD-kinhmach/vk-kinh-mach.user.js
// @description  Tự nạp Trợ lý Kinh mạch khi mở game, không cần bấm dấu trang.
// @match        https://van-kiep-tu-tien.vuhaiquan2k1.workers.dev/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(() => {
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (window.game && window.game.env && window.game.env.content) {
      clearInterval(t);
      import('https://broxyxd.github.io/BroXYxD-kinhmach/vk-kinh-mach.js?v=' + Date.now())
        .catch((e) => console.warn('Không tải được Trợ lý Kinh mạch: ' + e.message));
    } else if (tries > 120) clearInterval(t); // chờ game tối đa khoảng 1 phút
  }, 500);
})();
