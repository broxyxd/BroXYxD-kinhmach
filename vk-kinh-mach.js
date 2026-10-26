// Trợ lý Kinh mạch — Vạn Kiếp Tu Tiên (bản tách riêng chỉ có phần kinh mạch).
// Tách từ vk-tro-ly.js v2.2.0. Chỉ tính toán, không tự bấm, không gửi dữ liệu ra ngoài.
// Chạy trong trang game: tải lại code game thành bản sao để dùng hàm tính của chính game.
const TOOL_VER = '2.2.0-km';

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
  const REGEX_NAMES = {
    fn: [/class ([\w$]+)\{constructor\(n\)\{this\.state=n\}static fromSeed/, 'bộ số ngẫu nhiên'],
  };
  const REGEX_OPT = {
    IP: [/function ([\w$]+)\(t,n,e,i=0\)\{return [\w$]+\(t,n,e,i,[\w$]+\(t,n,"sell",i\)\)\}/, 'giá bán'],
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
    for (const [k, [re, label]] of Object.entries(REGEX_NAMES)) { const m = re.exec(src); if (m) names[k] = m[1]; else missing.push(label); }
    // Bản mới của game: hàm tính kinh mạch tách thành hàm trong (t,n,e) + hàm bọc có cache (t,n)
    if (names.Rt && new RegExp('function ' + names.Rt.replace(/\$/g, '\\$') + '\\(t,n,e\\)').test(src)) {
      const m = new RegExp('function ([\\w$]+)\\(t,n\\)\\{(?:(?!function ).){0,900}?=' + names.Rt.replace(/\$/g, '\\$') + '\\(t,n,\\w\\)', 's').exec(src);
      if (m) names.Rt = m[1]; else missing.push('tính kinh mạch (bọc)');
    }
    // Bản mới của game: kiểm tra món (t,n,e,i) tách khỏi hàm kiểm tra chỗ đặt (t,n,e,i=-1)
    if (names.Jh && !new RegExp('function ' + names.Jh.replace(/\$/g, '\\$') + '\\(t,n,e,i=-1\\)').test(src)) {
      const m = new RegExp('function ([\\w$]+)\\(t,n,e,i=-1\\)\\{(?:(?!function ).){0,400}?' + names.Jh.replace(/\$/g, '\\$') + '\\(', 's').exec(src);
      if (m) names.Jh = m[1]; else missing.push('kiểm tra chỗ đặt (bọc)');
    }
    if (names.Tp) {
      const m = new RegExp(`function ([\\w$]+)\\(t,n\\)\\{return ${names.Tp.replace(/\$/g, '\\$')}\\(([\\w$]+)\\(t,n\\)\\)\\}`).exec(src);
      if (m) names.xo = m[1]; else missing.push('lưới kinh mạch');
    }
    for (const [k, [re]] of Object.entries(REGEX_OPT)) { const m = re.exec(src); if (m) names[k] = m[1]; }
    if (missing.length) throw new Error('Game vừa cập nhật nên tool chưa nhận ra: ' + missing.join(', ') + '. Hãy chụp màn hình gửi Claude để sửa tool.');
    // Đường dẫn tương đối → tuyệt đối (vì bản sao chạy từ blob:)
    src = src.replace(/from"\.\//g, 'from"' + base).replace(/import\("\.\//g, 'import("' + base);
    // Bản sao chạy từ blob: nên import.meta.url phải trỏ về file gốc của game
    src = src.replace(/import\.meta\.url/g, JSON.stringify(url));
    // Không cho bản sao khởi động lại giao diện game
    let ok1 = false, ok2 = false;
    src = src.replace(/((?:[\w$]+\(\);)*)const ([\w$]+)=[\w$]+\.createRoot\(document\.getElementById\("hud"\)\)/, (_, __, v) => { ok1 = true; return `const ${v}={render(){}}`; });
    src = src.replace(/(__tuTienReady:!0\}\)\})([\w$]+)\(\)\.catch\(/, (_, a) => { ok2 = true; return a + 'Promise.resolve().catch('; });
    if (!ok1 || !ok2) throw new Error('Game vừa đổi cách khởi động nên tool chưa chạy được. Hãy chụp màn hình này gửi Claude để sửa tool.');
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
  const clone = (x) => structuredClone(x);
  const sleep0 = () => new Promise((r) => setTimeout(r, 0));
  const pct = (x, d = 0) => (x * 100).toFixed(d).replace('.', ',') + '%';
  const num = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toString().replace('.', ',');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HE = { kim: 'Kim', moc: 'Mộc', thuy: 'Thủy', hoa: 'Hỏa', tho: 'Thổ', bang: 'Băng', loi: 'Lôi', phong: 'Phong', vo_sac: 'Vô sắc' };
  const heTen = (h) => HE[h] ?? h;
  function ctx() {
    const K = S.core, st = G().state;
    const run = clone(st.run), meta = clone(st.meta), F = K.fn, o = new Map();
    run.rngKeys ??= {};
    return {
      ...G().env, run, meta, rng: new F(run.rng), enc: run.active, noticeLines: [],
      rngFor(r) {
        let u = o.get(r);
        if (!u) { const l = Object.hasOwn(run.rngKeys, r) ? run.rngKeys[r] : undefined; u = l === undefined ? F.fromSeed(`${run.seed}|rng|${r}`) : new F(l); o.set(r, u); }
        return u;
      },
    };
  }
  const nvNow = () => clone(G().state.run.nhanVat);
  // ───────────────────────── 3. Mô phỏng trận ─────────────────────────
  const BENCH_IDS = ['enemy.de_tu_truc_co', 'enemy.doc_hanh_kiem_khach', 'enemy.ma_tu_hut_mau', 'enemy.cuong_thi', 'enemy.am_tuong', 'enemy.lao_hoe_tinh', 'enemy.hoa_tinh', 'enemy.thuy_linh', 'enemy.mao_cuong'];
  function benchEnemies(cg, tcP = 0) {
    const K = S.core, c = C();
    const tcs = [Math.max(0, tcP - 1), tcP, Math.min(3, tcP + 1)];
    let ids = BENCH_IDS.filter((id) => c.enemies.has(id));
    if (ids.length < 6) { const all = [...c.enemies.keys()].sort(); const step = Math.max(1, Math.floor(all.length / 9)); ids = all.filter((_, i) => i % step === 0).slice(0, 9); }
    return ids.map((id, i) => ({ id, E: K.Ga({ ...c.enemies.get(id), canh_gioi: cg, tieu_canh_gioi: tcs[i % 3] }, c, { muc: 'thuong' }) }));
  }
  function fight(P, E) {
    try { return S.core.eJ(clone(P), clone(E), {}); } catch { return { thang: false, nHiep: 30, khiHuyetThapNhat: 0, stTa: 0 }; }
  }
  function enemyAt(def, cg, tc, muc) {
    return S.core.Ga({ ...def, canh_gioi: cg, tieu_canh_gioi: tc }, C(), muc ? { muc } : {});
  }

  // ───────────────────────── 4. Tối ưu kinh mạch ─────────────────────────
  function makeEval(nv0, enemies, mode) {
    const K = S.core, c = C(), cache = new Map();
    return (manh) => {
      const key = manh.map((p) => p.key).sort().join('|');
      if (cache.has(key)) return cache.get(key);
      const nv = clone(nv0); nv.kinhMach.manh = manh.map((p) => ({ ...p.m }));
      const R = K.Rt(nv, c), P = K.Vr(nv, c);
      let fightScore = 0, wins = 0;
      for (const { E } of enemies) {
        const r = fight(P, E);
        const hpLeft = r.khiHuyetThapNhat / P.khiHuyetToiDa;
        const dealt = Math.min(1, (r.stTa || 0) * Math.max(1, r.nHiep) / E.khiHuyetToiDa);
        if (r.thang) { wins++; fightScore += mode === 'danh' ? 100 + 15 * hpLeft + 60 / Math.max(1, r.nHiep) : 100 + 50 * hpLeft + 25 / Math.max(1, r.nHiep); }
        else fightScore += 50 * dealt;
      }
      const thong = R.manh.filter((m) => m && m.thong).length;
      const toc = R.biDong.toc_do || 0, dp = R.biDong.dot_pha || 0;
      const ng = R.diemNghich || 0;
      // Linh lực: hồi mỗi lượt phải đủ ra chiêu; món không thông chỉ chiếm chỗ.
      const ll = P.linhLucMoiLuot || 0;
      const atk = (P.chieu || []).filter((x) => x.dang && x.phi > 0).map((x) => x.phi);
      const minCost = atk.length ? Math.min(...atk) : 0;
      const dead = R.manh.filter((m) => m && !m.thong).length;
      const llScore = (mode === 'tu' ? 1 : mode === 'danh' ? 5 : 4) * ll - (minCost && ll < minCost ? 30 : 0) - 8 * dead;
      let s;
      // Điểm nghịch: mỗi điểm −3% tỉ lệ đột phá (tối đa −15%), thêm phản phệ trong trận (trận mẫu đã tính).
      if (mode === 'tu') s = 0.3 * fightScore + 400 * toc + 300 * dp + thong - 40 * ng + llScore;
      else if (mode === 'danh') s = fightScore + 0.2 * thong - 3 * ng + llScore;
      else s = fightScore + 30 * toc + 20 * dp + 0.2 * thong - 10 * ng + llScore;
      const out = { s, wins, P, R };
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

  // Xếp tham lam nhanh (giống nút tự đặt của game): lần lượt đặt món + vị trí làm tăng điểm nhiều nhất.
  async function greedy(nv0, mode) {
    const K = S.core, c = C(), { cand } = buildCandidates(nv0);
    const quick = (manh) => {
      const nv = clone(nv0); nv.kinhMach.manh = manh.map((p) => ({ ...p.m }));
      const R = K.Rt(nv, c);
      const uy = (R.chieu || []).reduce((a, x) => a + (x.uyLuc || x.uy || 0) / 10, 0);
      const toc = R.biDong.toc_do || 0, dp = R.biDong.dot_pha || 0;
      const w = mode === 'tu' ? [0.5, 60, 40, 0.3] : mode === 'danh' ? [1.5, 3, 2, 1.2] : [1, 12, 8, 1];
      const thongAll = R.manh.every((m) => !m || m.thong);
      return w[0] * R.linhLuc + w[1] * toc + w[2] * dp + w[3] * uy - 6 * (R.diemNghich || 0) - (thongAll ? 0 : 1000);
    };
    let cur = [], curS = quick(cur);
    for (let round = 0; round < 40; round++) {
      let best = null;
      const used = new Set(cur.flatMap((p) => p.cells));
      for (const id of Object.keys(cand)) {
        if (cur.some((p) => p.m.item === id)) continue;
        for (const cnd of cand[id]) {
          if (cnd.cells.some((x) => used.has(x))) continue;
          const v = quick([...cur, cnd]);
          if (!best || v > best.v) best = { v, cnd };
        }
      }
      if (!best || best.v <= curS + 1e-9) break;
      cur.push(best.cnd); curS = best.v;
      if (round % 3 === 0) await sleep0();
    }
    return cur.map((p) => ({ ...p.m }));
  }

  async function anneal({ nv0, mode, iters, init, onProg, label }) {
    const enemies = benchEnemies(nv0.canhGioi, nv0.tieuCanhGioi || 0);
    const ev = makeEval(nv0, enemies, mode);
    const { cand } = buildCandidates(nv0);
    const ids = Object.keys(cand).filter((k) => cand[k].length);
    let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
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
    return { manh: best.map((p) => ({ ...p.m })), score: e.s, wins: e.wins, n: enemies.length, P: e.P, R: e.R };
  }

  // Bỏ khỏi cách xếp mọi món không thông (không có tác dụng gì), rồi chấm lại.
  function stripDead(nv, res, mode) {
    let manh = res.manh.slice();
    for (let k = 0; k < 5; k++) {
      const nv2 = clone(nv); nv2.kinhMach.manh = manh;
      const R = S.core.Rt(nv2, C());
      const keep = manh.filter((m, i) => R.manh[i] && R.manh[i].thong);
      if (keep.length === manh.length) break;
      manh = keep;
    }
    if (manh.length === res.manh.length) return res;
    const nv3 = clone(nv); nv3.kinhMach.manh = manh;
    return { ...evalCurrent(nv3, mode), manh };
  }
  function evalCurrent(nv, mode) {
    const enemies = benchEnemies(nv.canhGioi, nv.tieuCanhGioi || 0);
    const ev = makeEval({ ...clone(nv), kinhMach: { ...clone(nv.kinhMach), manh: [] } }, enemies, mode);
    const manh = nv.kinhMach.manh.map((m) => ({ m, key: m.item + ':' + m.x + ',' + m.y + ',' + m.xoay }));
    const e = ev(manh);
    return { manh: clone(nv.kinhMach.manh), score: e.s, wins: e.wins, n: enemies.length, P: e.P, R: e.R };
  }

  // ───────────────────────── 5. Vẽ kinh mạch ─────────────────────────
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
      const it = c.items.get(m.item); const he = (it.he || ['vo_sac'])[0];
      const pal = BASE[he] || ['#888']; cols.push(pal[(used[he] = (used[he] || 0) + 1) % pal.length]);
      const cells = K.al(g, m, it) || []; cells.forEach((x) => (own[x] = n));
      const rm = R.manh[n];
      pieces.push({ it, cells, thong: rm ? rm.thong : false, heSo: rm ? rm.heSo : 0, onHuyet: cells.some((x) => hy.has(x)) });
    });
    // chỉ vẽ vùng có ô mở
    let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
    for (let i = 0; i < g.rong * g.cao; i++) if (km.trangThai[i] !== 'an' || own[i] !== undefined) { const x = i % g.rong, y = Math.floor(i / g.rong); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(g.rong - 1, x1 + 1); y1 = Math.min(g.cao - 1, y1 + 1);
    const Sz = 84, M = 28, W = (x1 - x0 + 1) * Sz + 2 * M, H = (y1 - y0 + 1) * Sz + 2 * M;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const d = cv.getContext('2d');
    d.fillStyle = '#f3ece0'; d.fillRect(0, 0, W, H);
    d.fillStyle = '#7a1f1a'; d.font = 'bold 18px sans-serif'; d.textAlign = 'center'; d.textBaseline = 'middle';
    for (let x = x0; x <= x1; x++) d.fillText(String(x + 1), M + (x - x0) * Sz + Sz / 2, M / 2);
    for (let y = y0; y <= y1; y++) d.fillText(String(y + 1), M / 2, M + (y - y0) * Sz + Sz / 2);
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
    return `<img class="vk-img" src="${cv.toDataURL('image/png')}" alt="kinh mạch"><div class="vk-note">Số ngoài lề = cột (trên) và hàng (trái). Chấm vàng = huyệt · 丹 = đan điền · × = ô tắc. Giữ tay lên ảnh để lưu.</div>${legend}`;
  }

  // ── Giao diện
  const css = `
  #vk-root{position:fixed;top:0;bottom:0;right:0;left:auto;width:min(420px,100vw);border-left:2px solid #7a1f1a;box-shadow:-4px 0 14px #0006;z-index:2147483000;background:#f3ece0;color:#1e1512;font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column}
  #vk-root *{box-sizing:border-box}
  #vk-root.vk-left{right:auto;left:0;border-left:0;border-right:2px solid #7a1f1a;box-shadow:4px 0 14px #0006}
  #vk-root.vk-wide{width:min(680px,100vw)}
  .vk-stp{margin:6px 0;padding-left:0;list-style:none;font-size:14px}.vk-stp li{padding:4px 0;border-bottom:1px dashed #e4d8bd}
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
  root.innerHTML = `<div id="vk-hd"><b>Trợ lý Kinh mạch</b><button id="vk-sd" title="Đổi bên trái/phải">⇄</button><button id="vk-wd" title="Rộng/hẹp">↔</button><button id="vk-rf">Làm mới</button><button id="vk-mn" title="Thu nhỏ (giữ kết quả, game vẫn chơi được)">–</button><button id="vk-x">Đóng</button></div><div id="vk-body"></div>`;
  document.body.appendChild(root);
  const fab = document.createElement('button'); fab.id = 'vk-fab'; fab.textContent = '助'; document.body.appendChild(fab);
  const body = root.querySelector('#vk-body');
  S.show = () => { root.style.display = 'flex'; fab.style.display = 'none'; render(); };
  S.hide = () => { S.abort = true; root.style.display = 'none'; fab.style.display = 'block'; };
  S.min = () => { root.style.display = 'none'; fab.style.display = 'block'; };
  root.querySelector('#vk-x').onclick = S.hide; root.querySelector('#vk-mn').onclick = S.min; fab.onclick = S.show;
  root.querySelector('#vk-sd').onclick = () => root.classList.toggle('vk-left');
  root.querySelector('#vk-wd').onclick = () => root.classList.toggle('vk-wide');
  root.querySelector('#vk-rf').onclick = () => { S.best = null; render(); };
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
  function itemDesc(it) {
    const b = it.bi_dong || {}, out = [];
    if (it.linh_luc) out.push(`linh lực ${num(it.linh_luc, 2)}`);
    const sg = (v, d = 0) => (v >= 0 ? '+' : '') + pct(v, d);
    if (b.toc_do) out.push(`tu luyện ${sg(b.toc_do)}`);
    if (b.dot_pha) out.push(`đột phá ${sg(b.dot_pha)}`);
    if (b.khi_huyet) out.push(`khí huyết ${sg(b.khi_huyet)}`);
    if (b.ho_the) out.push(`hộ thể ${sg(b.ho_the, 1)}`);
    if (b.khang_tam_ma) out.push(`kháng tâm ma ${b.khang_tam_ma > 0 ? '+' : ''}${pct(b.khang_tam_ma)}`);
    for (const [k, v] of Object.entries(b.chi_so || {})) out.push(`${({ than_thuc: 'thần thức', ngo_tinh: 'ngộ tính', than_phap: 'thân pháp', can_cot: 'căn cốt', dao_tam: 'đạo tâm', khi_van: 'khí vận' })[k] || k} +${v}`);
    if (it.chieu) out.push(`chiêu <b>${esc(it.chieu.ten)}</b> (${({ cong: 'đánh', thu: 'thủ', hoi_phuc: 'hồi máu', khong_che: 'khống chế' })[it.chieu.dang] || it.chieu.dang}, uy ${num(it.chieu.uy, 2)}${it.chieu.scope ? ', đánh lan' : ''})`);
    return out.join(' · ');
  }

  // ── Nên mua / tìm món nào hợp kinh mạch hiện tại
  function bindBuy(nv) {
    const c = C(), money = Math.floor(nv.linhThach || 0);
    body.querySelector('#vk-by').onclick = async (ev) => {
      ev.target.disabled = true; S.abort = false;
      const mode = body.querySelector('#vk-mode').value;
      const capSel = +body.querySelector('#vk-bp').value, nTop = +body.querySelector('#vk-bn').value;
      const budget = capSel === 0 ? money : capSel;
      const out = body.querySelector('#vk-bo'), prog = bindProgress(body.querySelector('#vk-pr5'));
      try {
        const loai = body.querySelector('#vk-bl').value;
        const pool = [...c.items.values()].filter((it) => (it.loai === 'cong_phap' || it.loai === 'phap_khi') && (loai === 'all' || (loai === 'phap_khi' ? it.loai === 'phap_khi' : it.loai === 'cong_phap' && (loai === 'dau_phap' ? !!it.chieu : !it.chieu))) && it.hinh && (it.canh_gioi ?? 0) <= nv.canhGioi && !(nv.tuiDo[it.id] > 0) && (budget < 0 || (it.gia || 0) <= budget))
          .sort((a, b) => (b.pham_cap || 0) - (a.pham_cap || 0) || (a.gia || 0) - (b.gia || 0));
        // chọn xen kẽ công pháp và pháp khí để không bên nào lấn hết chỗ
        const cp = pool.filter((it) => it.loai === 'cong_phap'), pk = pool.filter((it) => it.loai === 'phap_khi'), cands = [];
        for (let i = 0; cands.length < nTop && (i < cp.length || i < pk.length); i++) { if (i < cp.length) cands.push(cp[i]); if (cands.length < nTop && i < pk.length) cands.push(pk[i]); }
        if (!cands.length) { out.innerHTML = '<div class="vk-mu" style="margin:6px 0">Không có món nào trong tầm giá và cảnh giới này.</div>'; prog(1, ''); ev.target.disabled = false; return; }
        const nv0 = clone(nv); nv0.kinhMach.manh = [];
        const base = await anneal({ nv0, mode, iters: 1200, init: nv.kinhMach.manh, onProg: (f) => prog(f / (cands.length + 1), 'Mốc hiện tại…') });
        const res = [];
        for (let k = 0; k < cands.length && !S.abort; k++) {
          const it = cands[k], nvX = clone(nv0); nvX.tuiDo[it.id] = 1;
          const r = await anneal({ nv0: nvX, mode, iters: 500, init: base.manh, onProg: (f) => prog((k + 1 + f) / (cands.length + 1), `Thử ${it.ten} (${k + 1}/${cands.length})…`) });
          res.push({ it, r, nvX, gain: r.score - base.score });
        }
        res.sort((a, b) => b.gain - a.gain);
        body.querySelector('#vk-pr5').style.display = 'none';
        S.buy = res;
        const good = res.filter((x) => x.gain > 1).slice(0, 15);
        out.innerHTML = good.length
          ? `<div class="vk-mu" style="font-size:13px;margin:6px 0">Đã thử ${res.length} món. Mốc hiện tại: thắng ${base.wins}/${base.n} trận mẫu. "Lợi" = mức tăng điểm so với cách xếp tốt nhất hiện có (đã tính xếp lại kinh mạch). Giá là giá gốc, tiệm có thể bán khác.</div><table class="vk-t"><tr><th>Món</th><th>Giá gốc</th><th>Lợi</th></tr>` +
            good.map((x, i) => `<tr><td><b>${esc(x.it.ten)}</b><br><span class="vk-mu" style="font-size:12px">${x.it.loai === 'cong_phap' ? (x.it.chieu ? 'Đấu pháp' : 'Tâm pháp') : (x.it.chieu ? 'Pháp khí' : 'Bảo vật')} · ${esc((x.it.he || ['vo_sac']).map(heTen).join('/'))} · phẩm ${x.it.pham_cap} · ${itemDesc(x.it)}</span><br><button class="vk-btn sec" data-bi="${i}" style="padding:3px 8px;font-size:13px">Xem cách xếp</button></td><td>${x.it.gia ?? '?'}</td><td class="vk-ok">+${Math.round(x.gain)}<br><span class="vk-mu" style="font-size:12px">thắng ${x.r.wins}/${x.r.n}</span></td></tr>`).join('') + '</table><div id="vk-bv"></div>'
          : '<div class="vk-mu" style="margin:6px 0">Không món nào trong tầm giá giúp rõ rệt so với đồ bạn đang có. Thử nâng mức giá hoặc đo thêm nhiều món.</div>';
        out.querySelectorAll('[data-bi]').forEach((b) => { b.onclick = () => {
          const x = good[+b.dataset.bi], r = stripDead(x.nvX, x.r, mode);
          out.querySelector('#vk-bv').innerHTML = `<div class="vk-ok" style="margin:8px 0">Nếu có ${esc(x.it.ten)}, xếp như sau:</div>` + drawGrid(nv, r.manh) + stepList(nv, r.manh, nv.kinhMach.manh);
          out.querySelector('#vk-bv').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }; });
      } catch (e) { console.error(e); out.innerHTML = errBox(e); }
      ev.target.disabled = false;
    };
  }

  function statRows(a, b) {
    const ch = (r) => r.P.chieu.filter((x) => x.dang !== undefined).map((x) => `${esc(x.ten)} (${Math.round(x.uy)})`).join(', ');
    const rows = [
      ['Thắng trận mẫu', `${a.wins}/${a.n}`, `${b.wins}/${b.n}`],
      ['Khí huyết', Math.round(a.P.khiHuyetToiDa), Math.round(b.P.khiHuyetToiDa)],
      ['Linh lực hồi / lượt', num(a.P.linhLucMoiLuot), num(b.P.linhLucMoiLuot)],
      ['Linh lực tối đa', num(a.P.linhLucToiDa ?? a.P.linhLucMoiLuot * 3), num(b.P.linhLucToiDa ?? b.P.linhLucMoiLuot * 3)],
      ['Chiêu tốn nhiều nhất', num(Math.max(0, ...a.P.chieu.map((x) => x.phi || 0))), num(Math.max(0, ...b.P.chieu.map((x) => x.phi || 0)))],
      ['Tu luyện', '+' + pct(a.R.biDong.toc_do || 0), '+' + pct(b.R.biDong.toc_do || 0)],
      ['Đột phá', '+' + pct(a.R.biDong.dot_pha || 0, 1), '+' + pct(b.R.biDong.dot_pha || 0, 1)],
      ['Điểm nghịch', a.R.diemNghich || 0, b.R.diemNghich || 0],
    ];
    return `<table class="vk-t"><tr><th></th><th>Đang xếp</th><th>Bản mới</th></tr>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><b>${r[2]}</b></td></tr>`).join('')}
    <tr><td>Chiêu</td><td>${ch(a)}</td><td>${ch(b)}</td></tr></table>`;
  }

  function tabKinhMach() {
    const nv = nvNow();
    const tac = nv.kinhMach.trangThai.map((s, i) => (s === 'tac' ? i : -1)).filter((i) => i >= 0);
    const mo = (nv.kinhMach.cho && nv.kinhMach.cho.mo) || 0;
    body.innerHTML = `
    <div class="vk-card"><h3>Xếp kinh mạch tối ưu</h3>
      <div class="vk-mu" style="font-size:13px">Tool thử hàng nghìn cách xếp các món trong túi, đánh thử ${'9'} trận mẫu cùng cảnh giới cho mỗi cách và giữ cách tốt nhất.</div>
      <div style="margin:8px 0"><select class="vk-sel" id="vk-mode"><option value="bal">Cân bằng (đánh + tu luyện)</option><option value="danh">Ưu tiên đánh nhau</option><option value="tu">Ưu tiên tu luyện / đột phá</option></select>
      <select class="vk-sel" id="vk-it"><option value="1500">Nhanh</option><option value="3000" selected>Vừa</option><option value="6000">Kỹ (lâu)</option></select></div>
      <button class="vk-btn" id="vk-go">Bắt đầu xếp</button>
      ${progressHtml('vk-pr')}<div id="vk-out"></div></div>
    <div class="vk-card"><h3>Ô kinh mạch nên mở</h3>
      <div class="vk-mu" style="font-size:13px">Có ${tac.length} ô tắc · còn ${mo} lượt khai thông. Tool thử mở từng ô rồi xếp lại để xem ô nào lợi nhất.</div>
      <button class="vk-btn" id="vk-op" ${tac.length ? '' : 'disabled'}>Tìm ô nên mở</button>
      ${progressHtml('vk-pr2')}<div id="vk-out2"></div></div>
    <div class="vk-card"><h3>Nên mua / tìm món nào?</h3>
      <div class="vk-mu" style="font-size:13px">Có <b>${Math.floor(nv.linhThach || 0)}</b> linh thạch. Tool thử thêm từng công pháp / pháp khí chưa có vào túi, xếp lại kinh mạch hiện tại và đánh trận mẫu để đo món nào lợi nhất. Dùng chế độ ở khối "Xếp kinh mạch tối ưu".</div>
      <div style="margin:8px 0"><select class="vk-sel" id="vk-bp"><option value="0" selected>Giá ≤ linh thạch đang có</option><option value="300">Giá ≤ 300</option><option value="1000">Giá ≤ 1.000</option><option value="3000">Giá ≤ 3.000</option><option value="-1">Mọi giá</option></select>
      <select class="vk-sel" id="vk-bl"><option value="all" selected>Công pháp + pháp khí</option><option value="tam_phap">Chỉ tâm pháp (tu luyện)</option><option value="dau_phap">Chỉ đấu pháp (có chiêu)</option><option value="phap_khi">Chỉ pháp khí</option></select>
      <select class="vk-sel" id="vk-bn"><option value="20">Đo 20 món (nhanh)</option><option value="40" selected>Đo 40 món</option><option value="80">Đo 80 món (lâu)</option></select></div>
      <button class="vk-btn" id="vk-by">Tìm món nên mua</button>${progressHtml('vk-pr5')}<div id="vk-bo"></div></div>
    <div class="vk-card"><h3>Đang xếp trong game</h3><div id="vk-cur"></div></div>
    <div class="vk-card"><h3>Nguyên lý kinh mạch (đọc từ code game)</h3><ul style="margin:0;padding-left:18px;font-size:14px">
      <li><b>Thông:</b> tâm pháp/đấu pháp thông khi chạm đan điền hoặc chạm một công pháp đã thông (nối thành chuỗi). Pháp khí thông khi chạm đan điền hoặc chạm công pháp đã thông. Món không thông = không có tác dụng.</li>
      <li><b>Màu ô:</b> hệ số = 0,85 + 0,45 × độ hợp trung bình các ô (đúng hệ = 1; cùng gốc như Băng–Thủy hoặc có Vô sắc = 0,5; khác hệ = 0). Đặt đúng màu tối đa ×1,3.</li>
      <li><b>Huyệt:</b> phủ 1 huyệt ×2, mỗi huyệt thêm +0,25. Nên đặt món mạnh nhất (chiêu chính, pháp khí thủ) lên huyệt.</li>
      <li><b>Sinh khắc:</b> mỗi món kề bên (đã thông) mà hệ của nó sinh ra hệ món này +15%, mỗi món khắc −15% (thấp nhất ×0,4).</li>
      <li><b>Kinh lộ (pháp khí):</b> chuỗi công pháp từ đan điền tới pháp khí, mỗi công pháp cùng họ hệ +10% (tối đa 5).</li>
      <li><b>Nội tại:</b> món nhiều hệ mà các hệ sinh nhau ×1,1.</li>
      <li><b>Điểm nghịch</b> (+1 mỗi cặp món kề nhau khắc nhau, +1 mỗi món đặt quá nửa trên ô khắc nó, +1 mỗi món tự có hệ khắc nhau): mỗi điểm −3% tỉ lệ đột phá (tối đa −15%) và gây phản phệ trong trận. Tool trừ điểm nghịch khi xếp.</li>
      <li><b>Tâm pháp:</b> tốc độ tu luyện/đột phá/kháng tâm ma không nhân hệ số, chỉ cần thông; linh lực và chỉ số thì nhân hệ số. Món Vô sắc cho linh lực ×0,85.</li>
    </ul></div>`;
    try { body.querySelector('#vk-cur').innerHTML = drawGrid(nv, nv.kinhMach.manh); } catch (e) { body.querySelector('#vk-cur').innerHTML = errBox(e); }
    if (S.best && S.best.nvKey === JSON.stringify([nv.tuiDo, nv.kinhMach.trangThai, nv.canhGioi, nv.tieuCanhGioi])) showBest(nv);
    body.querySelector('#vk-go').onclick = async (ev) => {
      ev.target.disabled = true; S.abort = false;
      const mode = body.querySelector('#vk-mode').value, iters = +body.querySelector('#vk-it').value;
      const prog = bindProgress(body.querySelector('#vk-pr'));
      try {
        const nv0 = clone(nv); nv0.kinhMach.manh = [];
        const cur = evalCurrent(nv, mode);
        prog(0.02, 'Xếp nhanh…');
        const g0 = await greedy(nv0, mode);
        const a = await anneal({ nv0, mode, iters: Math.round(iters * 0.6), init: g0, onProg: (f) => prog(0.05 + f * 0.35, 'Tìm từ bản xếp nhanh…') });
        const a2 = await anneal({ nv0, mode, iters: Math.round(iters * 0.6), init: null, onProg: (f) => prog(0.4 + f * 0.3, 'Tìm từ đầu…') });
        const top = [a, a2, cur].sort((x, y) => y.score - x.score)[0];
        const b = await anneal({ nv0, mode, iters: Math.round(iters / 2), init: top.manh, onProg: (f) => prog(0.7 + f * 0.3, 'Đang tinh chỉnh…') });
        let best = [a, a2, b].sort((x, y) => y.score - x.score)[0];
        best = stripDead(nv, best, mode);
        if (cur.score >= best.score && !(cur.R.manh || []).some((m) => m && !m.thong)) best = { ...cur, same: true };
        S.best = { nvKey: JSON.stringify([nv.tuiDo, nv.kinhMach.trangThai, nv.canhGioi, nv.tieuCanhGioi]), cur, best, mode };
        body.querySelector('#vk-pr').style.display = 'none';
        showBest(nv);
      } catch (e) { console.error(e); body.querySelector('#vk-out').innerHTML = errBox(e); }
      ev.target.disabled = false;
    };
    bindBuy(nv);
    body.querySelector('#vk-op').onclick = async (ev) => {
      ev.target.disabled = true; S.abort = false;
      const prog = bindProgress(body.querySelector('#vk-pr2'));
      const mode = body.querySelector('#vk-mode').value;
      try {
        const nv0 = clone(nv); nv0.kinhMach.manh = [];
        const base = await anneal({ nv0, mode, iters: 800, init: nv.kinhMach.manh, onProg: (f) => prog(f / (tac.length + 1), 'Mốc hiện tại…') });
        const res = [];
        for (let k = 0; k < tac.length && !S.abort; k++) {
          const i = tac[k]; const nvO = clone(nv0); nvO.kinhMach.trangThai[i] = 'thong';
          const r = await anneal({ nv0: nvO, mode, iters: 600, init: base.manh, onProg: (f) => prog((k + 1 + f) / (tac.length + 1), `Thử ô ${k + 1}/${tac.length}…`) });
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
    out.innerHTML = (best.same ? '<div class="vk-ok" style="margin:6px 0">Cách đang xếp đã tốt nhất tool tìm được.</div>' : '<div class="vk-ok" style="margin:6px 0">Xếp lại trong game theo ảnh dưới:</div>' + drawGrid(nv, best.manh) + stepList(nv, best.manh, cur.manh)) + statRows(cur, best) +
      ((best.R && best.R.diemNghich) ? `<div class="vk-mu" style="font-size:12px;margin-top:6px">Cách này còn ${best.R.diemNghich} điểm nghịch (−${Math.min(15, 3 * best.R.diemNghich)}% tỉ lệ đột phá). Lúc chuẩn bị đột phá, chọn chế độ "Ưu tiên tu luyện / đột phá" để tool ưu tiên xóa điểm nghịch.</div>` : '') +
      '<div class="vk-mu" style="font-size:12px;margin-top:6px">Trận mẫu: 9 loại quái cùng cảnh giới với bạn, ở tiểu cảnh giới quanh mức của bạn (thấp hơn 1, bằng, cao hơn 1).</div>' + pieceTable(best.R) + sellAdvice(nv, best);
  }
  // Đồ công pháp/pháp khí không có mặt trong cách xếp tốt nhất → đề xuất bán
  function sellAdvice(nv, best) {
    const used = new Set(best.manh.map((m) => m.item));
    const c = ctx(), Cc = C(), K = S.core;
    const rows = Object.entries(nv.tuiDo).filter(([id, n]) => n > 0 && !used.has(id)).map(([id, n]) => ({ it: Cc.items.get(id), n, id })).filter((x) => x.it && (x.it.loai === 'cong_phap' || x.it.loai === 'phap_khi'));
    if (!rows.length) return '';
    const price = (id, it) => { try { return K.IP ? K.IP(c, id, undefined, 0) : Math.round((it.gia || 0) * 0.6); } catch { return Math.round((it.gia || 0) * 0.6); } };
    const topPham = Math.max(0, ...best.manh.map((m) => Cc.items.get(m.item)?.pham_cap || 0));
    rows.forEach((x) => { x.p = price(x.id, x.it); x.why = !x.it.hinh ? 'không đặt lên kinh mạch được' : (x.it.canh_gioi ?? 0) > nv.canhGioi ? 'chưa đủ cảnh giới — giữ lại' : (x.it.pham_cap || 0) >= topPham ? 'phẩm cao nhưng chưa có chỗ — cân nhắc giữ để dùng khi mở thêm ô' : 'yếu hơn đồ đang xếp — nên bán'; });
    rows.sort((a, b) => b.p * b.n - a.p * a.n);
    const sellable = rows.filter((x) => x.why.endsWith('nên bán') || x.why.startsWith('không đặt'));
    const total = sellable.reduce((a, x) => a + x.p * x.n, 0);
    return `<div style="margin-top:10px"><b>Đồ nên bán</b> <span class="vk-mu" style="font-size:13px">(không dùng trong cách xếp tốt nhất; bán phần "nên bán" được khoảng ${Math.round(total)} linh thạch ở chỗ đang đứng)</span><table class="vk-t">${rows.map((x) => `<tr><td>${esc(x.it.ten)}${x.n > 1 ? ' ×' + x.n : ''}<br><span class="vk-mu" style="font-size:12px">phẩm ${x.it.pham_cap} · ${x.why}</span></td><td>${Math.round(x.p * x.n)}</td></tr>`).join('')}</table><div class="vk-mu" style="font-size:12px">Trước khi bán: nếu sắp lên cảnh giới mới hoặc sắp mở thêm ô kinh mạch, xếp lại một lần nữa để chắc món đó vẫn thừa.</div></div>`;
  }
  // Danh sách thao tác: gỡ món nào, đặt món nào ở đâu, xoay mấy lần
  function stepList(nv, manh, curManh) {
    const K = S.core, c = C(), nv2 = clone(nv); nv2.kinhMach.manh = manh;
    const g = K.xo(c, nv2);
    const same = (a, b) => a.item === b.item && a.x === b.x && a.y === b.y && a.xoay === b.xoay;
    const keep = [], put = [];
    manh.forEach((m, n) => {
      const it = c.items.get(m.item), cells = K.al(g, m, it) || [];
      const cx = Math.min(...cells.map((i) => i % g.rong)) + 1, cy = Math.min(...cells.map((i) => Math.floor(i / g.rong))) + 1;
      const row = `<li><b>${n + 1}. ${esc(it.ten)}</b> — xoay phải ${m.xoay} lần (90° mỗi lần) — ô góc trên-trái: <b>cột ${cx}, hàng ${cy}</b></li>`;
      ((curManh || []).some((o) => same(o, m)) ? keep : put).push(row);
    });
    const rm = (curManh || []).filter((o) => !manh.some((m) => same(o, m))).map((o) => `<li>${esc((c.items.get(o.item) || {}).ten || o.item)}</li>`).join('');
    return `<div style="margin-top:8px">${rm ? `<b>1) Gỡ khỏi kinh mạch:</b><ul class="vk-stp">${rm}</ul>` : ''}<b>${rm ? '2) ' : ''}Đặt vào:</b><ul class="vk-stp">${put.join('') || '<li class="vk-mu">Không có món mới.</li>'}</ul>${keep.length ? `<b>Giữ nguyên:</b><ul class="vk-stp">${keep.join('')}</ul>` : ''}<div class="vk-note" style="text-align:left">Cột/hàng đếm từ góc trên-trái của lưới, khớp số ở lề ảnh. Số trong ảnh là số thứ tự món.</div></div>`;
  }
  function pieceTable(R) {
    if (!R || !R.manh) return '';
    const f = (x) => (Math.abs(x - 1) < 0.005 ? '' : '×' + num(x, 2));
    const rows = R.manh.map((m, i) => !m ? '' : `<tr><td>${i + 1}. ${esc(m.item.ten)}${m.thong ? '' : ' <span class="vk-bad">không thông</span>'}</td><td><b>${num(m.heSo, 2)}</b></td><td style="font-size:12px">${[['màu', m.mau], ['huyệt', m.huyet], ['sinh khắc', m.sinhKhac], ['nội tại', m.noiTai], ['kinh lộ', m.kinhLo]].filter(([, v]) => v && Math.abs(v - 1) >= 0.005).map(([k, v]) => `${k} ${f(v)}`).join(' · ') || '—'}</td></tr>`).join('');
    return `<details style="margin-top:8px"><summary>Hệ số từng món (vì sao xếp vậy)</summary><table class="vk-t"><tr><th>Món</th><th>Hệ số</th><th>Đến từ</th></tr>${rows}</table><div class="vk-mu" style="font-size:12px">Hệ số nhân vào linh lực, uy lực chiêu, khí huyết/hộ thể/chỉ số của món. Tốc độ tu luyện, đột phá, kháng tâm ma của tâm pháp không nhân hệ số — chỉ cần thông.</div></details>`;
  }


  S.show();
})();
