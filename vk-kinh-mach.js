// Trợ lý Kinh mạch — Bản chẩn đoán dữ liệu
const TOOL_VER = '2.0.3-debug';

(() => {
  if (window.__vkKM) { window.__vkKM.show(); return; }
  const S = window.__vkKM = { core: null, best: null, abort: false };

  const ANCHORS = {
    eJ:  [/\.doDung\)!=null&&/, 'mô phỏng trận'],
    Vr:  ['drugResistTran:{}', 'chỉ số nhân vật khi đánh'],
    Ga:  [/muc\?\?"thuong",\w=\w\.canh_gioi/, 'dựng quái'],
    Rt:  [/\.kinhMach,\w=new Set\(\w\.huyetThem\)/, 'tính kinh mạch'],
    Tp:  ['.khuon.split(', 'khuôn kinh mạch'],
    al:  [/\(\w\.hinh\?\?\[\],\w\.xoay\)/, 'ô của mảnh'],
    Jh:  ['Món này đã có trên kinh mạch', 'kiểm tra chỗ đặt'],
  };

  function findFn(src, anchor) {
    let idx = -1, count = 0;
    if (typeof anchor === 'string') {
      idx = src.indexOf(anchor);
      if (idx >= 0) count = src.indexOf(anchor, idx + 1) >= 0 ? 2 : 1;
    } else {
      const re = new RegExp(anchor.source, 'g'); let m;
      while ((m = re.exec(src))) { if (count === 0) idx = m.index; count++; if (count > 1) break; }
    }
    if (count !== 1) return null;
    const j = src.lastIndexOf('function ', idx);
    if (j < 0 || idx - j > 1500) return null;
    const m = /^function ([\w$]+)\(/.exec(src.slice(j, j + 80));
    return m ? m[1] : null;
  }

  async function loadCore(progress) {
    const g = window.game;
    if (!g || !g.env || !g.env.content) throw new Error('Chưa thấy game. Hãy mở trang game, đợi tải xong rồi bấm lại dấu trang.');
    const tag = document.querySelector('script[type=module][src*="/assets/index-"]');
    if (!tag) throw new Error('Không tìm thấy file code chính của game.');
    const url = tag.src, base = url.slice(0, url.lastIndexOf('/') + 1);
    progress('Đang tải code game…');
    let src = await (await fetch(url)).text();
    const names = {}, missing = [];
    for (const [k, [a, label]] of Object.entries(ANCHORS)) { const n = findFn(src, a); if (n) names[k] = n; else missing.push(label); }
    if (names.Rt && new RegExp('function ' + names.Rt.replace(/\$/g, '\\$') + '\\(t,n,e\\)').test(src)) {
      const m = new RegExp('function ([\\w$]+)\\(t,n\\)\\{(?:(?!function ).){0,900}?=' + names.Rt.replace(/\$/g, '\\$') + '\\(t,n,\\w\\)', 's').exec(src);
      if (m) names.Rt = m[1]; else missing.push('tính kinh mạch (bọc)');
    }
    if (names.Tp) {
      const m = new RegExp(`function ([\\w$]+)\\(t,n\\)\\{return ${names.Tp.replace(/\$/g, '\\$')}\\(([\\w$]+)\\(t,n\\)\\)\\}`).exec(src);
      if (m) names.xo = m[1]; else missing.push('lưới kinh mạch');
    }
    if (missing.length) throw new Error('Game vừa cập nhật nên tool chưa nhận ra: ' + missing.join(', ') + '. Hãy chụp màn hình gửi Claude để sửa tool.');
    src = src.replace(/from"\.\//g, 'from"' + base).replace(/import\("\.\//g, 'import("' + base);
    src = src.replace(/import\.meta\.url/g, JSON.stringify(url));
    let ok1 = false, ok2 = false;
    src = src.replace(/((?:[\w$]+\(\);)*)const ([\w$]+)=[\w$]+\.createRoot\(document\.getElementById\("hud"\)\)/, (_, __, v) => { ok1 = true; return `const ${v}={render(){}}`; });
    src = src.replace(/(__tuTienReady:!0\}\)\})([\w$]+)\(\)\.catch\(/, (_, a) => { ok2 = true; return a + 'Promise.resolve().catch('; });
    if (!ok1 || !ok2) throw new Error('Game vừa đổi cách khởi động nên tool chưa chạy được.');
    src = src.replace(/window\.addEventListener\("contextmenu",/, 'void("contextmenu",');
    src += `\n;export const __VKT={${Object.entries(names).map(([k, v]) => k + ':' + v).join(',')}};`;
    progress('Đang dựng bộ tính toán…');
    const blobUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const mod = await import(blobUrl);
    URL.revokeObjectURL(blobUrl);
    const K = mod.__VKT;
    K.bundle = url.split('/').pop();
    return K;
  }

  const G = () => window.game;
  const C = () => G().env.content;
  const clone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(clone);
    if (obj instanceof Set) return new Set([...obj].map(clone));
    if (obj instanceof Map) return new Map([...obj].map(([k, v]) => [k, clone(v)]));
    const copy = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) copy[key] = clone(obj[key]);
    }
    return copy;
  };
  const sleep0 = () => new Promise((r) => setTimeout(r, 0));
  const pct = (x, d = 0) => (x * 100).toFixed(d).replace('.', ',') + '%';
  const num = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toString().replace('.', ',');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HE = { kim: 'Kim', moc: 'Mộc', thuy: 'Thủy', hoa: 'Hỏa', tho: 'Thổ', bang: 'Băng', loi: 'Lôi', phong: 'Phong', vo_sac: 'Vô sắc' };
  const heTen = (h) => HE[h] ?? h;
  const nvNow = () => clone(G().state.run.nhanVat);

  const BENCH_IDS = ['enemy.de_tu_truc_co', 'enemy.doc_hanh_kiem_khach', 'enemy.ma_tu_hut_mau', 'enemy.cuong_thi', 'enemy.am_tuong', 'enemy.lao_hoe_tinh', 'enemy.hoa_tinh', 'enemy.thuy_linh', 'enemy.mao_cuong'];
  function benchEnemies(cg, tcP = 0) {
    const K = S.core, c = C();
    const tcs = [Math.max(0, tcP - 1), tcP, Math.min(3, tcP + 1)];
    let ids = BENCH_IDS.filter((id) => c.enemies.has(id));
    if (ids.length < 6) { const all = [...c.enemies.keys()].sort(); const step = Math.max(1, Math.floor(all.length / 9)); ids = all.filter((_, i) => i % step === 0).slice(0, 9); }
    return ids.map((id, i) => ({ id, E: K.Ga({ ...c.enemies.get(id), canh_gioi: cg, tieu_canh_gioi: tcs[i % 3] }, c, { muc: 'thuong' }) }));
  }
  function fight(P, E) {
    try { 
      return S.core.eJ(P, E, {}); 
    } catch (e) { 
      return { thang: false, nHiep: 30, khiHuyetThapNhat: 0, stTa: 0, _err: e.message }; 
    }
  }

  function makeEval(nv0, enemies, mode) {
    const K = S.core, c = C(), cache = new Map();
    return (manh) => {
      const key = manh.map((p) => p.item + '_' + p.x + '_' + p.y + '_' + p.xoay).sort().join('|');
      if (cache.has(key)) return cache.get(key);
      const nv = clone(nv0); nv.kinhMach.manh = manh.map((p) => ({ ...p }));
      const R = K.Rt(nv, c), P = K.Vr(nv, c);
      let fightScore = 0, wins = 0, errCount = 0, lastErr = '';
      for (const { E } of enemies) {
        const r = fight(P, E);
        if (r._err) { errCount++; lastErr = r._err; }
        const hpLeft = r.khiHuyetThapNhat / P.khiHuyetToiDa;
        const dealt = Math.min(1, (r.stTa || 0) * Math.max(1, r.nHiep) / E.khiHuyetToiDa);
        if (r.thang) { wins++; fightScore += mode === 'danh' ? 100 + 15 * hpLeft + 60 / Math.max(1, r.nHiep) : 100 + 50 * hpLeft + 25 / Math.max(1, r.nHiep); }
        else fightScore += 50 * dealt;
      }
      const thong = R.manh.filter((m) => m && m.thong).length;
      const toc = R.biDong.toc_do || 0, dp = R.biDong.dot_pha || 0;
      let s;
      if (mode === 'tu') s = 0.3 * fightScore + 400 * toc + 300 * dp + 0.5 * R.linhLuc + thong;
      else if (mode === 'danh') s = fightScore + 0.5 * R.linhLuc + 0.2 * thong;
      else s = fightScore + 30 * toc + 20 * dp + 0.2 * thong + 0.5 * R.linhLuc;
      const out = { s, wins, P, R, errCount, lastErr };
      cache.set(key, out);
      return out;
    };
  }

  function buildCandidates(nv0) {
    const K = S.core, c = C();
    const pool = Object.keys(nv0.tuiDo).filter((id) => { const it = c.items.get(id); return it && (it.loai === 'cong_phap' || it.loai === 'phap_khi') && it.hinh && (it.canh_gioi ?? 0) <= nv0.canhGioi; });
    const g = K.xo(c, nv0), cand = {};
    for (const id of pool) {
      const it = c.items.get(id), seen = new Set(); cand[id] = [];
      for (let xoay = 0; xoay < 4; xoay++) for (let y = 0; y < g.cao; y++) for (let x = 0; x < g.rong; x++) {
        const m = { item: id, x, y, xoay };
        let err; try { err = K.Jh(nv0, c, m); } catch (e) { err = 'x'; }
        if (err) continue;
        const cells = K.al(g, m, it); if (!cells) continue;
        const key = id + ':' + [...cells].sort((a, b) => a - b).join(',');
        if (seen.has(key)) continue; seen.add(key);
        cand[id].push({ m, cells, key });
      }
    }
    return { cand, g };
  }

  async function anneal({ nv0, mode, iters, init, onProg, label, enemies }) {
    const ev = makeEval(nv0, enemies, mode);
    const { cand } = buildCandidates(nv0);
    const ids = Object.keys(cand).filter((k) => cand[k].length);
    let seed = 12345; const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };
    const overlaps = (manh, c, skip = -1) => { const used = new Set(); manh.forEach((p, i) => { if (i !== skip) p.cells.forEach((x) => used.add(x)); }); return c.cells.some((x) => used.has(x)); };
    let cur = [];
    if (init) for (const m of init) { const c = (cand[m.item] || []).find((c) => c.m.x === m.x && c.m.y === m.y && c.m.xoay === m.xoay); if (c && !overlaps(cur, c)) cur.push(c); }
    let curS = ev(cur).s, best = cur, bestS = curS;
    const T0 = init && init.length ? 10 : 40;
    for (let it = 0; it < iters; it++) {
      if (S.abort) break;
      if (it % 20 === 0) { onProg && onProg(it / iters, label); await sleep0(); }
      const T = Math.max(0.4, T0 * (1 - it / iters));
      const next = cur.slice(); const r = rnd();
      const free = () => ids.filter((id) => !next.some((p) => p.m.item === id));
      if (r < 0.4 || next.length === 0) { const f = free(); if (!f.length) continue; const id = f[Math.floor(rnd() * f.length)]; const c = cand[id][Math.floor(rnd() * cand[id].length)]; if (overlaps(next, c)) continue; next.push(c); }
      else if (r < 0.6) next.splice(Math.floor(rnd() * next.length), 1);
      else if (r < 0.9) { const i = Math.floor(rnd() * next.length); const id = next[i].m.item; const c = cand[id][Math.floor(rnd() * cand[id].length)]; if (overlaps(next, c, i)) continue; next[i] = c; }
      else { const i = Math.floor(rnd() * next.length); const f = free(); if (!f.length) continue; const id = f[Math.floor(rnd() * f.length)]; const c = cand[id][Math.floor(rnd() * cand[id].length)]; if (overlaps(next, c, i)) continue; next[i] = c; }
      const e = ev(next);
      if (e.s >= curS || rnd() < Math.exp((e.s - curS) / T)) { cur = next; curS = e.s; if (e.s > bestS) { best = next; bestS = e.s; } }
    }
    const e = ev(best);
    return { manh: best.map((p) => ({ ...p.m })), score: e.s, wins: e.wins, n: enemies.length, P: e.P, R: e.R, errCount: e.errCount, lastErr: e.lastErr };
  }

  function getCurrentManh(nv) {
    const km = nv.kinhMach || {};
    const arr = km.manh || km.o || km.m || km.items || km.dat || km.list || [];
    return arr.map((m) => {
      const itemId = m.item || m.id || m.ma;
      return { ...m, item: itemId };
    });
  }

  function evalCurrent(nv, mode, enemies) {
    const ev = makeEval({ ...clone(nv), kinhMach: { ...clone(nv.kinhMach), manh: [] } }, enemies, mode);
    const manh = getCurrentManh(nv);
    const e = ev(manh);
    return { manh: clone(manh), score: e.s, wins: e.wins, n: enemies.length, P: e.P, R: e.R, errCount: e.errCount, lastErr: e.lastErr };
  }

  // Hàm lấy mẫu cấu trúc dữ liệu để debug
  function getDebugInfo(nv) {
    const km = nv.kinhMach || {};
    const keys = Object.keys(km).join(', ');
    const manh = getCurrentManh(nv);
    return `Các key trong kinhMach: <b>${keys}</b><br>
            Số món tìm thấy: <b>${manh.length}</b><br>
            Mẫu món đầu tiên: <code style="font-size:11px;word-break:break-all">${manh.length ? JSON.stringify(manh[0]) : 'Không có'}</code>`;
  }

  const BASE = { thuy: ['#3f6fb5', '#5a8fd6', '#2c5592', '#6f9fd0'], bang: ['#5fb8c9', '#86cfdc', '#3e9db0'], vo_sac: ['#7d7a76', '#9a958e', '#5f5c58'], hoa: ['#c0392b', '#d9622b', '#a8321f'], tho: ['#8a6a2e', '#a07a3a', '#6e5524'], kim: ['#c9a227', '#8f7a2a', '#e0b84a', '#a8892c', '#d4a017'], moc: ['#3f8f4a', '#5aa865', '#2f6f38'], loi: ['#7a4fb5', '#9a6fd0'], phong: ['#3fa08f', '#5cbfae'] };
  const TINT = { thuy: '#cfdcef', bang: '#d3ecf0', vo_sac: '#dcd6cc', hoa: '#efc2b4', kim: '#f1e3b0', tho: '#e3d2b0', moc: '#cfe6c8', loi: '#ddd0ef', phong: '#cdebe5' };

  function drawGrid(nv, manh, mark) {
    const K = S.core, c = C();
    const nv2 = clone(nv); nv2.kinhMach.manh = manh;
    const g = K.xo(c, nv2), km = nv2.kinhMach;
    const hy = new Set(km.huyetThem || []); g.huyet.forEach((v, i) => v && hy.add(i));
    const own = {}, cols = [], used = {}, pieces = [];
    const R = K.Rt(nv2, c);
    manh.forEach((m, n) => {
      const it = c.items.get(m.item); if(!it) return;
      const he = (it.he || ['vo_sac'])[0];
      const pal = BASE[he] || ['#888']; cols.push(pal[(used[he] = (used[he] || 0) + 1) % pal.length]);
      const cells = K.al(g, m, it) || []; cells.forEach((x) => (own[x] = n));
      const rm = R.manh[n];
      pieces.push({ it, cells, thong: rm ? rm.thong : false, heSo: rm ? rm.heSo : 0, onHuyet: cells.some((x) => hy.has(x)) });
    });
    let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
    for (let i = 0; i < g.rong * g.cao; i++) if (km.trangThai[i] !== 'an' || own[i] !== undefined) { const x = i % g.rong, y = Math.floor(i / g.rong); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(g.rong - 1, x1 + 1); y1 = Math.min(g.cao - 1, y1 + 1);
    const Sz = 84, M = 10, W = (x1 - x0 + 1) * Sz + 2 * M, H = (y1 - y0 + 1) * Sz + 2 * M;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const d = cv.getContext('2d');
    d.fillStyle = '#f3ece0'; d.fillRect(0, 0, W, H);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * g.rong + x, px = M + (x - x0) * Sz, py = M + (y - y0) * Sz, st = km.trangThai[i];
      let fill = st === 'an' ? '#f3ece0' : (TINT[km.mau[i]] || '#ddd');
      if (own[i] !== undefined) fill = cols[own[i]];
      d.fillStyle = fill; d.fillRect(px + 2, py + 2, Sz - 4, Sz - 4);
      d.strokeStyle = '#bdb2a3'; d.lineWidth = 2; d.strokeRect(px + 2, py + 2, Sz - 4, Sz - 4);
      if (st === 'tac') { d.fillStyle = '#7a1f1a'; d.font = 'bold 38px sans-serif'; d.textAlign = 'center'; d.textBaseline = 'middle'; d.fillText('×', px + Sz / 2, py + Sz / 2); }
      if (i === g.danDien && own[i] === undefined) { d.fillStyle = '#fbf7ef'; d.fillRect(px + 5, py + 5, Sz - 10, Sz - 10); d.strokeStyle = '#7a1f1a'; d.lineWidth = 4; d.strokeRect(px + 5, py + 5, Sz - 10, Sz - 10); d.fillStyle = '#7a1f1a'; d.font = 'bold 40px serif'; d.textAlign = 'center'; d.textBaseline = 'middle'; d.fillText('丹', px + Sz / 2, py + Sz / 2 + 2); }
      if (hy.has(i)) { d.beginPath(); d.arc(px + Sz - 16, py + 16, 9, 0, 7); d.fillStyle = '#d9b228'; d.fill(); d.strokeStyle = '#7a5c00'; d.lineWidth = 1.5; d.stroke(); }
      if (mark && mark.has(i)) { d.strokeStyle = '#1a7f37'; d.lineWidth = 7; d.strokeRect(px + 8, py + 8, Sz - 16, Sz - 16); d.fillStyle = '#1a7f37'; d.font = 'bold 18px sans-serif'; d.textAlign = 'left'; d.textBaseline = 'alphabetic'; d.fillText('MỞ', px + 12, py + Sz - 12); }
    }
    pieces.forEach((p, n) => {
      const cs = new Set(p.cells); d.strokeStyle = '#1e1512'; d.lineWidth = 7;
      for (const cI of cs) {
        const x = cI % g.rong, y = Math.floor(cI / g.rong), px = M + (x - x0) * Sz, py = M + (y - y0) * Sz;
        const L = (a, b, e, f) => { d.beginPath(); d.moveTo(a, b); d.lineTo(e, f); d.stroke(); };
        if (!cs.has(cI - g.rong)) L(px, py, px + Sz, py);
        if (!cs.has(cI + g.rong)) L(px, py + Sz, px + Sz, py + Sz);
        if (!cs.has(cI - 1) || x === 0) L(px, py, px, py + Sz);
        if (!cs.has(cI + 1) || x === g.rong - 1) L(px + Sz, py, px + Sz, py + Sz);
      }
      const c0 = Math.min(...p.cells); const x = c0 % g.rong, y = Math.floor(c0 / g.rong);
      const px = M + (x - x0) * Sz + Sz / 2, py = M + (y - y0) * Sz + Sz / 2;
      d.font = 'bold 36px sans-serif'; d.textAlign = 'center'; d.textBaseline = 'middle';
      d.lineWidth = 6; d.strokeStyle = '#1e1512'; d.strokeText(String(n + 1), px, py); d.fillStyle = '#fff'; d.fillText(String(n + 1), px, py);
    });
    const legend = pieces.map((p, n) => `<div class="vk-lg"><span class="vk-sw" style="background:${cols[n]}">${n + 1}</span><b>${esc(p.it.ten)}</b> <span class="vk-mu">· ${esc((p.it.he || ['vo_sac']).map(heTen).join('/'))}${p.onHuyet ? ' · trên huyệt' : ''}${p.thong ? '' : ' · <span class="vk-bad">không thông</span>'}</span></div>`).join('');
    return `<img class="vk-img" src="${cv.toDataURL('image/png')}" alt="kinh mạch"><div class="vk-note">Chấm vàng = huyệt · 丹 = đan điền · × = ô tắc. Giữ tay lên ảnh để lưu.</div>${legend}`;
  }

  const css = `
  #vk-root{position:fixed;inset:0;z-index:2147483000;background:#f3ece0;color:#1e1512;font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column}
  #vk-root *{box-sizing:border-box}
  #vk-hd{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#7a1f1a;color:#fff}
  #vk-hd b{font-size:17px;flex:1}
  #vk-hd button{background:#fff2;border:1px solid #fff6;color:#fff;border-radius:8px;padding:6px 10px;font-size:14px}
  #vk-tabs{display:flex;overflow-x:auto;background:#eadfc6;border-bottom:1px solid #cdbf9f}
  #vk-tabs button{flex:0 0 auto;border:0;background:none;padding:10px 12px;font-size:14px;color:#5a4a3a;border-bottom:3px solid transparent}
  #vk-tabs button.on{color:#7a1f1a;border-bottom-color:#7a1f1a;font-weight:700}
  #vk-body{flex:1;overflow-y:auto;padding:12px 14px 40px}
  .vk-card{background:#fbf7ef;border:1px solid #ddd0b4;border-radius:10px;padding:10px 12px;margin:0 0 12px}
  .vk-card h3{margin:0 0 6px;font-size:16px;color:#7a1f1a}
  .vk-row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px dashed #e4d8bd}
  .vk-row:last-child{border-bottom:0}
  .vk-mu{color:#6b5a4a}
  .vk-ok{color:#1a7f37;font-weight:600}.vk-bad{color:#b3261e;font-weight:600}
  .vk-btn{display:inline-block;background:#7a1f1a;color:#fff;border:0;border-radius:8px;padding:9px 14px;font-size:15px;margin:4px 6px 4px 0}
  .vk-btn.sec{background:#fff;color:#7a1f1a;border:1px solid #7a1f1a}
  .vk-btn:disabled{opacity:.5}
  .vk-img{width:100%;max-width:480px;display:block;margin:6px auto;border-radius:6px}
  .vk-note{font-size:12px;color:#6b5a4a;text-align:center;margin-bottom:6px}
  .vk-lg{display:flex;align-items:center;gap:8px;padding:3px 0;font-size:14px}
  .vk-sw{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;color:#fff;font-weight:700;font-size:13px;flex:0 0 26px}
  table.vk-t{width:100%;border-collapse:collapse;font-size:13.5px}
  table.vk-t th,table.vk-t td{padding:5px 4px;border-bottom:1px solid #e4d8bd;text-align:left;vertical-align:top}
  table.vk-t th{color:#7a1f1a;font-weight:600}
  .vk-bar{height:8px;background:#e4d8bd;border-radius:4px;overflow:hidden;margin:8px 0}
  .vk-bar i{display:block;height:100%;background:#7a1f1a;width:0}
  .vk-sel{font-size:15px;padding:6px;border-radius:6px;border:1px solid #cdbf9f;background:#fff;max-width:100%}
  .vk-err{background:#fde8e6;border:1px solid #e8b3ad;color:#7a1f1a;border-radius:10px;padding:10px 12px}
  #vk-fab{position:fixed;right:12px;bottom:190px;z-index:2147483001;width:52px;height:52px;border-radius:50%;background:#7a1f1a;color:#fff;font:700 22px serif;border:2px solid #f3ece0;box-shadow:0 2px 8px #0005;display:none}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  const root = document.createElement('div'); root.id = 'vk-root';
  root.innerHTML = `<div id="vk-hd"><b>Trợ lý Kinh mạch</b><button id="vk-rf">Làm mới</button><button id="vk-x">Đóng</button></div><div id="vk-body"></div>`;
  document.body.appendChild(root);
  const fab = document.createElement('button'); fab.id = 'vk-fab'; fab.textContent = '助'; document.body.appendChild(fab);
  const body = root.querySelector('#vk-body');
  S.show = () => { root.style.display = 'flex'; fab.style.display = 'none'; render(); };
  S.hide = () => { S.abort = true; root.style.display = 'none'; fab.style.display = 'block'; };
  root.querySelector('#vk-x').onclick = S.hide; fab.onclick = S.show;
  root.querySelector('#vk-rf').onclick = () => { S.abort = true; S.best = null; render(); };
  const errBox = (e) => `<div class="vk-err"><b>Có lỗi:</b> ${esc(e && e.message || e)}<br><span class="vk-mu" style="font-size:12px">Tool ${TOOL_VER}${S.core ? ' · game ' + esc(S.core.bundle) : ''}. Nếu lỗi lặp lại, chụp màn hình gửi Claude.</span></div>`;
  async function render() {
    try {
      if (!S.core) { body.innerHTML = `<div class="vk-card">⏳ <span id="vk-pg">Đang chuẩn bị…</span></div>`; S.core = await loadCore((m) => { const el = body.querySelector('#vk-pg'); if (el) el.textContent = m; }); }
      if (!G().state.run) { body.innerHTML = `<div class="vk-card">Chưa có kiếp nào đang chơi. Vào game rồi bấm <b>Làm mới</b>.</div>`; return; }
      S.abort = false;
      tabKinhMach();
    } catch (e) { console.error(e); body.innerHTML = errBox(e); }
  }
  const progressHtml = (id) => `<div id="${id}" style="display:none"><div class="vk-bar"><i></i></div><div class="vk-mu" style="font-size:13px"></div><button class="vk-btn sec vk-stop">Dừng</button></div>`;
  function bindProgress(box) {
    box.style.display = 'block';
    box.querySelector('.vk-stop').onclick = () => { S.abort = true; };
    return (f, label) => { box.querySelector('i').style.width = Math.round(f * 100) + '%'; box.querySelector('.vk-mu').textContent = (label || '') + ' ' + Math.round(f * 100) + '%'; };
  }
  function statRows(a, b) {
    const ch = (r) => r.P.chieu.filter((x) => x.dang !== undefined).map((x) => `${esc(x.ten)} (${Math.round(x.uy ?? 0)})`).join(', ');
    const rows = [
      ['Thắng trận mẫu', `${a.wins}/${a.n}`, `${b.wins}/${b.n}`],
      ['Khí huyết', Math.round(a.P.khiHuyetToiDa), Math.round(b.P.khiHuyetToiDa)],
      ['Linh lực / lượt', num(a.P.linhLucMoiLuot), num(b.P.linhLucMoiLuot)],
      ['Tu luyện', '+' + pct(a.R.biDong.toc_do || 0), '+' + pct(b.R.biDong.toc_do || 0)],
      ['Đột phá', '+' + pct(a.R.biDong.dot_pha || 0, 1), '+' + pct(b.R.biDong.dot_pha || 0, 1)],
    ];
    return `<table class="vk-t"><tr><th></th><th>Đang xếp</th><th>Bản mới</th></tr>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><b>${r[2]}</b></td></tr>`).join('')}
    <tr><td>Chiêu</td><td>${ch(a)}</td><td>${ch(b)}</td></tr></table>`;
  }

  function tabKinhMach() {
    const nv = nvNow();
    const tac = nv.kinhMach.trangThai.map((s, i) => (s === 'tac' ? i : -1)).filter((i) => i >= 0);
    const mo = (nv.kinhMach.cho && nv.kinhMach.cho.mo) || 0;
    
    // Bảng chẩn đoán
    const debugHtml = `<div style="background:#fff3cd;border:1px solid #ffe69c;padding:10px;border-radius:8px;margin-bottom:10px;font-size:13px">
      <b>Thông tin chẩn đoán:</b><br>${getDebugInfo(nv)}
    </div>`;

    body.innerHTML = `
    ${debugHtml}
    <div class="vk-card"><h3>Xếp kinh mạch tối ưu</h3>
      <div class="vk-mu" style="font-size:13px">Tool thử hàng nghìn cách xếp các món trong túi, đánh thử 9 trận mẫu cùng cảnh giới cho mỗi cách và giữ cách tốt nhất.</div>
      <div style="margin:8px 0"><select class="vk-sel" id="vk-mode"><option value="bal">Cân bằng (đánh + tu luyện)</option><option value="danh">Ưu tiên đánh nhau</option><option value="tu">Ưu tiên tu luyện / đột phá</option></select>
      <select class="vk-sel" id="vk-it"><option value="1500">Nhanh</option><option value="3000" selected>Vừa</option><option value="6000">Kỹ (lâu)</option></select></div>
      <button class="vk-btn" id="vk-go">Bắt đầu xếp</button>
      ${progressHtml('vk-pr')}<div id="vk-out"></div></div>
    <div class="vk-card"><h3>Ô kinh mạch nên mở</h3>
      <div class="vk-mu" style="font-size:13px">Có ${tac.length} ô tắc · còn ${mo} lượt khai thông. Tool thử mở từng ô rồi xếp lại để xem ô nào lợi nhất.</div>
      <button class="vk-btn" id="vk-op" ${tac.length ? '' : 'disabled'}>Tìm ô nên mở</button>
      ${progressHtml('vk-pr2')}<div id="vk-out2"></div></div>
    <div class="vk-card"><h3>Đang xếp trong game</h3><div id="vk-cur"></div></div>`;
    try { body.querySelector('#vk-cur').innerHTML = drawGrid(nv, getCurrentManh(nv)); } catch (e) { body.querySelector('#vk-cur').innerHTML = errBox(e); }
    if (S.best && S.best.nvKey === JSON.stringify([nv.tuiDo, nv.kinhMach.trangThai, nv.canhGioi, nv.tieuCanhGioi])) showBest(nv);
    body.querySelector('#vk-go').onclick = async (ev) => {
      ev.target.disabled = true; S.abort = false;
      const mode = body.querySelector('#vk-mode').value, iters = +body.querySelector('#vk-it').value;
      const prog = bindProgress(body.querySelector('#vk-pr'));
      try {
        const nv0 = clone(nv); nv0.kinhMach.manh = [];
        const enemies = benchEnemies(nv.canhGioi, nv.tieuCanhGioi || 0);
        const cur = evalCurrent(nv, mode, enemies);
        const a = await anneal({ nv0, mode, iters, init: null, enemies, onProg: (f) => prog(f * 0.6, 'Đang tìm…') });
        const b = await anneal({ nv0, mode, iters: Math.round(iters / 2), init: (a.score >= cur.score ? a : cur).manh, enemies, onProg: (f) => prog(0.6 + f * 0.4, 'Đang tinh chỉnh…') });
        let best = [a, b].sort((x, y) => y.score - x.score)[0];
        if (cur.score >= best.score) best = { ...cur, same: true };
        S.best = { nvKey: JSON.stringify([nv.tuiDo, nv.kinhMach.trangThai, nv.canhGioi, nv.tieuCanhGioi]), cur, best, mode };
        body.querySelector('#vk-pr').style.display = 'none';
        showBest(nv);
      } catch (e) { console.error(e); body.querySelector('#vk-out').innerHTML = errBox(e); }
      ev.target.disabled = false;
    };
    body.querySelector('#vk-op').onclick = async (ev) => {
      ev.target.disabled = true; S.abort = false;
      const prog = bindProgress(body.querySelector('#vk-pr2'));
      const mode = body.querySelector('#vk-mode').value;
      try {
        const nv0 = clone(nv); nv0.kinhMach.manh = [];
        const enemies = benchEnemies(nv.canhGioi, nv.tieuCanhGioi || 0);
        const base = await anneal({ nv0, mode, iters: 800, init: getCurrentManh(nv), enemies, onProg: (f) => prog(f / (tac.length + 1), 'Mốc hiện tại…') });
        const res = [];
        for (let k = 0; k < tac.length && !S.abort; k++) {
          const i = tac[k]; const nvO = clone(nv0); nvO.kinhMach.trangThai[i] = 'thong';
          const r = await anneal({ nv0: nvO, mode, iters: 600, init: base.manh, enemies, onProg: (f) => prog((k + 1 + f) / (tac.length + 1), `Thử ô ${k + 1}/${tac.length}…`) });
          res.push({ i, r, gain: r.score - base.score });
        }
        res.sort((x, y) => y.gain - x.gain);
        body.querySelector('#vk-pr2').style.display = 'none';
        const top = res[0];
        const g = S.core.xo(C(), nv);
        const pos = (i) => `cột ${i % g.rong + 1}, hàng ${Math.floor(i / g.rong) + 1}`;
        let html = `<table class="vk-t"><tr><th>Ô (tính từ góc trên trái)</th><th>Hệ</th><th>Thắng</th><th>Lợi</th></tr>` +
          res.map((x) => `<tr><td>${pos(x.i)}</td><td>${heTen(nv.kinhMach.mau[x.i])}</td><td>${x.r.wins}/${x.r.n}</td><td>${x.gain > 1 ? '<span class="vk-ok">+' + Math.round(x.gain) + '</span>' : '<span class="vk-mu">≈0</span>'}</td></tr>`).join('') + '</table>';
        if (top && top.gain > 1) {
          const nvO = clone(nv); nvO.kinhMach.trangThai[top.i] = 'thong';
          html = `<div class="vk-ok" style="margin:6px 0">Nên mở ô có khung xanh "MỞ" (${pos(top.i)}). Xếp như ảnh sau khi mở:</div>` + drawGrid(nvO, top.r.manh, new Set([top.i])) + html;
        } else html = `<div class="vk-mu" style="margin:6px 0">Với đồ hiện có, mở ô nào cũng chưa lợi thêm. Giữ lượt khai thông lại.</div>` + html;
        body.querySelector('#vk-out2').innerHTML = html;
      } catch (e) { console.error(e); body.querySelector('#vk-out2').innerHTML = errBox(e); }
      ev.target.disabled = false;
    };
  }
  function showBest(nv) {
    const { cur, best } = S.best; const out = body.querySelector('#vk-out');
    if (!out) return;
    
    let errHtml = '';
    if (cur.errCount > 0 || best.errCount > 0) {
      errHtml = `<div class="vk-err" style="margin-bottom:10px">
        <b>Phát hiện lỗi mô phỏng trận đánh!</b><br>
        - Lúc tính "Đang xếp": lỗi ${cur.errCount}/${cur.n} trận. (Lỗi: ${cur.lastErr})<br>
        - Lúc tính "Bản mới": lỗi ${best.errCount}/${best.n} trận. (Lỗi: ${best.lastErr})
      </div>`;
    }

    out.innerHTML = errHtml + (best.same ? '<div class="vk-ok" style="margin:6px 0">Cách đang xếp đã tốt nhất tool tìm được.</div>' : '<div class="vk-ok" style="margin:6px 0">Xếp lại trong game theo ảnh dưới:</div>' + drawGrid(nv, best.manh)) + statRows(cur, best) +
      '<div class="vk-mu" style="font-size:12px;margin-top:6px">Trận mẫu: 9 loại quái cùng cảnh giới với bạn, ở tiểu cảnh giới quanh mức của bạn (thấp hơn 1, bằng, cao hơn 1).</div>';
  }

  S.show();
})();
