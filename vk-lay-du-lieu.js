// Vạn Kiếp Tu Tiên - Lấy dữ liệu game (chỉ đọc, không sửa game, không gửi đi đâu)
// Gom: content (từ game), các file /data/*.json, danh sách file JS/JSON của game, phiên bản. Xuất ra 1 file vk-data.json.
(async () => { try {
  alert('Tool lấy dữ liệu đã chạy. Bấm OK rồi chờ vài giây, hộp thông báo sẽ hiện ở đầu màn hình.');
  const old = document.getElementById('vk-dl'); if (old) old.remove();
  const box = document.createElement('div'); box.id = 'vk-dl';
  box.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:2147483647;background:#1b1d22;color:#eee;font:14px/1.5 system-ui,sans-serif;padding:10px 12px;border-radius:10px;border:1px solid #556;max-height:45vh;overflow:auto';
  (document.body || document.documentElement).appendChild(box);
  const log = (t) => { box.innerHTML += '<div>' + t + '</div>'; box.scrollTop = 1e9; };
  box.innerHTML = '<b>Lấy dữ liệu game</b>';
  const out = { _meta: { url: location.href, time: new Date().toISOString(), ua: navigator.userAgent }, files: {}, errors: [] };
  // chuyển Map/Set/hàm thành JSON thường
  const seen = new WeakSet();
  const plain = (v, d = 0) => {
    if (v === null || typeof v !== 'object') return typeof v === 'function' || typeof v === 'symbol' ? undefined : v;
    if (seen.has(v)) return undefined; if (d > 40) return undefined; seen.add(v);
    let r;
    if (v instanceof Map) { r = {}; v.forEach((x, k) => { r[String(k)] = plain(x, d + 1); }); }
    else if (v instanceof Set) r = [...v].map((x) => plain(x, d + 1));
    else if (Array.isArray(v)) r = v.map((x) => plain(x, d + 1));
    else { r = {}; for (const k of Object.keys(v)) { const x = plain(v[k], d + 1); if (x !== undefined) r[k] = x; } }
    seen.delete(v); return r;
  };
  try {
    const g = window.game;
    if (g && g.env && g.env.content) { out.content = plain(g.env.content); log('✔ content từ game: ' + Object.keys(out.content).length + ' mục'); }
    else log('✖ không thấy window.game.env.content (vẫn lấy file bên dưới)');
  } catch (e) { out.errors.push('content: ' + e.message); log('✖ content: ' + e.message); }
  // danh sách tài nguyên mà trang đã tải
  const urls = new Set();
  performance.getEntriesByType('resource').forEach((r) => { if (/\.(js|json)(\?|$)/.test(r.name) && r.name.startsWith(location.origin)) urls.add(r.name.split('?')[0]); });
  [...document.scripts].forEach((s) => { if (s.src && s.src.startsWith(location.origin)) urls.add(s.src.split('?')[0]); });
  // quét file js chính để tìm đường dẫn /data/xxx.json
  const scan = [...urls].filter((u) => /\.js$/.test(u));
  for (const u of scan) {
    try {
      const t = await (await fetch(u)).text();
      for (const m of t.matchAll(/["'`](\/?(?:[\w.-]+\/)*data\/[\w./-]+\.json)["'`]/g)) urls.add(new URL(m[1], location.origin + '/').href);
      for (const m of t.matchAll(/["'`]((?:\/|\.\/)?(?:[\w.-]+\/)*content-[\w-]+\.json)["'`]/g)) urls.add(new URL(m[1], location.origin + '/').href);
    } catch (e) { out.errors.push('scan ' + u + ': ' + e.message); }
  }
  log('Tìm thấy ' + urls.size + ' file, đang tải...');
  let ok = 0;
  for (const u of urls) {
    const name = u.replace(location.origin, '');
    try {
      const r = await fetch(u); if (!r.ok) { out.errors.push(name + ' → ' + r.status); continue; }
      const txt = await r.text();
      if (/\.json$/.test(u)) { try { out.files[name] = JSON.parse(txt); ok++; } catch { out.files[name] = txt; ok++; } }
      else out.files[name] = /\/index-[\w-]+\.js$/.test(u) ? { _js: true, bytes: txt.length, text: txt } : { _js: true, bytes: txt.length, head: txt.slice(0, 200) }; // js: chỉ ghi tên và kích thước (hash tên file cho biết bản mới)
    } catch (e) { out.errors.push(name + ': ' + e.message); }
  }
  log('✔ tải được ' + ok + ' file JSON' + (out.errors.length ? ' · lỗi ' + out.errors.length : ''));
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'vk-data-' + new Date().toISOString().slice(0, 10) + '.json';
  a.textContent = '⬇ Tải vk-data.json (' + (blob.size / 1048576).toFixed(1) + ' MB)';
  a.style.cssText = 'display:inline-block;margin-top:6px;padding:8px 12px;background:#2e7d32;color:#fff;border-radius:8px;text-decoration:none';
  box.appendChild(a); const x = document.createElement('span'); x.textContent = '  ✕ đóng'; x.style.cssText = 'cursor:pointer;margin-left:12px'; x.onclick = () => box.remove(); box.appendChild(x);
  a.click();
} catch (e) { alert('Lỗi tool: ' + (e && e.message || e)); } })();
