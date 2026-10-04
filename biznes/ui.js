/* Toshkent Biznes — interfeys va o'yin boshqaruvchisi */
(function () {
  'use strict';
  const E = window.Engine, C = E.CELLS, GR = E.GROUPS;
  const $ = (q, r) => (r || document).querySelector(q);
  const $$ = (q, r) => Array.from((r || document).querySelectorAll(q));
  const fmt = E.fmt;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  const TOKENS = ['🚗', '🚌', '🐫', '🐎', '🏍️', '🍉', '🚜', '⚽', '🎩', '🐕', '🚀', '🦅'];
  const COLORS = ['#E53935', '#1E88E5', '#43A047', '#F9A825', '#8E24AA', '#00ACC1'];
  const BOT_NAMES = ['Aziz', 'Malika', 'Jasur', 'Nilufar', 'Bobur', 'Dilnoza', 'Sardor', 'Madina', 'Otabek', 'Zarina'];
  const LEVELS = { easy: 'Oson', medium: "O'rta", hard: 'Kuchli' };
  const SH = '­';
  const SHORT = {
    1: 'Ser' + SH + 'geli', 3: "Qo'yliq", 5: 'Chilon' + SH + 'zor', 6: 'Uch' + SH + 'tepa', 8: 'Olma' + SH + 'zor', 9: 'Uzbek' + SH + 'film',
    11: 'Yakka' + SH + 'saroy', 12: 'Elektr', 13: 'Miro' + SH + 'bod', 14: 'Shayxon' + SH + 'tohur', 15: "O'zbe" + SH + 'kiston',
    16: 'Chorsu', 18: 'Xadra', 19: "Ko'kcha", 21: 'Yunus' + SH + 'obod', 23: "Mirzo Ulug'" + SH + 'bek', 24: 'Minor',
    25: 'Yunus' + SH + 'obod', 26: 'Bobur', 27: 'Rusta' + SH + 'veli', 28: 'Suv', 29: 'Navoiy', 31: 'Sayil' + SH + 'goh',
    32: 'Afro' + SH + 'siyob', 34: 'Musta' + SH + 'qil' + SH + 'lik', 35: 'Halqa', 37: 'Amir Temur', 39: 'Tash' + SH + 'kent City',
    4: 'Soliq', 38: 'Hasha' + SH + 'mat', 2: 'Mahal' + SH + 'la', 17: 'Mahal' + SH + 'la', 33: 'Mahal' + SH + 'la', 7: 'Omad', 22: 'Omad', 36: 'Omad',
  };

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  // ---------------- Profil ----------------
  let profile = store.get('tb_profile', null) || { name: "O'yinchi", token: '🚗', uid: 'u' + Math.random().toString(36).slice(2, 10) };
  if (!profile.uid) profile.uid = 'u' + Math.random().toString(36).slice(2, 10);
  store.set('tb_profile', profile);
  function renderProfile() {
    $('#profName').textContent = profile.name;
    $('#profAv').textContent = profile.token;
  }

  // ---------------- Ekranlar ----------------
  function show(id) {
    $$('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'menu') refreshMenu();
  }
  function refreshMenu() {
    const sv = store.get('tb_save', null);
    $('#mContinue').style.display = sv && sv.s && sv.s.phase !== 'gameover' ? '' : 'none';
    $('#mSound').textContent = Snd.on ? '🔊 Ovoz: yoqilgan' : '🔇 Ovoz: o\'chirilgan';
    renderProfile();
  }

  function toast(text, ms) {
    const box = $('#toast');
    const d = document.createElement('div');
    d.innerHTML = text;
    box.appendChild(d);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 320); }, ms || 2200);
  }

  // ---------------- Pastki oyna / modal ----------------
  let sheetOnClose = null;
  function openSheet(title, bodyHtml, footHtml, onClose) {
    const el = $('#sheet');
    el.innerHTML = `<div class="sheet"><div class="hd"><h3>${title}</h3><button class="iconbtn" data-close>✕</button></div>
      <div class="bd">${bodyHtml}</div>${footHtml ? `<div class="ft">${footHtml}</div>` : ''}</div>`;
    el.classList.add('on');
    sheetOnClose = onClose || null;
    return el;
  }
  function closeSheet() {
    const el = $('#sheet');
    if (!el.classList.contains('on')) return false;
    el.classList.remove('on'); el.innerHTML = '';
    const f = sheetOnClose; sheetOnClose = null; if (f) f();
    return true;
  }
  $('#sheet').addEventListener('click', e => {
    if (e.target.id === 'sheet' || e.target.closest('[data-close]')) closeSheet();
  });
  let modalResolve = null, modalLocked = false;
  function openModal(html, opts) {
    const el = $('#modal');
    el.innerHTML = html; el.classList.add('on');
    modalLocked = !!(opts && opts.locked);
    return new Promise(res => { modalResolve = res; });
  }
  function closeModal(v) {
    const el = $('#modal');
    if (!el.classList.contains('on')) return false;
    el.classList.remove('on'); el.innerHTML = '';
    const r = modalResolve; modalResolve = null; modalLocked = false; if (r) r(v);
    return true;
  }
  $('#modal').addEventListener('click', e => {
    const b = e.target.closest('[data-m]');
    if (b) { closeModal(b.dataset.m); return; }
    if (!modalLocked && (e.target.id === 'modal' || e.target.closest('.gcard'))) closeModal('tap');
  });

  // Android orqaga tugmasi
  window.onAndroidBack = function () {
    if ($('#modal').classList.contains('on')) { if (!modalLocked) closeModal('back'); return true; }
    if (closeSheet()) return true;
    const cur = $$('.screen').find(s => s.classList.contains('on'));
    if (!cur || cur.id === 'menu') return false;
    if (cur.id === 'game') { openGameMenu(); return true; }
    if (cur.id === 'online') { if (window.Online && Online.back) Online.back(); else show('menu'); return true; }
    show('menu'); return true;
  };

  // ---------------- Profilni tahrirlash ----------------
  function editProfile() {
    let tok = profile.token;
    const body = `<div class="sec-title" style="margin-top:0">Ismingiz</div>
      <div class="prow"><input id="pfName" maxlength="14" value="${esc(profile.name)}"></div>
      <div class="sec-title">Belgingiz</div>
      <div id="pfToks" style="display:flex;flex-wrap:wrap;gap:8px">${TOKENS.map(t => `<button class="tok" data-t="${t}" style="background:${t === tok ? '#F5C04A' : '#252C52'}">${t}</button>`).join('')}</div>`;
    const el = openSheet('Profil', body, `<button class="btn gold" id="pfSave">Saqlash</button>`);
    $('#pfToks', el).addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      tok = b.dataset.t;
      $$('#pfToks .tok', el).forEach(x => x.style.background = x.dataset.t === tok ? '#F5C04A' : '#252C52');
    });
    $('#pfSave', el).onclick = () => {
      const n = $('#pfName', el).value.trim().slice(0, 14);
      if (n) profile.name = n;
      profile.token = tok; store.set('tb_profile', profile);
      if (setupPlayers[0] && setupPlayers[0].type === 'human') { setupPlayers[0].name = profile.name; setupPlayers[0].token = profile.token; }
      closeSheet(); renderProfile();
    };
  }

  // ---------------- Yangi o'yin sozlamalari ----------------
  let setupPlayers = [];
  const setupOpts = { startMoney: 15000, maxRounds: 0, auction: true, jackpot: false };
  function defaultSetup() {
    const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
    setupPlayers = [{ name: profile.name, token: profile.token, type: 'human', level: 'medium' }];
    const used = [profile.token];
    for (let i = 0; i < 3; i++) {
      const t = TOKENS.find(x => !used.includes(x)); used.push(t);
      setupPlayers.push({ name: names[i], token: t, type: 'bot', level: 'medium' });
    }
  }
  function renderSetup() {
    $('#pcount').textContent = setupPlayers.length;
    $('#plist').innerHTML = setupPlayers.map((p, i) => `
      <div class="prow" data-i="${i}">
        <button class="tok" data-a="tok" style="background:${COLORS[i]}">${p.token}</button>
        <input data-a="name" maxlength="14" value="${esc(p.name)}">
        <div class="seg" data-a="type"><button data-v="human" class="${p.type === 'human' ? 'on' : ''}">Odam</button><button data-v="bot" class="${p.type === 'bot' ? 'on' : ''}">Bot</button></div>
        ${p.type === 'bot' ? `<div class="seg" data-i="${i}" data-a="level">${Object.keys(LEVELS).map(l => `<button data-v="${l}" class="${p.level === l ? 'on' : ''}">${LEVELS[l]}</button>`).join('')}</div>` : ''}
        ${setupPlayers.length > 2 ? `<button class="del" data-a="del">✕</button>` : ''}
      </div>`).join('');
    $('#addP').style.display = setupPlayers.length >= 6 ? 'none' : '';
  }
  $('#plist').addEventListener('click', e => {
    const row = e.target.closest('[data-i]'); if (!row) return;
    const i = +row.dataset.i, p = setupPlayers[i];
    const a = e.target.closest('[data-a]'); if (!a) return;
    Snd.play('click');
    if (a.dataset.a === 'tok') {
      const used = setupPlayers.map(x => x.token);
      let k = TOKENS.indexOf(p.token);
      for (let n = 0; n < TOKENS.length; n++) { k = (k + 1) % TOKENS.length; if (!used.includes(TOKENS[k])) break; }
      p.token = TOKENS[k]; renderSetup();
    } else if (a.dataset.a === 'type') {
      const b = e.target.closest('[data-v]'); if (!b) return;
      p.type = b.dataset.v;
      if (p.type === 'bot' && p.name === profile.name) p.name = BOT_NAMES.find(n => !setupPlayers.some(x => x.name === n)) || 'Bot';
      renderSetup();
    } else if (a.dataset.a === 'level') {
      const b = e.target.closest('[data-v]'); if (!b) return;
      p.level = b.dataset.v; renderSetup();
    } else if (a.dataset.a === 'del') { setupPlayers.splice(i, 1); renderSetup(); }
  });
  $('#plist').addEventListener('input', e => {
    const row = e.target.closest('[data-i]'); if (!row) return;
    setupPlayers[+row.dataset.i].name = e.target.value;
  });
  $('#addP').onclick = () => {
    if (setupPlayers.length >= 6) return;
    const used = setupPlayers.map(x => x.token);
    setupPlayers.push({ name: BOT_NAMES.find(n => !setupPlayers.some(x => x.name === n)) || 'Bot', token: TOKENS.find(t => !used.includes(t)), type: 'bot', level: 'medium' });
    renderSetup();
  };
  function bindSeg(id, key) {
    $(id).addEventListener('click', e => {
      const b = e.target.closest('[data-v]'); if (!b) return;
      $$(id + ' button').forEach(x => x.classList.toggle('on', x === b));
      setupOpts[key] = +b.dataset.v;
    });
  }
  bindSeg('#optMoney', 'startMoney'); bindSeg('#optRounds', 'maxRounds');
  function bindSwitch(id, key) { $(id).onclick = () => { setupOpts[key] = !setupOpts[key]; $(id).classList.toggle('on', setupOpts[key]); }; }
  bindSwitch('#optAuction', 'auction'); bindSwitch('#optJackpot', 'jackpot');
  $('#startGame').onclick = () => {
    const players = setupPlayers.map((p, i) => ({ name: (p.name || '').trim().slice(0, 14) || (p.type === 'bot' ? 'Bot' : 'O\'yinchi ' + (i + 1)), token: p.token, color: COLORS[i], type: p.type, level: p.level }));
    Snd.play('buy');
    startGame(E.newGame({ players, settings: { ...setupOpts } }), 'local', null);
  };

  // ---------------- Bosh menyu tugmalari ----------------
  $('#mNew').onclick = () => { Snd.play('click'); defaultSetup(); renderSetup(); show('setup'); };
  $('#mContinue').onclick = () => {
    const sv = store.get('tb_save', null);
    if (sv && sv.s) startGame(sv.s, 'local', null);
  };
  $('#mOnline').onclick = () => { Snd.play('click'); if (window.Online) Online.open(); };
  $('#mRules').onclick = () => showRules();
  $('#mSound').onclick = () => { Snd.on = !Snd.on; refreshMenu(); Snd.play('click'); };
  $('#profEdit').onclick = editProfile;
  $$('[data-back]').forEach(b => b.onclick = () => show(b.dataset.back));

  function showRules() {
    openSheet("O'yin qoidalari", `<div class="rules">
      <h4>Maqsad</h4><p>Toshkent ko'chalari va mahallalarini sotib oling, uy va mehmonxonalar quring, raqiblardan ijara oling. Oxirigacha bankrot bo'lmay qolgan o'yinchi g'olib bo'ladi.</p>
      <h4>Yurish</h4><p>Ikki zar tashlanadi. Dubl (ikkala zar bir xil) tushsa, yana bir marta tashlaysiz. Ketma-ket 3 ta dubl — qamoqqa!</p>
      <h4>Mulk</h4><p>Egasi yo'q mulkka tushsangiz, uni sotib olishingiz mumkin. Olmasangiz — auksionga chiqadi. Birovning mulkiga tushsangiz, ijara to'laysiz.</p>
      <h4>Uylar</h4><p>Bir rangdagi hamma mulk sizniki bo'lsa, ijara ikki baravar bo'ladi va u yerda uy qurish mumkin. 4 ta uydan keyin mehmonxona quriladi. Uylar teng quriladi.</p>
      <h4>Metro va kommunal</h4><p>Metro liniyalari: 1 ta — 250 ming, 2 ta — 500 ming, 3 ta — 1 mln, 4 ta — 2 mln. Elektr va suv: zar yig'indisi × 40 ming (ikkalasi bo'lsa × 100 ming).</p>
      <h4>Garov</h4><p>Pul kerak bo'lsa, mulkni garovga qo'yib yarim narxini olasiz. Garovdagi mulkdan ijara olinmaydi. Qaytarish uchun +10% to'lanadi.</p>
      <h4>Qamoq</h4><p>Qamoqdan chiqish: 500 ming jarima, ozodlik kartasi yoki dubl tashlash (3 urinish).</p>
      <h4>START</h4><p>START dan har o'tganingizda 2 mln so'm olasiz.</p>
      <h4>Savdo</h4><p>O'z navbatingizda boshqa o'yinchilarga mulk va pul almashishni taklif qilishingiz mumkin.</p>
      <h4>Bankrot</h4><p>Qarzni to'lay olmasangiz (uy sotib, garovga qo'yib ham), bankrot bo'lasiz va o'yindan chiqasiz.</p></div>`);
  }

  // ======================================================================
  //                           O'YIN BOSHQARUVCHISI
  // ======================================================================
  const G = { s: null, mode: 'local', myPid: null, busy: false, queue: [], shown: { money: [], pos: [], jail: [] }, botTimer: 0, geo: null, winShown: false };
  window.GameCtl = G;

  function startGame(state, mode, myPid) {
    G.s = state; G.mode = mode; G.myPid = myPid; G.queue = []; G.busy = false; G.winShown = false;
    clearTimeout(G.botTimer);
    syncShown();
    show('game');
    $('#onPill').style.display = mode === 'local' ? 'none' : '';
    requestAnimationFrame(() => { buildBoard(); renderAll(); schedule(); });
  }
  G.start = startGame;
  G.show = show; G.toast = toast; G.openSheet = openSheet; G.closeSheet = closeSheet; G.store = store; G.esc = esc;
  G.profile = () => profile; G.TOKENS = TOKENS; G.COLORS = COLORS; G.BOT_NAMES = BOT_NAMES; G.LEVELS = LEVELS;
  G.openModal = openModal; G.closeModal = closeModal;

  function syncShown() {
    const s = G.s;
    G.shown.money = s.players.map(p => p.money);
    G.shown.pos = s.players.map(p => p.pos);
    G.shown.jail = s.players.map(p => p.inJail);
  }
  function canControl(pid) {
    if (pid < 0 || !G.s) return false;
    const p = G.s.players[pid];
    if (!p || p.bankrupt) return false;
    if (G.mode === 'local') return p.type === 'human';
    return pid === G.myPid;
  }
  // Mulklarni boshqaradigan "men"
  function actorPid() {
    const s = G.s;
    if (G.mode !== 'local') return G.myPid;
    const w = E.awaiting(s);
    if (w >= 0 && canControl(w)) return w;
    if (canControl(s.turn)) return s.turn;
    const h = s.players.find(p => p.type === 'human' && !p.bankrupt);
    return h ? h.id : -1;
  }
  G.canControl = canControl;

  function send(pid, action) {
    if (G.busy && G.mode !== 'client') { return; }
    if (G.mode === 'client') { Online.sendAction(pid, action); return; }
    applyAction(pid, action);
  }
  G.send = send;
  function applyAction(pid, action) {
    const s = G.s;
    s.events = [];
    const err = E.act(s, pid, action);
    if (err) { s.events = []; if (canControl(pid)) { toast('⚠️ ' + esc(err)); Snd.play('bad'); } return err; }
    const evs = s.events; s.events = []; s.seq = (s.seq || 0) + 1;
    if (G.mode === 'local') saveGame();
    if (G.mode === 'host' && window.Online) Online.publish(s, evs);
    enqueue(evs);
    return null;
  }
  G.applyAction = applyAction;
  // Onlayn mijoz: yangi holat keldi
  G.remoteState = function (state, evs) {
    G.s = state;
    if (!evs) { G.queue = []; syncShown(); if (!G.busy) { renderAll(); schedule(); } return; }
    enqueue(evs);
  };
  function saveGame() {
    if (G.s.phase === 'gameover') store.del('tb_save');
    else store.set('tb_save', { s: G.s, t: Date.now() });
  }
  function enqueue(evs) { G.queue.push(evs); if (!G.busy) pump(); }
  async function pump() {
    G.busy = true; renderCenter();
    try {
      while (G.queue.length) { const evs = G.queue.shift(); await play(evs); }
    } catch (e) { console.error(e); }
    G.busy = false;
    syncShown(); renderAll(); schedule();
  }

  function schedule() {
    clearTimeout(G.botTimer);
    const s = G.s; if (!s || G.busy) return;
    if (s.phase === 'gameover') { if (!G.winShown) { G.winShown = true; setTimeout(showWinner, 600); } return; }
    if (G.mode === 'client') { maybeIncomingTrade(); return; }
    const pid = E.awaiting(s);
    const p = s.players[pid];
    if (!p) return;
    if (p.type === 'bot') {
      const a0 = window.Bot.decide(s, pid);
      let delay = 500;
      if (a0) {
        if (a0.a === 'roll') delay = 750; else if (a0.a === 'tradeReply') delay = 1300;
        else if (a0.a === 'bid' || a0.a === 'pass') delay = 650; else if (a0.a === 'buy' || a0.a === 'decline') delay = 800;
        else if (a0.a === 'endTurn') delay = 450; else delay = 380;
      }
      G.botTimer = setTimeout(() => botStep(pid), delay);
    } else {
      maybeIncomingTrade();
    }
  }
  function botStep(pid) {
    const s = G.s; if (G.busy || E.awaiting(s) !== pid) return;
    let a = window.Bot.decide(s, pid);
    if (a && a.a === 'tradeReply' && s.trade) {
      toast(`${esc(s.players[pid].name)} taklifni ${a.accept ? '<b style="color:#37CF86">qabul qildi</b> ✅' : '<b style="color:#F2656A">rad etdi</b> ❌'}`);
    }
    let err = a ? applyAction(pid, a) : 'no';
    if (err) {
      // Zaxira: bot tiqilib qolmasligi uchun
      const fallbacks = [{ a: 'endTurn' }, { a: 'roll' }, { a: 'pass' }, { a: 'decline' }, { a: 'pay' }, { a: 'bankrupt' }, { a: 'tradeReply', accept: false }];
      for (const f of fallbacks) { if (!applyAction(pid, f)) return; }
    }
  }
  G.schedule = schedule;

  // ---------------- Taxta geometriyasi ----------------
  function geom() {
    const wrap = $('.boardwrap');
    const maxW = Math.max(200, wrap.clientWidth - 4), maxH = Math.max(200, wrap.clientHeight - 4);
    // Taxta kvadrat emas — eniga (gorizontal) cho'zilgan, shunda ustki/pastki
    // qatordagi ko'chalar nomi katakka to'liq sig'adi.
    let By = Math.floor(Math.min(maxH, 1400));
    let Bx = Math.floor(Math.min(maxW, 1260, By * 1.8));
    if (Bx < By) Bx = By;
    const k = Math.min(Bx, By) * 0.175;
    const cx = (Bx - 2 * k) / 9, cy = (By - 2 * k) / 9;
    const c = Math.min(cx, cy);
    return { Bx, By, k, cx, cy, c };
  }
  function cellRect(i, g) {
    const { Bx, By, k, cx, cy } = g;
    if (i === 0) return { x: Bx - k, y: By - k, w: k, h: k, side: 'c' };
    if (i < 10) return { x: Bx - k - i * cx, y: By - k, w: cx, h: k, side: 'b' };
    if (i === 10) return { x: 0, y: By - k, w: k, h: k, side: 'c' };
    if (i < 20) return { x: 0, y: By - k - (i - 10) * cy, w: k, h: cy, side: 'l' };
    if (i === 20) return { x: 0, y: 0, w: k, h: k, side: 'c' };
    if (i < 30) return { x: k + (i - 21) * cx, y: 0, w: cx, h: k, side: 't' };
    if (i === 30) return { x: Bx - k, y: 0, w: k, h: k, side: 'c' };
    return { x: Bx - k, y: k + (i - 31) * cy, w: k, h: cy, side: 'r' };
  }

  const ICON = {
    metro: (s) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><circle cx="12" cy="12" r="11" fill="#1F5FBF"/><path d="M5.5 17V7.5h2.2L12 13l4.3-5.5h2.2V17h-2.3v-5.6L12 16.3l-4.2-4.9V17z" fill="#fff"/></svg>`,
    omad: (s) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><circle cx="12" cy="12" r="11" fill="#F28C1E"/><text x="12" y="17.5" font-size="16" font-weight="900" text-anchor="middle" fill="#fff" font-family="Arial">?</text></svg>`,
    mahalla: (s) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><rect x="2" y="7" width="20" height="14" rx="2.5" fill="#2E6BD8"/><path d="M2 11h20" stroke="#fff" stroke-width="1.6"/><rect x="9.5" y="9" width="5" height="5" rx="1" fill="#F5C04A"/><path d="M5 7l3-4h8l3 4" fill="#4A86EE"/></svg>`,
    bolt: (s) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><circle cx="12" cy="12" r="11" fill="#FFD23F"/><path d="M13.5 3L6 13.5h5L9.5 21 18 10h-5z" fill="#3A2A00"/></svg>`,
    drop: (s) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><circle cx="12" cy="12" r="11" fill="#2EA3E6"/><path d="M12 4.5s-5.5 6.2-5.5 9.8a5.5 5.5 0 0 0 11 0C17.5 10.7 12 4.5 12 4.5z" fill="#fff"/></svg>`,
    tax: (s) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><circle cx="12" cy="12" r="11" fill="#6B5B3E"/><text x="12" y="16.8" font-size="12" font-weight="900" text-anchor="middle" fill="#FFE39A" font-family="Arial">%</text></svg>`,
    lux: (s) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><circle cx="12" cy="12" r="11" fill="#7B3FA0"/><path d="M6 10l3-4h6l3 4-6 8z" fill="#E6D1FF"/><path d="M6 10h12M9 6l3 12 3-12" stroke="#7B3FA0" stroke-width=".8" fill="none"/></svg>`,
  };

  function buildBoard() {
    const g = geom(); G.geo = g;
    const board = $('#board');
    board.style.width = g.Bx + 'px'; board.style.height = g.By + 'px';
    let html = '';
    for (let i = 0; i < 40; i++) {
      const r = cellRect(i, g);
      html += `<div class="cell${r.side === 'c' ? ' corner' : ''}" id="c${i}" data-i="${i}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px"></div>`;
    }
    const csW = g.Bx - 2 * g.k, csH = g.By - 2 * g.k;
    html += `<div id="center" style="left:${g.k}px;top:${g.k}px;width:${csW}px;height:${csH}px;padding:${g.cy * 0.35}px ${g.cx * 0.4}px">
      <svg class="ornament" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><defs><pattern id="orn" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M10 0l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="none" stroke="#7A5A12" stroke-width=".7"/><circle cx="10" cy="10" r="2" fill="none" stroke="#7A5A12" stroke-width=".5"/></pattern></defs>
      <rect width="100" height="100" fill="url(#orn)"/></svg>
      <div class="ctitle" style="font-size:${g.c * 0.62}px"><small>TOSHKENT</small>BIZNES</div>
      <div class="dice" style="--ds:${Math.round(g.c * 1.05)}px"><div class="die" id="d1"></div><div class="die red" id="d2"></div></div>
      <div class="cstatus" id="cstatus" style="font-size:${Math.max(11, g.c * 0.38)}px"></div>
      <div class="cactions" id="cact"></div></div>`;
    s_tokens(html);
    function s_tokens(h) {
      board.innerHTML = h + G.s.players.map(p => `<div class="token" id="t${p.id}" style="background:${p.color};width:${g.c * 0.62}px;height:${g.c * 0.62}px;font-size:${g.c * 0.38}px">${p.token}</div>`).join('');
    }
    for (let i = 0; i < 40; i++) renderCell(i);
    drawDie($('#d1'), G.s.dice[0]); drawDie($('#d2'), G.s.dice[1]);
    placeTokens(false);
  }
  $('#board').addEventListener('click', e => {
    const c = e.target.closest('.cell');
    if (c) { Snd.play('click'); showDeed(+c.dataset.i); return; }
    const t = e.target.closest('.token');
    if (t) showPlayer(+t.id.slice(1));
  });
  window.addEventListener('resize', () => { if ($('#game').classList.contains('on') && G.s) { buildBoard(); renderAll(); } });

  function renderCell(i) {
    const el = $('#c' + i); if (!el) return;
    const g = G.geo, r = cellRect(i, g), cell = C[i], s = G.s;
    const { c } = g;
    const fs = c * 0.2, pfs = c * 0.18;
    const pr = s.props[i];
    let h = '';
    el.classList.toggle('mort', !!(pr && pr.mortgaged));
    el.style.background = '';
    if (r.side === 'c') {
      const k = g.k;
      if (i === 0) h = `<div class="nm" style="inset:0;font-size:${k * 0.2}px;color:#B3261E"><div style="font-size:${k * 0.12}px;color:#3A3122">+2 mln</div>START<svg width="${k * 0.55}" height="${k * 0.22}" viewBox="0 0 50 20"><path d="M48 10H6M14 2L4 10l10 8" stroke="#B3261E" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
      else if (i === 10) h = `<div style="position:absolute;right:0;top:0;width:${k * 0.68}px;height:${k * 0.68}px;background:#F28C1E;border-left:1px solid #9B5A12;border-bottom:1px solid #9B5A12;display:flex;align-items:center;justify-content:center">
          <div style="position:absolute;inset:14% 12%;background:repeating-linear-gradient(90deg,#3A3122 0 2px,transparent 2px ${k * 0.1}px)"></div>
          <div style="position:relative;background:#F28C1E;font-weight:900;font-size:${k * 0.13}px;color:#fff;padding:0 2px;border-radius:2px">QAMOQ</div></div>
          <div class="nm" style="left:0;bottom:0;width:100%;height:${k * 0.32}px;font-size:${k * 0.13}px">Mehmon</div>`;
      else if (i === 20) h = `<div class="nm" style="inset:0;font-size:${k * 0.135}px"><div class="ic" style="font-size:${k * 0.38}px">☕</div>Choyxona${s.settings.jackpot ? `<div style="font-size:${k * 0.12}px;color:#1E7A45">${fmt(s.pot)}</div>` : ''}</div>`;
      else if (i === 30) h = `<div class="nm" style="inset:0;font-size:${k * 0.135}px;color:#1F3F8F"><div class="ic" style="font-size:${k * 0.38}px">👮</div>Qamoqqa!</div>`;
      el.innerHTML = h; return;
    }
    // Chiziq (band) va nom maydoni joylashuvi
    const horiz = r.side === 'b' || r.side === 't';
    const bandT = (horiz ? r.h : r.w) * 0.26;
    let band = '', nameBox = '', own = '';
    const bandPos = { b: `left:0;top:0;width:100%;height:${bandT}px`, t: `left:0;bottom:0;width:100%;height:${bandT}px`,
      l: `right:0;top:0;height:100%;width:${bandT}px;flex-direction:column`, r: `left:0;top:0;height:100%;width:${bandT}px;flex-direction:column` }[r.side];
    const namePos = { b: `left:1px;right:1px;top:${bandT}px;bottom:3px`, t: `left:1px;right:1px;top:3px;bottom:${bandT}px`,
      l: `left:3px;top:1px;bottom:1px;right:${bandT}px`, r: `right:3px;top:1px;bottom:1px;left:${bandT}px` }[r.side];
    const owned = pr && pr.owner >= 0;
    const oc = owned ? s.players[pr.owner].color : '';
    const ownedStyle = owned ? `background:${oc};color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.45)` : '';
    if (cell.t === 'street') {
      let houses = '';
      if (pr.houses === 5) houses = `<div class="hotel" style="${horiz ? '' : 'width:64%;height:60%'}"></div>`;
      else for (let n = 0; n < pr.houses; n++) houses += `<div class="hs" style="width:${bandT * 0.52}px;height:${bandT * 0.52}px"></div>`;
      band = `<div class="band" style="${bandPos};background:${GR[cell.g].color}">${houses}</div>`;
      nameBox = `<div class="nm" style="${namePos};font-size:${fs}px;${ownedStyle}">${SHORT[i] || cell.name}<div class="pr" style="font-size:${pfs}px">${priceShort(cell.price)}</div></div>`;
    } else {
      let ic = '';
      const is = c * 0.5;
      if (cell.t === 'metro') ic = ICON.metro(is);
      else if (cell.t === 'omad') ic = ICON.omad(is);
      else if (cell.t === 'mahalla') ic = ICON.mahalla(is);
      else if (cell.t === 'util') ic = ICON[cell.icon](is);
      else if (cell.t === 'tax') ic = i === 4 ? ICON.tax(is) : ICON.lux(is);
      const sub = cell.price ? priceShort(cell.price) : cell.t === 'tax' ? '-' + priceShort(cell.amount) : '';
      nameBox = `<div class="nm" style="inset:2px;font-size:${fs * 0.95}px;${ownedStyle}">${ic}<div style="margin-top:1px">${SHORT[i] || cell.name}</div>${sub ? `<div class="pr" style="font-size:${pfs}px">${sub}</div>` : ''}</div>`;
    }
    el.innerHTML = band + nameBox + own;
    fitCellLabel(el.querySelector('.nm'));
  }
  // Ba'zi qurilmalarda matn o'lchash boshqacha ishlaydi (WebView vs brauzer),
  // shuning uchun nom katakka sig'maganda shrift o'lchamini avtomatik kichraytiramiz —
  // hisob-kitobga emas, haqiqiy o'lchamga tayanamiz.
  function fitCellLabel(el) {
    if (!el) return;
    const pr = el.querySelector('.pr');
    const baseFs = parseFloat(el.style.fontSize) || parseFloat(getComputedStyle(el).fontSize);
    const basePfs = pr ? (parseFloat(pr.style.fontSize) || parseFloat(getComputedStyle(pr).fontSize)) : 0;
    let scale = 1, guard = 0;
    while (guard++ < 16 && scale > 0.45 && (el.scrollHeight > el.clientHeight + 0.5 || el.scrollWidth > el.clientWidth + 0.5)) {
      scale -= 0.06;
      el.style.fontSize = Math.max(7, baseFs * scale) + 'px';
      if (pr) pr.style.fontSize = Math.max(6, basePfs * scale) + 'px';
    }
  }
  function priceShort(v) { return v >= 1000 ? (v / 1000).toString().replace('.', ',') + 'm' : v + 'k'; }

  function drawDie(el, n) {
    const P = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[26, 26], [50, 50], [74, 74]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]],
      5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]], 6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]] }[n] || [];
    el.innerHTML = P.map(([x, y]) => `<i style="left:${x}%;top:${y}%"></i>`).join('');
  }

  function tokenXY(pid) {
    const g = G.geo, s = G.s;
    const pos = G.shown.pos[pid];
    const r = cellRect(pos, g);
    const same = s.players.filter(p => !p.bankrupt && G.shown.pos[p.id] === pos && (pos !== 10 || !!G.shown.jail[p.id] === !!G.shown.jail[pid]));
    const idx = same.findIndex(p => p.id === pid), n = same.length;
    let cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    if (pos === 10) {
      if (G.shown.jail[pid]) { cx = r.x + r.w * 0.66; cy = r.y + r.h * 0.34; }
      else { cx = r.x + r.w * 0.22; cy = r.y + r.h * 0.8; }
    } else if (r.side === 'b') cy = r.y + r.h * 0.6;
    else if (r.side === 't') cy = r.y + r.h * 0.4;
    else if (r.side === 'l') cx = r.x + r.w * 0.4;
    else if (r.side === 'r') cx = r.x + r.w * 0.6;
    const ts = g.c * 0.62;
    if (n > 1) {
      const rad = g.c * (n > 3 ? 0.36 : 0.26);
      const ang = (idx / n) * Math.PI * 2 - Math.PI / 2;
      cx += Math.cos(ang) * rad; cy += Math.sin(ang) * rad;
    }
    return { x: cx - ts / 2, y: cy - ts / 2 };
  }
  function placeTokens(animate) {
    const s = G.s;
    s.players.forEach(p => {
      const t = $('#t' + p.id); if (!t) return;
      t.style.display = p.bankrupt ? 'none' : '';
      if (!animate) t.style.transition = 'none';
      const { x, y } = tokenXY(p.id);
      t.style.left = x + 'px'; t.style.top = y + 'px';
      t.classList.toggle('active', s.turn === p.id && s.phase !== 'gameover');
      if (!animate) { void t.offsetWidth; t.style.transition = ''; }
    });
  }

  // ---------------- Animatsiyalar ----------------
  async function animDice(d, extra) {
    const d1 = $('#d1'), d2 = $('#d2'); if (!d1) return;
    Snd.play('dice');
    for (let n = 0; n < 5; n++) { drawDie(d1, 1 + Math.floor(Math.random() * 6)); drawDie(d2, 1 + Math.floor(Math.random() * 6)); await sleep(70); }
    d1.classList.remove('roll'); d2.classList.remove('roll'); void d1.offsetWidth;
    d1.classList.add('roll'); d2.classList.add('roll');
    drawDie(d1, d[0]); drawDie(d2, d[1]);
    setStatus(`<span>🎲 ${d[0]} + ${d[1]} = <b>${d[0] + d[1]}</b>${d[0] === d[1] && !extra ? ' — <b style="color:#B3261E">DUBL!</b>' : ''}</span>`);
    await sleep(420);
  }
  async function animMove(pid, from, steps) {
    const n = Math.abs(steps), dir = steps > 0 ? 1 : -1;
    const per = n > 14 ? Math.max(45, 1400 / n) : 135;
    const t = $('#t' + pid);
    G.shown.jail[pid] = false;
    zoomToPath(from, dir, n);
    await sleep(280);
    for (let k = 1; k <= n; k++) {
      G.shown.pos[pid] = (from + dir * k + 40) % 40;
      placeTokensFor(pid);
      if (t) { t.classList.remove('hop'); void t.offsetWidth; t.classList.add('hop'); }
      Snd.play('step');
      await sleep(per);
    }
    placeTokens(true);
    await sleep(550);
    zoomReset();
    await sleep(320);
  }
  // Kamerani zar tashlangan yo'l (boshlanish -> tugash katagi) ko'rinadigan qilib yaqinlashtiradi,
  // lekin haddan tashqari emas — yurish yo'li ko'rinib turishi kerak.
  function zoomToPath(from, dir, n) {
    const g = G.geo, board = $('#board'); if (!g || !board) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let k = 0; k <= n; k++) {
      const pos = (from + dir * k + 4000) % 40;
      const r = cellRect(pos, g);
      minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x + r.w);
      minY = Math.min(minY, r.y); maxY = Math.max(maxY, r.y + r.h);
    }
    const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
    const pad = g.c * 1.6;
    const bw = (maxX - minX) + pad * 2, bh = (maxY - minY) + pad * 2;
    let s = Math.min(g.Bx / bw, g.By / bh);
    s = Math.max(1.3, Math.min(s, 2.1));
    const cxCenter = g.Bx / 2, cyCenter = g.By / 2;
    const tx = cxCenter / s - midX, ty = cyCenter / s - midY;
    board.style.transform = `scale(${s}) translate(${tx}px, ${ty}px)`;
  }
  function zoomReset() {
    const board = $('#board'); if (board) board.style.transform = '';
  }
  function placeTokensFor(pid) {
    const t = $('#t' + pid); if (!t) return;
    const { x, y } = tokenXY(pid);
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  async function animJail(pid) {
    Snd.play('jail');
    G.shown.pos[pid] = 10; G.shown.jail[pid] = true;
    const t = $('#t' + pid);
    if (t) t.style.transition = 'left .5s ease-in-out, top .5s ease-in-out';
    placeTokens(true);
    await sleep(600);
    if (t) t.style.transition = '';
  }
  function floatMoney(pid, delta) {
    const chip = $(`.pchip[data-p="${pid}"]`); if (!chip) return;
    const f = document.createElement('div');
    f.className = 'fl';
    f.style.color = delta >= 0 ? '#37CF86' : '#FF6B6B';
    f.textContent = (delta >= 0 ? '+' : '') + fmt(delta);
    chip.appendChild(f);
    setTimeout(() => f.remove(), 1500);
  }
  async function showCardEv(e) {
    Snd.play('card');
    const p = G.s.players[e.pid];
    const mine = canControl(e.pid);
    const html = `<div class="gcard ${e.deck}"><div class="ct">${e.deck === 'omad' ? 'OMAD' : 'MAHALLA'}</div>
      <div class="ci">${e.deck === 'omad' ? '🍀' : '🏘️'}</div><div class="tx">${esc(e.text)}</div>
      <div class="who">${esc(p.name)} • bosing</div></div>`;
    const pr = openModal(html);
    const timer = setTimeout(() => closeModal('auto'), mine ? 6000 : 2600);
    await pr; clearTimeout(timer);
  }

  async function play(evs) {
    for (let idx = 0; idx < evs.length; idx++) {
      const e = evs[idx];
      switch (e.k) {
        case 'dice': await animDice(e.d, e.extra); break;
        case 'move': await animMove(e.pid, e.from, e.steps); break;
        case 'jail': await animJail(e.pid); break;
        case 'free': G.shown.jail[e.pid] = false; placeTokens(true); break;
        case 'money': {
          const next = evs[idx + 1];
          const isRentPair = e.reason === 'rent' && e.delta < 0 && next && next.k === 'money' &&
            next.reason === 'rent' && next.delta === -e.delta;
          if (isRentPair) {
            await flyMoney(e.pid, next.pid, -e.delta);
            if (G.shown.money[e.pid] !== undefined) G.shown.money[e.pid] += e.delta;
            if (G.shown.money[next.pid] !== undefined) G.shown.money[next.pid] += next.delta;
            floatMoney(e.pid, e.delta); floatMoney(next.pid, next.delta); renderChips();
            Snd.play('pay');
            await sleep(300);
            idx++; // ikkinchi (qabul qiluvchi) hodisa allaqachon ishlandi
          } else {
            if (G.shown.money[e.pid] !== undefined) G.shown.money[e.pid] += e.delta;
            floatMoney(e.pid, e.delta); renderChips();
            if (e.delta > 0) Snd.play('coin'); else if (e.reason === 'rent' || e.reason === 'tax' || e.reason === 'card') Snd.play('pay');
            await sleep(e.reason === 'rent' || e.reason === 'go' ? 380 : 140);
          }
          break;
        }
        case 'pot': renderCell(20); renderTop(); break;
        case 'card': await showCardEv(e); break;
        case 'buy': { renderCell(e.cell); const el = $('#c' + e.cell); if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } Snd.play('buy'); await sleep(350); break; }
        case 'build': renderCell(e.cell); Snd.play('build'); await sleep(160); break;
        case 'bankrupt': toast(`💥 <b>${esc(G.s.players[e.pid].name)}</b> bankrot bo'ldi!`, 3000); Snd.play('bad'); renderAllCells(); await sleep(700); break;
        case 'turn': await turnBanner(e.pid); break;
        case 'auction': toast(`🔨 Auksion: <b>${esc(C[e.cell].name)}</b>`); await sleep(300); break;
        case 'bid': setStatus(`${esc(G.s.players[e.pid].name)}: ${fmt(e.amount)}`); Snd.play('click'); await sleep(150); break;
        case 'passbid': break;
        case 'tradeOffer': if (!canControl(e.to)) toast(`🤝 ${esc(G.s.players[e.from].name)} → ${esc(G.s.players[e.to].name)}: savdo taklifi`); break;
        case 'tradeResult':
          if (canControl(e.from) && G.s.players[e.to].type !== 'bot') toast(e.ok ? `✅ ${esc(G.s.players[e.to].name)} savdoni qabul qildi` : `❌ ${esc(G.s.players[e.to].name)} savdoni rad etdi`);
          if (e.ok) { renderAllCells(); Snd.play('buy'); }
          break;
        case 'win': Snd.play('win'); break;
        case 'log': setStatus(esc(e.text)); break;
      }
    }
  }

  // Kimning navbati ekanligini 2 soniya davomida yorqin ko'rsatib turadi,
  // shundan keyingina zar tashlash mumkin bo'ladi.
  async function turnBanner(pid) {
    Snd.play('turn');
    const p = G.s && G.s.players[pid];
    const host = $('#center');
    if (!p || !host) { await sleep(2000); return; }
    const cact = $('#cact'); if (cact) cact.innerHTML = '';
    setStatus('');
    const el = document.createElement('div');
    el.className = 'turnbanner';
    const fs = Math.max(14, (G.geo ? G.geo.c : 40) * 0.5);
    el.style.fontSize = fs + 'px';
    el.innerHTML = `<span class="dot" style="background:${p.color}"></span>${esc(p.name)} navbati!`;
    host.appendChild(el);
    await sleep(2000);
    el.remove();
  }

  // Pulni to'lovchidan qabul qiluvchiga "uchib boradigan" animatsiya bilan ko'rsatadi (ijara va h.k.).
  function flyMoney(fromPid, toPid, amount) {
    return new Promise(resolve => {
      const fromEl = document.querySelector(`.pchip[data-p="${fromPid}"]`);
      const toEl = document.querySelector(`.pchip[data-p="${toPid}"]`);
      if (!fromEl || !toEl) { resolve(); return; }
      Snd.play('coin');
      fromEl.classList.add('pay-out'); toEl.classList.add('pay-in');
      const fr = fromEl.getBoundingClientRect(), tr = toEl.getBoundingClientRect();
      const el = document.createElement('div');
      el.className = 'moneyfly';
      el.textContent = '💸 ' + fmt(amount);
      el.style.left = (fr.left + fr.width / 2) + 'px';
      el.style.top = (fr.top + fr.height / 2) + 'px';
      document.body.appendChild(el);
      const dx = (tr.left + tr.width / 2) - (fr.left + fr.width / 2);
      const dy = (tr.top + tr.height / 2) - (fr.top + fr.height / 2);
      requestAnimationFrame(() => {
        el.style.transform = `translate(${dx}px, ${dy}px) scale(.7)`;
        el.style.opacity = '0';
      });
      setTimeout(() => {
        el.remove(); fromEl.classList.remove('pay-out'); toEl.classList.remove('pay-in');
        resolve();
      }, 650);
    });
  }
  function setStatus(html) { const el = $('#cstatus'); if (el) el.innerHTML = `<span>${html}</span>`; }

  // ---------------- Chizish ----------------
  function renderAllCells() { for (let i = 0; i < 40; i++) renderCell(i); }
  function renderAll() {
    if (!G.s || !$('#c0')) return;
    renderAllCells(); placeTokens(true); renderChips(); renderTop(); renderCenter();
  }
  function renderTop() {
    const s = G.s;
    $('#roundPill').innerHTML = `Raund <b>${s.round || 1}${s.settings.maxRounds ? '/' + s.settings.maxRounds : ''}</b>`;
    $('#potPill').style.display = s.settings.jackpot ? '' : 'none';
    $('#potPill').innerHTML = `☕ <b>${fmt(s.pot)}</b>`;
    const tb = $('#bTrade'); tb.disabled = !canTradeNow();
  }
  function renderChips() {
    const s = G.s;
    const pl = $('#players');
    pl.style.gridTemplateColumns = `repeat(${s.players.length === 4 ? 2 : Math.min(3, s.players.length)}, 1fr)`;
    pl.innerHTML = s.players.map(p => `
      <div class="pchip${s.turn === p.id && s.phase !== 'gameover' ? ' cur' : ''}${p.bankrupt ? ' out' : ''}" data-p="${p.id}" style="background:linear-gradient(160deg, rgba(255,255,255,.22), rgba(0,0,0,.16)), ${p.color}">
        <div class="tok" style="background:${p.color}">${p.token}</div>
        <div style="min-width:0"><div class="n">${esc(p.name)}${G.mode !== 'local' && p.id === G.myPid ? ' (siz)' : ''}</div>
        <div class="m">${p.bankrupt ? 'Bankrot' : fmt(G.shown.money[p.id] ?? p.money)}</div></div>
        ${p.inJail && !p.bankrupt ? '<div class="jl">🔒</div>' : ''}${p.type === 'bot' ? '<div class="jl" style="left:-4px;right:auto">🤖</div>' : ''}
      </div>`).join('');
  }
  $('#players').addEventListener('click', e => { const c = e.target.closest('.pchip'); if (c) showPlayer(+c.dataset.p); });

  function renderCenter() {
    const s = G.s, box = $('#cact'); if (!box || !s) return;
    const d1 = $('#d1'), d2 = $('#d2');
    if (G.busy) { box.innerHTML = ''; return; }
    if (d1 && !d1.classList.contains('roll')) { drawDie(d1, s.dice[0]); drawDie(d2, s.dice[1]); }
    const w = E.awaiting(s);
    const P = s.players[w];
    const me = canControl(w);
    let st = '', h = '';
    const nm = P ? esc(P.name) : '';
    const you = G.mode === 'local' && s.players.filter(p => p.type === 'human').length > 1 ? `<b>${nm}</b>, ` : '';
    if (s.phase === 'gameover') { st = `🏆 <b>${esc(s.players[s.winner].name)}</b> g'olib!`; h = `<button class="btn gold" data-act="menu">Bosh menyu</button>`; }
    else if (s.trade) {
      const t = s.trade;
      if (canControl(t.to)) { st = `🤝 ${esc(s.players[t.from].name)} sizga savdo taklif qildi`; h = `<button class="btn gold" data-act="seeTrade">Taklifni ko'rish</button>`; }
      else if (canControl(t.from)) { st = `🤝 ${esc(s.players[t.to].name)} javobi kutilmoqda...`; h = `<button class="btn ghost" style="color:#3A3122;border-color:#C9B994" data-act="cancelTrade">Taklifni qaytarish</button>`; }
      else st = `🤝 ${esc(s.players[t.to].name)} savdo taklifini ko'rib chiqmoqda...`;
    } else if (!me) {
      const why = { roll: 'zar tashlamoqda', buy: "o'ylamoqda", auction: 'auksionda', debt: "qarzni hal qilmoqda", end: 'yurishni tugatmoqda' }[s.phase] || "o'ylamoqda";
      st = `${P && P.type === 'bot' ? '🤖' : '⏳'} <b>${nm}</b> ${why}...`;
      if (s.phase === 'auction') st = auctionInfo(s) + `<br><small>Navbat: ${nm}</small>`;
    } else {
      switch (s.phase) {
        case 'roll':
          if (P.inJail) {
            st = `🔒 ${you}siz qamoqdasiz (${P.jailTurns + 1}/3-urinish)`;
            h = `<button class="btn gold" data-act="roll">🎲 Dubl uchun tashlash</button><div class="row">
              <button class="btn green" data-act="payJail" ${P.money < E.JAIL_FINE ? 'disabled' : ''}>Jarima ${fmt(E.JAIL_FINE)}</button>
              ${P.jailCards.length ? `<button class="btn blue" data-act="useCard">🎫 Karta</button>` : ''}</div>`;
          } else {
            st = s.rollAgain || P.doubles > 0 ? `🎉 ${you}dubl! Yana tashlang` : `${you}navbat sizda!`;
            h = `<button class="btn gold" data-act="roll" style="min-height:48px;font-size:17px">🎲 Zar tashlash</button>`;
          }
          break;
        case 'buy': {
          const i = s.pendingBuy, c = C[i];
          const col = c.t === 'street' ? GR[c.g].color : c.t === 'metro' ? '#1F5FBF' : '#3A3122';
          st = '';
          h = `<div class="minideed" data-act="deed" data-cell="${i}"><div class="h" style="background:${col}">${esc(c.name)}</div>
            <div class="b">Narxi: <b>${fmt(c.price)}</b> · Pulingiz: ${fmt(P.money)}</div></div>
            <div class="row"><button class="btn green" data-act="buy" ${P.money < c.price ? 'disabled' : ''}>Sotib olish</button>
            <button class="btn red" data-act="decline">${s.settings.auction ? 'Auksion' : 'Kerak emas'}</button></div>`;
          if (P.money < c.price) st = `<small>Pul yetmaydi — garovga qo'yishingiz mumkin</small>`;
          break;
        }
        case 'auction': {
          const a = s.auction;
          st = auctionInfo(s);
          const inc = [50, 100, 500].filter(x => a.bid + x <= P.money);
          const first = a.bid === 0 ? Math.round(C[a.cell].price * 0.1 / 10) * 10 || 10 : 0;
          h = `<div class="row">${inc.map(x => `<button class="btn green" data-act="bid" data-v="${Math.max(a.bid + x, first)}">+${x}k</button>`).join('')}</div>
            <button class="btn red" data-act="pass">Pas (chiqish)</button>`;
          break;
        }
        case 'debt': {
          const d = s.debts[0];
          const to = d.to >= 0 ? esc(s.players[d.to].name) + 'ga' : 'bankka';
          st = `⚠️ ${you}${to} <b>${fmt(d.amount)}</b> to'lashingiz kerak`;
          h = `<div class="row"><button class="btn green" data-act="pay" ${P.money < d.amount ? 'disabled' : ''}>To'lash</button>
            <button class="btn blue" data-act="props">🏠 Mulklar</button></div>
            <button class="btn red" data-act="bankrupt">Bankrot bo'lish</button>`;
          break;
        }
        case 'end':
          st = `${you}yurishni tugating yoki mulklarni boshqaring`;
          h = `<button class="btn gold" data-act="endTurn" style="min-height:48px;font-size:16px">Navbatni tugatish ▶</button>`;
          break;
      }
    }
    if (st) setStatus(st);
    box.innerHTML = h;
  }
  function auctionInfo(s) {
    const a = s.auction; if (!a) return '';
    return `🔨 <b>${esc(C[a.cell].name)}</b><br>Narx: <b style="color:#1E7A45">${a.bid ? fmt(a.bid) : '—'}</b>${a.leader >= 0 ? ' (' + esc(s.players[a.leader].name) + ')' : ''}`;
  }
  $('#board').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    e.stopPropagation();
    const s = G.s, act = b.dataset.act;
    Snd.play('click');
    const w = E.awaiting(s);
    switch (act) {
      case 'menu': show('menu'); return;
      case 'seeTrade': maybeIncomingTrade(true); return;
      case 'cancelTrade': send(s.trade.from, { a: 'cancelTrade' }); return;
      case 'deed': showDeed(+b.dataset.cell); return;
      case 'props': openProps(); return;
      case 'bid': send(w, { a: 'bid', amount: +b.dataset.v }); return;
      case 'bankrupt':
        openModal(`<div class="winbox"><div class="cup">💥</div><h2>Bankrot bo'lasizmi?</h2><p style="color:#9AA3C7">Barcha mulkingiz qarz egasiga o'tadi va o'yindan chiqasiz.</p>
          <div style="display:flex;gap:8px"><button class="btn ghost" style="flex:1" data-m="no">Yo'q</button><button class="btn red" style="flex:1" data-m="yes">Ha</button></div></div>`, { locked: true })
          .then(v => { if (v === 'yes') send(w, { a: 'bankrupt' }); });
        return;
      default: send(w, { a: act });
    }
  }, true);

  // ---------------- Mulk kartasi ----------------
  function showDeed(i) {
    const c = C[i], s = G.s, pr = s.props[i];
    if (!c.price) {
      const info = { go: "Har o'tganingizda 2 mln so'm olasiz.", jail: "Qamoqqa tushganlar shu yerda o'tiradi. Shunchaki tushsangiz — mehmonsiz.",
        parking: s.settings.jackpot ? `Choyxona xazinasi: ${fmt(s.pot)}. Bu yerga tushgan o'yinchi hammasini oladi.` : 'Dam olish joyi. Hech narsa bo\'lmaydi.',
        gotojail: "Bu yerga tushsangiz, to'g'ri qamoqqa ketasiz!", tax: `Soliq: ${fmt(c.amount || 0)} to'laysiz.`,
        omad: 'Omad kartasini olasiz — nima chiqishini bilmaysiz!', mahalla: 'Mahalla kartasi — sovg\'a yoki xarajat.' }[c.t];
      openSheet(esc(c.name), `<div class="hint" style="font-size:15px">${info}</div>`);
      return;
    }
    const col = c.t === 'street' ? GR[c.g].color : c.t === 'metro' ? '#1F5FBF' : '#555';
    let rows = '';
    if (c.t === 'street') {
      const set = pr.owner >= 0 && E.ownsGroup(s, pr.owner, c.g);
      const labels = ['Ijara', '1 uy bilan', '2 uy bilan', '3 uy bilan', '4 uy bilan', 'Mehmonxona'];
      rows += `<tr class="${pr.houses === 0 && !set ? 'hl' : ''}"><td>Ijara</td><td>${fmt(c.rent[0])}</td></tr>`;
      rows += `<tr class="${pr.houses === 0 && set ? 'hl' : ''}"><td>To'liq rang bilan</td><td>${fmt(c.rent[0] * 2)}</td></tr>`;
      for (let n = 1; n <= 5; n++) rows += `<tr class="${pr.houses === n ? 'hl' : ''}"><td>${labels[n]}</td><td>${fmt(c.rent[n])}</td></tr>`;
      rows += `<tr><td>Uy narxi</td><td>${fmt(GR[c.g].house)}</td></tr>`;
    } else if (c.t === 'metro') {
      [1, 2, 3, 4].forEach(n => rows += `<tr><td>${n} ta liniya</td><td>${fmt(250 * Math.pow(2, n - 1))}</td></tr>`);
    } else {
      rows += `<tr><td>1 ta kommunal</td><td>zar × 40 ming</td></tr><tr><td>Ikkalasi</td><td>zar × 100 ming</td></tr>`;
    }
    rows += `<tr><td>Garov qiymati</td><td>${fmt(c.price / 2)}</td></tr>`;
    const owner = pr.owner >= 0 ? s.players[pr.owner] : null;
    const kind = c.t === 'street' ? GR[c.g].name.toUpperCase() : c.t === 'metro' ? 'METRO' : 'KOMMUNAL';
    const body = `<div class="deed"><div class="h" style="background:${col}"><div class="k">${kind}</div><div class="t">${esc(c.name)}</div><div>${fmt(c.price)}</div></div>
      <table>${rows}</table><div class="note">Egasi: <b>${owner ? esc(owner.name) : 'Bank (sotuvda)'}</b>${pr.mortgaged ? ' · <b style="color:#C62828">Garovda</b>' : ''}${pr.houses ? ` · ${pr.houses === 5 ? 'Mehmonxona' : pr.houses + ' ta uy'}` : ''}</div></div>`;
    const me = actorPid();
    let foot = '';
    if (owner && owner.id === me && canManageNow(me)) foot = manageButtons(i, me, true);
    const el = openSheet('Mulk', body, foot);
    bindManage(el, () => showDeed(i));
  }

  function canManageNow(pid) {
    const s = G.s;
    if (pid < 0 || s.phase === 'gameover' || G.busy) return false;
    if (s.trade) return false;
    if (s.phase === 'debt') return s.debts.length && s.debts[0].pid === pid;
    return s.turn === pid && ['roll', 'end', 'buy'].includes(s.phase);
  }
  function manageButtons(i, pid, big) {
    const s = G.s, c = C[i], pr = s.props[i];
    const cls = big ? 'btn' : 'btn small';
    let b = '';
    const debt = s.phase === 'debt';
    if (c.t === 'street' && E.ownsGroup(s, pid, c.g)) {
      if (!debt && pr.houses < 5) b += `<button class="${cls} green" data-man="build" data-cell="${i}" ${E.canBuild(s, pid, i) ? 'disabled' : ''}>+🏠 ${big ? fmt(GR[c.g].house) : ''}</button>`;
      if (pr.houses > 0) b += `<button class="${cls} blue" data-man="sell" data-cell="${i}" ${E.canSell(s, pid, i) ? 'disabled' : ''}>−🏠</button>`;
    }
    if (!pr.mortgaged) b += `<button class="${cls}" data-man="mortgage" data-cell="${i}" ${E.canMortgage(s, pid, i) ? 'disabled' : ''}>Garov${big ? ' +' + fmt(c.price / 2) : ''}</button>`;
    else if (!debt) b += `<button class="${cls} gold" data-man="unmortgage" data-cell="${i}" ${E.canUnmortgage(s, pid, i) ? 'disabled' : ''}>Qaytarish${big ? ' ' + fmt(E.unmortgageCost(i)) : ''}</button>`;
    return b;
  }
  function bindManage(el, refresh) {
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-man]'); if (!b) return;
      const pid = actorPid();
      Snd.play('click');
      const err = G.mode === 'client' ? (Online.sendAction(pid, { a: b.dataset.man, cell: +b.dataset.cell }), null) : applyAction(pid, { a: b.dataset.man, cell: +b.dataset.cell });
      if (!err) setTimeout(refresh, G.mode === 'client' ? 450 : 200);
    });
  }

  // ---------------- Mulklarim ----------------
  function openProps() {
    const s = G.s, pid = actorPid();
    if (pid < 0) return;
    const p = s.players[pid];
    const mine = E.ownedBy(s, pid);
    const can = canManageNow(pid);
    let body = '';
    if (s.phase === 'debt' && can) body += `<div class="warn">Qarz: <b>${fmt(s.debts[0].amount)}</b>. Pulingiz: <b>${fmt(p.money)}</b>. Uylarni soting yoki mulkni garovga qo'ying.</div>`;
    else if (!can) body += `<div class="hint">Mulklarni faqat o'z navbatingizda boshqarish mumkin.</div>`;
    else body += `<div class="hint">Pulingiz: <b style="color:#F5C04A">${fmt(p.money)}</b>. Uy qurish uchun bir rangdagi barcha mulk sizniki bo'lishi kerak.</div>`;
    if (!mine.length) body += `<div class="empty">Hali mulkingiz yo'q 🏚️</div>`;
    const groups = {};
    mine.forEach(i => { const c = C[i]; const k = c.t === 'street' ? c.g : c.t; (groups[k] = groups[k] || []).push(i); });
    const order = [...Object.keys(GR), 'metro', 'util'];
    order.forEach(k => {
      if (!groups[k]) return;
      const col = GR[k] ? GR[k].color : k === 'metro' ? '#1F5FBF' : '#888';
      const title = GR[k] ? GR[k].name + (E.ownsGroup(s, pid, k) ? ' ✔ to\'liq' : ` (${groups[k].length}/${E.GROUP_CELLS[k].length})`) : k === 'metro' ? 'Metro liniyalari' : 'Kommunal';
      body += `<div class="grp"><div class="gh"><i style="background:${col}"></i>${title}</div>`;
      groups[k].forEach(i => {
        const c = C[i], pr = s.props[i];
        const st = pr.mortgaged ? '<span style="color:#FF8A8A">Garovda</span>' : pr.houses === 5 ? '🏨 Mehmonxona' : pr.houses ? '🏠'.repeat(pr.houses) : '';
        const rent = c.t === 'street' ? E.rentFor(s, i, 7) : c.t === 'metro' ? E.rentFor(s, i, 7) : null;
        body += `<div class="item"><div class="cb" style="background:${col}"></div><div class="tt" data-deed="${i}"><div class="a">${esc(c.name)}</div>
          <div class="b">${st} ${rent !== null && !pr.mortgaged ? 'Ijara: ' + fmt(rent) : ''}</div></div>
          <div class="acts">${can ? manageButtons(i, pid, false) : ''}</div></div>`;
      });
      body += `</div>`;
    });
    if (p.jailCards.length) body += `<div class="hint">🎫 Qamoqdan ozod qilish kartasi: ${p.jailCards.length} ta</div>`;
    const el = openSheet(`🏠 ${esc(p.name)} mulklari`, body);
    bindManage(el, () => { if ($('#sheet').classList.contains('on')) openProps(); });
    el.addEventListener('click', e => { const d = e.target.closest('[data-deed]'); if (d) showDeed(+d.dataset.deed); });
  }
  $('#bProps').onclick = () => { Snd.play('click'); openProps(); };

  // ---------------- O'yinchi ma'lumoti ----------------
  function showPlayer(pid) {
    const s = G.s, p = s.players[pid];
    const mine = E.ownedBy(s, pid);
    let body = `<div class="item"><div class="tok" style="background:${p.color}">${p.token}</div><div class="tt"><div class="a">${esc(p.name)} ${p.type === 'bot' ? '🤖 ' + (LEVELS[p.level] || '') : ''}</div>
      <div class="b">Naqd: <b style="color:#F5C04A">${fmt(p.money)}</b> · Umumiy boylik: ${fmt(E.netWorth(s, pid))}</div></div></div>`;
    if (p.inJail) body += `<div class="hint">🔒 Qamoqda</div>`;
    if (p.jailCards.length) body += `<div class="hint">🎫 Ozodlik kartasi: ${p.jailCards.length}</div>`;
    body += mine.length ? mine.map(i => {
      const c = C[i], pr = s.props[i], col = c.t === 'street' ? GR[c.g].color : c.t === 'metro' ? '#1F5FBF' : '#888';
      return `<div class="item" data-deed="${i}"><div class="cb" style="background:${col}"></div><div class="tt"><div class="a">${esc(c.name)}</div>
        <div class="b">${pr.mortgaged ? 'Garovda' : pr.houses === 5 ? '🏨' : '🏠'.repeat(pr.houses)}</div></div></div>`;
    }).join('') : `<div class="empty">Mulki yo'q</div>`;
    const el = openSheet("O'yinchi", body);
    el.addEventListener('click', e => { const d = e.target.closest('[data-deed]'); if (d) showDeed(+d.dataset.deed); });
  }

  // ---------------- Jurnal ----------------
  $('#bLog').onclick = () => {
    Snd.play('click');
    const s = G.s;
    openSheet('📜 Jurnal', `<div class="loglist">${s.log.slice().reverse().map(l => `<div>${esc(l)}</div>`).join('')}</div>`);
  };

  // ---------------- Savdo ----------------
  function canTradeNow() {
    const s = G.s; if (!s) return false;
    const me = actorPid();
    return me >= 0 && s.turn === me && canControl(me) && ['roll', 'end'].includes(s.phase) && !s.trade && !G.busy && s.phase !== 'gameover';
  }
  $('#bTrade').onclick = () => {
    Snd.play('click');
    if (!canTradeNow()) { toast("Savdoni faqat o'z navbatingizda (zar tashlashdan oldin yoki keyin) taklif qilish mumkin"); return; }
    openTrade(null);
  };
  function openTrade(partner, draft) {
    const s = G.s, me = actorPid();
    const others = s.players.filter(p => !p.bankrupt && p.id !== me);
    if (!others.length) return;
    const to = partner !== null && partner !== undefined ? partner : others[0].id;
    const T = draft || { give: { money: 0, cells: [], cards: 0 }, get: { money: 0, cells: [], cards: 0 } };
    const A = s.players[me], B = s.players[to];
    const side = (pl, part, key) => {
      const cells = E.ownedBy(s, pl.id);
      let h = `<div class="tside"><h4><div class="tok" style="background:${pl.color}">${pl.token}</div>${key === 'give' ? 'Siz berasiz' : esc(pl.name) + ' beradi'}</h4>`;
      h += cells.length ? cells.map(i => {
        const c = C[i], ok = E.tradable(s, pl.id, i), sel = part.cells.includes(i);
        const col = c.t === 'street' ? GR[c.g].color : c.t === 'metro' ? '#1F5FBF' : '#888';
        return `<div class="item ${sel ? 'sel' : ''}" data-tc="${key}:${i}" style="${ok ? '' : 'opacity:.4'}"><div class="chk">${sel ? '✓' : ''}</div>
          <div class="cb" style="background:${col}"></div><div class="tt"><div class="a">${esc(c.name)}</div><div class="b">${fmt(c.price)}${s.props[i].mortgaged ? ' · garovda' : ''}${ok ? '' : ' · binolar bor'}</div></div></div>`;
      }).join('') : `<div class="hint">Mulk yo'q</div>`;
      h += `<div class="money-in"><button class="btn small" data-tm="${key}:-500">−500</button><button class="btn small" data-tm="${key}:-100">−100</button>
        <div class="v">${fmt(part.money)}</div><button class="btn small" data-tm="${key}:100">+100</button><button class="btn small" data-tm="${key}:500">+500</button></div>`;
      if (pl.jailCards.length) h += `<div class="item ${part.cards ? 'sel' : ''}" data-tcard="${key}"><div class="chk">${part.cards ? '✓' : ''}</div><div class="tt"><div class="a">🎫 Ozodlik kartasi</div></div></div>`;
      return h + `</div>`;
    };
    const body = `<div class="partners">${others.map(p => `<button class="${p.id === to ? 'on' : ''}" data-tp="${p.id}"><div class="tok" style="background:${p.color}">${p.token}</div>${esc(p.name)}</button>`).join('')}</div>
      <div class="tcols">${side(A, T.give, 'give')}${side(B, T.get, 'get')}</div>`;
    const el = openSheet('🤝 Savdo taklifi', body, `<button class="btn gold" id="tSend">Taklif yuborish</button>`);
    el.onclick = e => {
      const tp = e.target.closest('[data-tp]');
      if (tp) { openTrade(+tp.dataset.tp, null); return; }
      const tc = e.target.closest('[data-tc]');
      if (tc) {
        const [key, i] = tc.dataset.tc.split(':'); const n = +i;
        if (!E.tradable(s, key === 'give' ? me : to, n)) return;
        const arr = T[key].cells; const k = arr.indexOf(n); if (k >= 0) arr.splice(k, 1); else arr.push(n);
        Snd.play('click'); openTrade(to, T); return;
      }
      const tm = e.target.closest('[data-tm]');
      if (tm) {
        const [key, d] = tm.dataset.tm.split(':');
        const max = (key === 'give' ? A : B).money;
        T[key].money = Math.max(0, Math.min(max, T[key].money + +d));
        Snd.play('click'); openTrade(to, T); return;
      }
      const tcard = e.target.closest('[data-tcard]');
      if (tcard) { const key = tcard.dataset.tcard; T[key].cards = T[key].cards ? 0 : 1; openTrade(to, T); return; }
      if (e.target.closest('#tSend')) {
        const act = { a: 'trade', to, give: T.give, get: T.get };
        const err = E.validTrade(s, { from: me, to, give: T.give, get: T.get });
        if (err) { toast('⚠️ ' + esc(err)); Snd.play('bad'); return; }
        closeSheet();
        send(me, act);
      }
    };
  }

  let tradeModalOpen = false;
  function maybeIncomingTrade(force) {
    const s = G.s;
    if (!s || !s.trade || G.busy || tradeModalOpen) return;
    const t = s.trade;
    if (!canControl(t.to)) return;
    if (!force && G.mode === 'local' && s.players[t.from].type === 'human' && s.players.filter(p => p.type === 'human').length > 1) {
      // bitta telefonda: qabul qiluvchi o'zi "Taklifni ko'rish"ni bosadi
      return;
    }
    tradeModalOpen = true;
    const A = s.players[t.from], B = s.players[t.to];
    const list = (part) => {
      let h = part.cells.map(i => { const c = C[i], col = c.t === 'street' ? GR[c.g].color : c.t === 'metro' ? '#1F5FBF' : '#888';
        return `<div class="item"><div class="cb" style="background:${col}"></div><div class="tt"><div class="a">${esc(c.name)}</div><div class="b">${fmt(c.price)}${s.props[i].mortgaged ? ' · garovda' : ''}</div></div></div>`; }).join('');
      if (part.money) h += `<div class="item"><div class="tt"><div class="a" style="color:#F5C04A">💵 ${fmt(part.money)}</div></div></div>`;
      if (part.cards) h += `<div class="item"><div class="tt"><div class="a">🎫 Ozodlik kartasi</div></div></div>`;
      return h || '<div class="hint">Hech narsa</div>';
    };
    const html = `<div class="winbox" style="text-align:left;max-height:86vh;overflow-y:auto"><h2 style="text-align:center;font-size:20px">🤝 Savdo taklifi</h2>
      <p style="text-align:center;color:#9AA3C7;margin-top:0">${esc(A.name)} → ${esc(B.name)}</p>
      <div class="sec-title">Siz olasiz</div>${list(t.give)}<div class="sec-title">Siz berasiz</div>${list(t.get)}
      <div style="display:flex;gap:8px;margin-top:14px"><button class="btn red" style="flex:1" data-m="no">Rad etish</button><button class="btn green" style="flex:1" data-m="yes">Qabul qilish</button></div></div>`;
    openModal(html, { locked: true }).then(v => {
      tradeModalOpen = false;
      if (G.s.trade && G.s.trade.to === t.to) send(t.to, { a: 'tradeReply', accept: v === 'yes' });
    });
  }

  // ---------------- O'yin menyusi ----------------
  function openGameMenu() {
    const online = G.mode !== 'local';
    const el = openSheet('Menyu', `<div class="menu-btns">
      <button class="btn" data-gm="rules">📖 Qoidalar</button>
      <button class="btn" data-gm="sound">${Snd.on ? '🔇 Ovozni o\'chirish' : '🔊 Ovozni yoqish'}</button>
      ${online ? `<button class="btn red" data-gm="leave">🚪 O'yindan chiqish</button>` : `<button class="btn" data-gm="restart">🔄 Yangi o'yin</button><button class="btn red" data-gm="exit">🏠 Bosh menyu (saqlanadi)</button>`}
      </div>`);
    el.onclick = e => {
      const b = e.target.closest('[data-gm]'); if (!b) return;
      const k = b.dataset.gm;
      if (k === 'rules') showRules();
      else if (k === 'sound') { Snd.on = !Snd.on; closeSheet(); }
      else if (k === 'exit') { clearTimeout(G.botTimer); closeSheet(); G.s && saveGame(); G.s = null; show('menu'); }
      else if (k === 'restart') { closeSheet(); clearTimeout(G.botTimer); defaultSetup(); renderSetup(); show('setup'); }
      else if (k === 'leave') {
        closeSheet();
        openModal(`<div class="winbox"><div class="cup">🚪</div><h2>Chiqasizmi?</h2><p style="color:#9AA3C7">Onlayn o'yindan chiqsangiz, taslim bo'lgan hisoblanasiz.</p>
          <div style="display:flex;gap:8px"><button class="btn ghost" style="flex:1" data-m="no">Yo'q</button><button class="btn red" style="flex:1" data-m="yes">Chiqish</button></div></div>`, { locked: true })
          .then(v => { if (v === 'yes') {
            clearTimeout(G.botTimer);
            if (G.s && G.s.phase !== 'gameover' && G.myPid >= 0 && !G.s.players[G.myPid].bankrupt) { try { send(G.myPid, { a: 'resign' }); } catch (e) {} }
            Online.leave(); G.s = null; show('menu');
          } });
      }
    };
  }
  $('#gMenu').onclick = () => { Snd.play('click'); openGameMenu(); };
  $('#gSound').onclick = () => { Snd.on = !Snd.on; toast(Snd.on ? '🔊 Ovoz yoqildi' : '🔇 Ovoz o\'chirildi', 1200); };

  // ---------------- G'olib ----------------
  function showWinner() {
    const s = G.s; if (!s || s.phase !== 'gameover') return;
    if (G.mode === 'local') store.del('tb_save');
    const w = s.players[s.winner];
    const rank = s.players.slice().sort((a, b) => E.netWorth(s, b.id) - E.netWorth(s, a.id) || (a.bankrupt - b.bankrupt));
    for (let i = 0; i < 60; i++) {
      const cf = document.createElement('div'); cf.className = 'confetti';
      cf.style.left = Math.random() * 100 + 'vw'; cf.style.background = COLORS[i % 6];
      cf.style.animationDuration = 2 + Math.random() * 2.5 + 's'; cf.style.animationDelay = Math.random() * 0.8 + 's';
      document.body.appendChild(cf); setTimeout(() => cf.remove(), 5500);
    }
    const iWon = canControl(w.id) || (G.mode !== 'local' && w.id === G.myPid);
    openModal(`<div class="winbox"><div class="cup">🏆</div><h2>${esc(w.name)} g'olib!</h2>
      <div style="color:#9AA3C7">${iWon ? 'Tabriklaymiz! Siz Toshkentning eng boy biznesmenisiz!' : 'Keyingi safar omad kulib boqadi!'}</div>
      <div class="rank">${rank.map((p, k) => `<div><b>${k + 1}.</b><div class="tok" style="background:${p.color}">${p.token}</div><span>${esc(p.name)}</span>${p.bankrupt ? '<small style="color:#FF8A8A">bankrot</small>' : fmt(E.netWorth(s, p.id))}</div>`).join('')}</div>
      <div style="display:flex;gap:8px"><button class="btn ghost" style="flex:1" data-m="board">Taxta</button><button class="btn gold" style="flex:1" data-m="menu">Bosh menyu</button></div></div>`, { locked: true })
      .then(v => { if (v === 'menu') { if (G.mode !== 'local' && window.Online) Online.leave(true); show('menu'); } });
  }

  // ---------------- Ishga tushirish ----------------
  refreshMenu();
  window.UI = { show, toast, startGame, renderAll, openSheet, closeSheet, esc };
})();
