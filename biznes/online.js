/* Toshkent Biznes — onlayn rejim interfeysi (Firebase Realtime Database ustida) */
(function () {
  'use strict';
  const FB_CONFIG = {
    apiKey: "AIzaSyAUIG745g1EoxWK2vgvQYXl8Ns-KRQEQ2Y",
    authDomain: "toshkent-biznes.firebaseapp.com",
    databaseURL: "https://toshkent-biznes-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "toshkent-biznes",
    storageBucket: "toshkent-biznes.firebasestorage.app",
    messagingSenderId: "8388059282",
    appId: "1:8388059282:web:27050c9a54fd88f378864b",
  };
  const SDK = [
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js',
  ];

  const $ = (q, r) => (r || document).querySelector(q);
  let G, E, RC; // GameCtl, Engine, RoomClient — DOM tayyor bo'lganda o'rnatiladi

  let fbReady = null;
  function loadSDK() {
    if (fbReady) return fbReady;
    fbReady = new Promise((resolve, reject) => {
      if (window.firebase && window.firebase.database) return resolve();
      let left = SDK.length;
      let failed = false;
      SDK.forEach(src => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => { if (--left === 0 && !failed) resolve(); };
        s.onerror = () => { if (!failed) { failed = true; reject(new Error('load-fail')); } };
        document.head.appendChild(s);
      });
    });
    return fbReady;
  }
  let app = null;
  function ensureApp() {
    if (!app) {
      app = window.firebase.apps && window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(FB_CONFIG);
    }
    return window.firebase;
  }

  const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: (k) => { try { localStorage.removeItem(k); } catch (e) {} } };

  let room = null; // faol RoomClient
  let lobby = { seats: {}, settings: {}, code: null, isHost: false };

  function init() {
    G = window.GameCtl; E = window.Engine; RC = window.RoomClient;
  }

  // ---------------- Ekran chizish ----------------
  function screen(html, foot) {
    $('#onBody').innerHTML = html;
    $('#onFoot').innerHTML = foot || '';
  }
  function setTitle(t) { $('#onTitle').textContent = t; }

  function openMain() {
    setTitle('Onlayn o\'yin');
    screen(`
      <div class="hint">Do'stlaringiz bilan turli telefonlardan bitta o'yinda o'ynang. Internet kerak.</div>
      <div class="menu-btns" style="margin-top:10px">
        <button class="btn green" id="onCreate" style="min-height:54px;font-size:16px">🎉 Xona ochish</button>
        <button class="btn blue" id="onJoin" style="min-height:54px;font-size:16px">🔑 Kod bilan qo'shilish</button>
      </div>`);
    $('#onCreate').onclick = () => { Snd.play('click'); startCreate(); };
    $('#onJoin').onclick = () => { Snd.play('click'); startJoin(); };
    checkResume();
  }
  function checkResume() {
    const sv = store.get('tb_online_room', null);
    if (!sv) return;
    const box = document.createElement('div');
    box.className = 'setrow';
    box.innerHTML = `<div><div class="t">Tugallanmagan onlayn o'yin</div><div class="d">Xona: ${sv.code}</div></div><button class="btn gold small" id="onResume">Ulanish</button>`;
    $('#onBody').prepend(box);
    $('#onResume').onclick = () => { Snd.play('click'); resumeRoom(sv); };
  }

  function withLoading(fn) {
    setTitle('Ulanmoqda...');
    screen(`<div class="empty">🔄 Serverga ulanmoqda...</div>`);
    loadSDK().then(() => {
      ensureApp();
      return fn();
    }).catch(err => {
      screen(`<div class="warn">Internetga ulanib bo'lmadi. Internet aloqangizni tekshirib, qayta urinib ko'ring.</div>`,
        `<button class="btn gold wide" id="onRetry">Qayta urinish</button>`);
      $('#onRetry').onclick = () => openMain();
    });
  }

  function myProfile() { const p = G.profile(); return { uid: p.uid, name: p.name, token: p.token }; }

  // ---------------- Xona ochish (host) ----------------
  const defaultSettings = { startMoney: 15000, maxRounds: 0, auction: true, jackpot: false };
  function startCreate() {
    withLoading(() => {
      room = RC.createRoomClient(ensureApp(), E);
      bindRoomHooks(true);
      return room.createRoom(myProfile(), { ...defaultSettings }).then(code => {
        lobby = { seats: {}, settings: { ...defaultSettings }, code, isHost: true };
        store.set('tb_online_room', { code, isHost: true });
        renderLobby();
      });
    });
  }

  // ---------------- Kod bilan qo'shilish ----------------
  function startJoin() {
    setTitle("Kodni kiriting");
    screen(`<div class="hint">Xona ochgan do'stingizdan 4 xonali kodni so'rang.</div>
      <input id="joinCode" class="codein" inputmode="numeric" maxlength="4" placeholder="0000"
        style="width:100%;text-align:center;background:var(--panel);border:1px solid var(--line);color:var(--text);border-radius:14px;padding:16px;margin-top:10px;outline:none">`,
      `<button class="btn gold wide" id="joinGo">Qo'shilish</button>`);
    const inp = $('#joinCode'); inp.focus();
    inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 4); });
    $('#joinGo').onclick = () => {
      const code = inp.value.trim();
      if (code.length !== 4) { G.toast('⚠️ 4 xonali kodni to\'liq kiriting'); return; }
      Snd.play('click');
      withLoading(() => {
        room = RC.createRoomClient(ensureApp(), E);
        bindRoomHooks(false);
        return room.joinRoom(code, myProfile()).then(res => {
          if (res.err === 'notfound') { room = null; G.toast('⚠️ Bunday kodli xona topilmadi'); startJoin(); return; }
          if (res.err === 'full') { room = null; G.toast('⚠️ Xona to\'lgan (6 kishi)'); startJoin(); return; }
          if (res.err === 'started') { room = null; G.toast('⚠️ Bu o\'yin allaqachon boshlangan'); startJoin(); return; }
          lobby = { seats: {}, settings: {}, code, isHost: false };
          store.set('tb_online_room', { code, isHost: false });
          renderLobby();
        });
      });
    };
  }

  function resumeRoom(sv) {
    withLoading(() => {
      room = RC.createRoomClient(ensureApp(), E);
      bindRoomHooks(sv.isHost);
      return room.rejoin(sv.code, myProfile(), sv.isHost).then(res => {
        if (res.err) { store.del('tb_online_room'); room = null; G.toast('⚠️ Xona topilmadi, ehtimol yopilgan'); openMain(); return; }
        lobby = { seats: {}, settings: {}, code: sv.code, isHost: sv.isHost };
        if (!res.playing) renderLobby();
      });
    });
  }

  // ---------------- Room hook'lari ----------------
  let gameStarted = false;
  function bindRoomHooks(isHost) {
    room.on('lobby', seats => { lobby.seats = seats || {}; if ($('#onBody') && lobby.code && !gameStarted) renderLobby(); });
    room.on('settings', s => { lobby.settings = s || {}; if (!lobby.isHost && !gameStarted) renderLobby(); });
    room.on('hostLeft', () => { if (!gameStarted) { G.toast('⚠️ Xona egasi xonani tark etdi'); leaveToMenu(); } });
    room.on('start', (state, pid, role) => {
      gameStarted = true;
      G.start(state, role === 'host' ? 'host' : 'client', pid);
      const codeEl = document.getElementById('onCode');
      if (codeEl) codeEl.textContent = lobby.code;
    });
    room.on('sync', (state, evs) => { G.remoteState(state, evs); });
    room.on('action', (a) => {
      if (!a) return;
      G.applyAction(a.pid, a.action);
    });
  }

  window.Online = {
    open() { init(); gameStarted = false; G.show('online'); openMain(); },
    back() {
      if (lobby.code && !gameStarted) { leaveToMenu(); return; }
      G.show('menu');
    },
    sendAction(pid, action) { if (room) room.sendAction(pid, action); },
    publish(state, evs) { if (room) room.publish(state, evs); },
    leave(silent) {
      store.del('tb_online_room');
      if (room) { room.leave(); room = null; }
      gameStarted = false;
      if (!silent) G.show('menu');
    },
  };

  function leaveToMenu() {
    store.del('tb_online_room');
    if (room) { room.leave(); room = null; }
    gameStarted = false;
    openMain();
  }

  // ---------------- Lobbi ekrani ----------------
  const LEVELS = { easy: 'Oson', medium: "O'rta", hard: 'Kuchli' };
  const BOT_NAMES = ['Aziz', 'Malika', 'Jasur', 'Nilufar', 'Bobur', 'Dilnoza'];
  const BOT_TOKENS = ['🐫', '🚌', '🏍️', '⚽', '🍉', '🚜'];
  function renderLobby() {
    setTitle('Lobbi · #' + lobby.code);
    const seats = lobby.seats || {};
    const idxs = Object.keys(seats).map(Number).sort((a, b) => a - b);
    const isHost = lobby.isHost;
    const s = lobby.settings || defaultSettings;
    let rows = idxs.map(i => {
      const p = seats[i];
      const isMe = p.uid === myProfile().uid;
      return `<div class="prow" data-i="${i}">
        <div class="tok" style="background:${RC.COLORS[i % RC.COLORS.length]}">${p.token}</div>
        <div style="flex:1;min-width:0"><div style="font-weight:700">${G.esc(p.name)}${isMe ? ' (siz)' : ''}${p.type === 'bot' ? ' 🤖' : ''}</div>
          ${p.type === 'bot' && isHost ? `<div class="seg" data-lvl="${i}" style="margin-top:4px">${Object.keys(LEVELS).map(l => `<button data-v="${l}" class="${p.level === l ? 'on' : ''}">${LEVELS[l]}</button>`).join('')}</div>`
            : p.connected === false ? `<div style="font-size:12px;color:var(--muted)">Uzilib qoldi...</div>` : ''}
        </div>
        ${isHost && i != 0 ? `<button class="del" data-del="${i}">✕</button>` : ''}
      </div>`;
    }).join('');
    let body = `<div class="sec-title">O'yinchilar (${idxs.length}/6)</div>${rows}`;
    if (isHost && idxs.length < 6) body += `<button class="btn ghost wide" id="lobAddBot">🤖 Bot qo'shish</button>`;
    if (isHost) {
      body += `<div class="sec-title">Qoidalar</div>
        <div class="setrow"><div><div class="t">Boshlang'ich pul</div></div>
          <div class="seg" data-opt="startMoney">${[10000, 15000, 20000].map(v => `<button data-v="${v}" class="${(s.startMoney || 15000) === v ? 'on' : ''}">${v / 1000} mln</button>`).join('')}</div></div>
        <div class="setrow"><div><div class="t">Auksion</div></div><div class="switch ${s.auction !== false ? 'on' : ''}" id="lobAuction"></div></div>
        <div class="setrow"><div><div class="t">Choyxona xazinasi</div></div><div class="switch ${s.jackpot ? 'on' : ''}" id="lobJackpot"></div></div>`;
    } else {
      body += `<div class="hint">Boshlang'ich pul: ${(s.startMoney || 15000) / 1000} mln · Auksion: ${s.auction !== false ? 'bor' : "yo'q"} · Choyxona: ${s.jackpot ? 'bor' : "yo'q"}</div>`;
    }
    body += `<div class="hint" style="text-align:center;margin-top:14px">Kodni ulashing: <b style="color:var(--gold);font-size:18px;letter-spacing:2px">${lobby.code}</b></div>`;
    const foot = isHost
      ? `<button class="btn ghost" id="lobLeave" style="flex:0 0 auto;padding:0 16px">Chiqish</button><button class="btn gold" id="lobStart" style="flex:1" ${idxs.length < 2 ? 'disabled' : ''}>Boshlash ▶</button>`
      : `<button class="btn ghost wide" id="lobLeave">Chiqish</button>`;
    screen(body, foot);
    $('#lobLeave').onclick = () => { Snd.play('click'); leaveToMenu(); };
    if (isHost) {
      $('#lobStart') && ($('#lobStart').onclick = () => { Snd.play('buy'); setTitle('Boshlanmoqda...'); screen(`<div class="empty">🎲 O'yin boshlanmoqda...</div>`); room.start(); });
      $('#lobAddBot') && ($('#lobAddBot').onclick = () => {
        Snd.play('click');
        const used = idxs.map(i => seats[i].token);
        const name = BOT_NAMES.find(n => !idxs.some(i => seats[i].name === n)) || 'Bot';
        const token = BOT_TOKENS.find(t => !used.includes(t)) || '🤖';
        room.addBot(name, token, 'medium');
      });
      $('#onBody').addEventListener('click', e => {
        const del = e.target.closest('[data-del]'); if (del) { Snd.play('click'); room.removeSeat(+del.dataset.del); return; }
        const lvl = e.target.closest('[data-lvl] [data-v]');
        if (lvl) { Snd.play('click'); const seg = lvl.closest('[data-lvl]'); room.setSeatLevel(+seg.dataset.lvl, lvl.dataset.v); return; }
        const opt = e.target.closest('[data-opt] [data-v]');
        if (opt) { Snd.play('click'); room.updateSettings({ [opt.closest('[data-opt]').dataset.opt]: +opt.dataset.v }); return; }
      });
      $('#lobAuction') && ($('#lobAuction').onclick = () => { Snd.play('click'); room.updateSettings({ auction: !(s.auction !== false) }); });
      $('#lobJackpot') && ($('#lobJackpot').onclick = () => { Snd.play('click'); room.updateSettings({ jackpot: !s.jackpot }); });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  const onBackBtn = document.getElementById('onBack');
  if (onBackBtn) onBackBtn.onclick = () => window.Online.back();
  else document.addEventListener('DOMContentLoaded', () => { const b = document.getElementById('onBack'); if (b) b.onclick = () => window.Online.back(); });
})();
