/* Toshkent Biznes — o'yin mexanikasi (UI'siz, sof mantiq).
   Barcha pul qiymatlari "ming so'm"da saqlanadi: 600 = 600 000 so'm. */
(function (root) {
  'use strict';

  const GROUPS = {
    brown:  { color: '#8D5A3B', house: 500,  name: 'Jigarrang' },
    lblue:  { color: '#6CC9EE', house: 500,  name: 'Havorang' },
    pink:   { color: '#D9468F', house: 1000, name: 'Pushti' },
    orange: { color: '#F28C1E', house: 1000, name: "To'q sariq" },
    red:    { color: '#DE2E3B', house: 1500, name: 'Qizil' },
    yellow: { color: '#F2CB1D', house: 1500, name: 'Sariq' },
    green:  { color: '#1E9A52', house: 2000, name: 'Yashil' },
    dblue:  { color: '#2552A8', house: 2000, name: "To'q ko'k" },
  };

  const S = (name, g, price, rent) => ({ t: 'street', name, g, price, rent });
  const CELLS = [
    { t: 'go', name: 'START' },
    S('Sergeli', 'brown', 600, [20, 100, 300, 900, 1600, 2500]),
    { t: 'mahalla', name: 'Mahalla' },
    S("Qo'yliq", 'brown', 600, [40, 200, 600, 1800, 3200, 4500]),
    { t: 'tax', name: "Daromad solig'i", amount: 2000 },
    { t: 'metro', name: 'Chilonzor liniyasi', price: 2000 },
    S('Uchtepa', 'lblue', 1000, [60, 300, 900, 2700, 4000, 5500]),
    { t: 'omad', name: 'Omad' },
    S('Olmazor', 'lblue', 1000, [60, 300, 900, 2700, 4000, 5500]),
    S("Uzbekfilm ko'chasi", 'lblue', 1200, [80, 400, 1000, 3000, 4500, 6000]),
    { t: 'jail', name: 'Qamoqxona' },
    S('Yakkasaroy', 'pink', 1400, [100, 500, 1500, 4500, 6250, 7500]),
    { t: 'util', name: "Elektr tarmog'i", price: 1500, icon: 'bolt' },
    S('Mirobod', 'pink', 1400, [100, 500, 1500, 4500, 6250, 7500]),
    S('Shayxontohur', 'pink', 1600, [120, 600, 1800, 5000, 7000, 9000]),
    { t: 'metro', name: "O'zbekiston liniyasi", price: 2000 },
    S('Chorsu', 'orange', 1800, [140, 700, 2000, 5500, 7500, 9500]),
    { t: 'mahalla', name: 'Mahalla' },
    S('Xadra ko\'chasi', 'orange', 1800, [140, 700, 2000, 5500, 7500, 9500]),
    S("Ko'kcha", 'orange', 2000, [160, 800, 2200, 6000, 8000, 10000]),
    { t: 'parking', name: 'Choyxona' },
    S('Yunusobod', 'red', 2200, [180, 900, 2500, 7000, 8750, 10500]),
    { t: 'omad', name: 'Omad' },
    S("Mirzo Ulug'bek", 'red', 2200, [180, 900, 2500, 7000, 8750, 10500]),
    S('Minor', 'red', 2400, [200, 1000, 3000, 7500, 9250, 11000]),
    { t: 'metro', name: 'Yunusobod liniyasi', price: 2000 },
    S("Bobur ko'chasi", 'yellow', 2600, [220, 1100, 3300, 8000, 9750, 11500]),
    S('Shota Rustaveli', 'yellow', 2600, [220, 1100, 3300, 8000, 9750, 11500]),
    { t: 'util', name: "Suv ta'minoti", price: 1500, icon: 'drop' },
    S("Navoiy ko'chasi", 'yellow', 2800, [240, 1200, 3600, 8500, 10250, 12000]),
    { t: 'gotojail', name: 'Qamoqqa!' },
    S("Sayilgoh ko'chasi", 'green', 3000, [260, 1300, 3900, 9000, 11000, 12750]),
    S("Afrosiyob ko'chasi", 'green', 3000, [260, 1300, 3900, 9000, 11000, 12750]),
    { t: 'mahalla', name: 'Mahalla' },
    S('Mustaqillik maydoni', 'green', 3200, [280, 1500, 4500, 10000, 12000, 14000]),
    { t: 'metro', name: 'Halqa liniyasi', price: 2000 },
    { t: 'omad', name: 'Omad' },
    S("Amir Temur ko'chasi", 'dblue', 3500, [350, 1750, 5000, 11000, 13000, 15000]),
    { t: 'tax', name: "Hashamat solig'i", amount: 1000 },
    S('Tashkent City', 'dblue', 4000, [500, 2000, 6000, 14000, 17000, 20000]),
  ];

  const GO_SALARY = 2000, JAIL_FINE = 500, JAIL_POS = 10;
  const OWNABLE = CELLS.map((c, i) => (c.price ? i : -1)).filter(i => i >= 0);
  const GROUP_CELLS = {};
  CELLS.forEach((c, i) => { if (c.t === 'street') (GROUP_CELLS[c.g] = GROUP_CELLS[c.g] || []).push(i); });
  const METROS = CELLS.map((c, i) => (c.t === 'metro' ? i : -1)).filter(i => i >= 0);
  const UTILS = CELLS.map((c, i) => (c.t === 'util' ? i : -1)).filter(i => i >= 0);

  const CARDS = {
    omad: [
      { text: 'START maydoniga boring va 2 mln so\'m oling.', a: 'goto', to: 0 },
      { text: 'Minor mahallasiga boring. START dan o\'tsangiz, 2 mln so\'m oling.', a: 'goto', to: 24 },
      { text: 'Yakkasaroyga boring. START dan o\'tsangiz, 2 mln so\'m oling.', a: 'goto', to: 11 },
      { text: 'Tashkent City\'ga sayrga boring.', a: 'goto', to: 39 },
      { text: 'Chilonzor metro liniyasiga boring. START dan o\'tsangiz, 2 mln so\'m oling.', a: 'goto', to: 5 },
      { text: 'Eng yaqin metro liniyasiga boring. Egasi bo\'lsa, ikki barobar ijara to\'lang.', a: 'nearest', kind: 'metro' },
      { text: 'Eng yaqin metro liniyasiga boring. Egasi bo\'lsa, ikki barobar ijara to\'lang.', a: 'nearest', kind: 'metro' },
      { text: 'Eng yaqin kommunal xizmatga boring. Egasi bo\'lsa, zar yig\'indisining 10 baravarini to\'lang.', a: 'nearest', kind: 'util' },
      { text: 'Bank sizga dividend to\'ladi: 500 ming so\'m.', a: 'money', v: 500 },
      { text: 'Qamoqdan ozod qilish kartasi. Kerak bo\'lguncha saqlab qo\'ying.', a: 'jailfree' },
      { text: 'Uch qadam orqaga qayting.', a: 'back', n: 3 },
      { text: 'To\'g\'ri qamoqqa! START dan o\'tmaysiz, pul olmaysiz.', a: 'jail' },
      { text: 'Barcha binolaringizni ta\'mirlang: har bir uy uchun 250 ming, har bir mehmonxona uchun 1 mln so\'m.', a: 'repairs', h: 250, H: 1000 },
      { text: 'Tezlikni oshirgansiz — jarima 150 ming so\'m.', a: 'money', v: -150 },
      { text: 'Siz mahalla raisi etib saylandingiz. Har bir o\'yinchiga 500 ming so\'m to\'lang.', a: 'eachPay', v: 500 },
      { text: 'Qurilish krediti muddati tugadi — 1,5 mln so\'m oling.', a: 'money', v: 1500 },
    ],
    mahalla: [
      { text: 'START maydoniga boring va 2 mln so\'m oling.', a: 'goto', to: 0 },
      { text: 'Bank xatosi sizning foydangizga: 2 mln so\'m oling.', a: 'money', v: 2000 },
      { text: 'Shifokor xizmati uchun 500 ming so\'m to\'lang.', a: 'money', v: -500 },
      { text: 'Aksiyalaringizni sotdingiz: 500 ming so\'m oling.', a: 'money', v: 500 },
      { text: 'Qamoqdan ozod qilish kartasi. Kerak bo\'lguncha saqlab qo\'ying.', a: 'jailfree' },
      { text: 'To\'g\'ri qamoqqa! START dan o\'tmaysiz, pul olmaysiz.', a: 'jail' },
      { text: 'Navro\'z bayrami mukofoti: 1 mln so\'m oling.', a: 'money', v: 1000 },
      { text: 'Soliqdan qaytim: 200 ming so\'m oling.', a: 'money', v: 200 },
      { text: 'Tug\'ilgan kuningiz! Har bir o\'yinchidan 100 ming so\'m to\'yona oling.', a: 'eachGet', v: 100 },
      { text: 'Sug\'urta to\'lovi keldi: 1 mln so\'m oling.', a: 'money', v: 1000 },
      { text: 'To\'y xarajatlari: 1 mln so\'m to\'lang.', a: 'money', v: -1000 },
      { text: 'O\'qish uchun kontrakt to\'lovi: 500 ming so\'m to\'lang.', a: 'money', v: -500 },
      { text: 'Maslahat xizmati uchun haq: 250 ming so\'m oling.', a: 'money', v: 250 },
      { text: 'Mahallani obodonlashtirish: har bir uy uchun 400 ming, har bir mehmonxona uchun 1,15 mln so\'m to\'lang.', a: 'repairs', h: 400, H: 1150 },
      { text: 'Palov tanlovida 2-o\'rin! 100 ming so\'m oling.', a: 'money', v: 100 },
      { text: 'Qarindoshingizdan meros qoldi: 1 mln so\'m oling.', a: 'money', v: 1000 },
    ],
  };

  function shuffle(a, rnd) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ---------- O'yinni yaratish ----------
  function newGame(opts, rnd) {
    rnd = rnd || Math.random;
    const st = opts.settings || {};
    const settings = {
      startMoney: st.startMoney || 15000,
      auction: st.auction !== false,
      jackpot: !!st.jackpot,
      evenBuild: st.evenBuild !== false,
      maxRounds: st.maxRounds || 0,
    };
    const s = {
      v: 1,
      settings,
      players: opts.players.map((p, i) => ({
        id: i, name: p.name, token: p.token, color: p.color, type: p.type || 'human', level: p.level || 'medium',
        uid: p.uid || null,
        money: settings.startMoney, pos: 0, inJail: false, jailTurns: 0, jailCards: [], bankrupt: false, doubles: 0,
      })),
      props: {},
      turn: 0,
      phase: 'roll',
      dice: [1, 1],
      rollAgain: false,
      pendingBuy: null,
      auction: null,
      trade: null,
      debts: [],
      pot: 0,
      decks: { omad: shuffle([...Array(16).keys()], rnd), mahalla: shuffle([...Array(16).keys()], rnd) },
      lastCard: null,
      turnCount: 1,
      round: 1,
      log: [],
      events: [],
      winner: null,
      seq: 0,
    };
    OWNABLE.forEach(i => { s.props[i] = { owner: -1, houses: 0, mortgaged: false }; });
    s.turn = Math.floor(rnd() * s.players.length);
    log(s, `O'yin boshlandi! Birinchi bo'lib ${s.players[s.turn].name} yuradi.`);
    return s;
  }

  // ---------- Yordamchilar ----------
  function log(s, text) { s.log.push(text); if (s.log.length > 80) s.log.shift(); s.events.push({ k: 'log', text }); }
  function ev(s, e) { s.events.push(e); }
  function fmt(v) {
    const neg = v < 0; v = Math.abs(v);
    let r;
    if (v >= 1000) { r = (Math.round(v / 10) / 100).toString().replace('.', ',') + ' mln'; }
    else r = v + ' ming';
    return (neg ? '-' : '') + r;
  }
  function alive(s) { return s.players.filter(p => !p.bankrupt); }
  function ownedBy(s, pid) { return OWNABLE.filter(i => s.props[i].owner === pid); }
  function ownsGroup(s, pid, g) { return GROUP_CELLS[g].every(i => s.props[i].owner === pid); }
  function groupHasHouses(s, g) { return GROUP_CELLS[g].some(i => s.props[i].houses > 0); }
  function countType(s, pid, list) { return list.filter(i => s.props[i].owner === pid).length; }
  function houseCount(s, pid) {
    let h = 0, H = 0;
    ownedBy(s, pid).forEach(i => { const n = s.props[i].houses; if (n === 5) H++; else h += n; });
    return { h, H };
  }
  function unmortgageCost(i) { return Math.ceil(CELLS[i].price / 2 * 1.1 / 10) * 10; }
  function netWorth(s, pid) {
    const p = s.players[pid];
    if (p.bankrupt) return 0;
    let w = p.money;
    ownedBy(s, pid).forEach(i => {
      const pr = s.props[i], c = CELLS[i];
      w += pr.mortgaged ? c.price / 2 : c.price;
      if (c.t === 'street') w += pr.houses * GROUPS[c.g].house;
    });
    return w;
  }
  // Mulkni sotib/garovga qo'yib yig'ish mumkin bo'lgan eng ko'p pul
  function liquidValue(s, pid) {
    let v = s.players[pid].money;
    ownedBy(s, pid).forEach(i => {
      const pr = s.props[i], c = CELLS[i];
      if (c.t === 'street') v += pr.houses * GROUPS[c.g].house / 2;
      if (!pr.mortgaged) v += c.price / 2;
    });
    return v;
  }

  function rentFor(s, i, diceSum, mult) {
    const c = CELLS[i], pr = s.props[i];
    if (pr.owner < 0 || pr.mortgaged) return 0;
    let r = 0;
    if (c.t === 'street') {
      if (pr.houses > 0) r = c.rent[pr.houses];
      else r = c.rent[0] * (ownsGroup(s, pr.owner, c.g) ? 2 : 1);
    } else if (c.t === 'metro') {
      r = 250 * Math.pow(2, countType(s, pr.owner, METROS) - 1);
      if (mult === 'double') r *= 2;
    } else if (c.t === 'util') {
      const n = countType(s, pr.owner, UTILS);
      const k = mult === 'ten' ? 10 : (n === 2 ? 10 : 4);
      r = k * diceSum * 10;
    }
    return r;
  }

  function awaiting(s) {
    if (s.phase === 'gameover') return -1;
    if (s.trade) return s.trade.to;
    if (s.phase === 'debt' && s.debts.length) return s.debts[0].pid;
    if (s.phase === 'auction' && s.auction) return s.auction.active[s.auction.idx];
    return s.turn;
  }

  // ---------- Pul o'tkazish ----------
  function credit(s, to, amount, reason) {
    if (to >= 0) {
      const p = s.players[to];
      if (p.bankrupt) return; // bankrot bo'lgan o'yinchiga pul bankka ketadi
      p.money += amount; ev(s, { k: 'money', pid: to, delta: amount, reason });
    } else if (to === -2) { s.pot += amount; ev(s, { k: 'pot', pot: s.pot }); }
  }
  function charge(s, pid, amount, to, reason) {
    if (amount <= 0) return;
    if (to === -1 && s.settings.jackpot && reason !== 'build' && reason !== 'unmortgage' && reason !== 'buy') to = -2;
    s.debts.push({ pid, amount, to, reason: reason || '' });
    settleDebts(s);
  }
  function settleDebts(s) {
    while (s.debts.length) {
      const d = s.debts[0];
      const p = s.players[d.pid];
      if (p.bankrupt) { s.debts.shift(); continue; }
      if (p.money >= d.amount) {
        p.money -= d.amount; ev(s, { k: 'money', pid: d.pid, delta: -d.amount, reason: d.reason });
        credit(s, d.to, d.amount, d.reason);
        s.debts.shift();
      } else return false;
    }
    return true;
  }

  // ---------- Harakat ----------
  function moveTo(s, p, to, passGo) {
    const from = p.pos;
    const steps = (to - from + 40) % 40;
    p.pos = to;
    ev(s, { k: 'move', pid: p.id, from, steps, to });
    if (passGo && steps > 0 && (to < from || to === 0)) {
      credit(s, p.id, GO_SALARY, 'go');
      log(s, `${p.name} START dan o'tdi: +${fmt(GO_SALARY)}`);
    }
  }
  function moveBack(s, p, n) {
    const from = p.pos; p.pos = (p.pos - n + 40) % 40;
    ev(s, { k: 'move', pid: p.id, from, steps: -n, to: p.pos });
  }
  function sendToJail(s, p) {
    const from = p.pos;
    p.pos = JAIL_POS; p.inJail = true; p.jailTurns = 0; p.doubles = 0; s.rollAgain = false;
    ev(s, { k: 'jail', pid: p.id, from });
    log(s, `${p.name} qamoqqa tushdi! 🚓`);
  }

  function land(s, p, mult) {
    const i = p.pos, c = CELLS[i];
    if (c.price) {
      const pr = s.props[i];
      if (pr.owner < 0) { s.pendingBuy = i; return; }
      if (pr.owner === p.id) return;
      if (pr.mortgaged) { log(s, `${c.name} garovda — ijara yo'q.`); return; }
      let diceSum = s.dice[0] + s.dice[1];
      if (c.t === 'util' && mult === 'ten') {
        const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
        diceSum = a + b; ev(s, { k: 'dice', d: [a, b], pid: p.id, extra: true });
      }
      const r = rentFor(s, i, diceSum, mult);
      const owner = s.players[pr.owner];
      log(s, `${p.name} → ${owner.name}ga ijara: ${fmt(r)} (${c.name})`);
      charge(s, p.id, r, owner.id, 'rent');
      return;
    }
    switch (c.t) {
      case 'tax':
        log(s, `${p.name}: ${c.name} ${fmt(c.amount)}`);
        charge(s, p.id, c.amount, -1, 'tax');
        break;
      case 'omad': case 'mahalla':
        drawCard(s, p, c.t);
        break;
      case 'gotojail':
        sendToJail(s, p);
        break;
      case 'parking':
        if (s.settings.jackpot && s.pot > 0) {
          const v = s.pot; s.pot = 0; ev(s, { k: 'pot', pot: 0 });
          credit(s, p.id, v, 'pot');
          log(s, `${p.name} choyxonadagi xazinani oldi: +${fmt(v)} 🎉`);
        } else log(s, `${p.name} choyxonada dam olmoqda ☕`);
        break;
    }
  }

  function drawCard(s, p, deck) {
    const id = s.decks[deck].shift();
    const card = CARDS[deck][id];
    if (card.a !== 'jailfree') s.decks[deck].push(id);
    s.lastCard = { deck, id, pid: p.id };
    ev(s, { k: 'card', deck, id, pid: p.id, text: card.text });
    log(s, `${p.name} — ${deck === 'omad' ? 'Omad' : 'Mahalla'}: ${card.text}`);
    switch (card.a) {
      case 'goto': moveTo(s, p, card.to, true); land(s, p); break;
      case 'money':
        if (card.v > 0) credit(s, p.id, card.v, 'card'); else charge(s, p.id, -card.v, -1, 'card');
        break;
      case 'jailfree': p.jailCards.push({ deck, id }); break;
      case 'jail': sendToJail(s, p); break;
      case 'back': moveBack(s, p, card.n); land(s, p); break;
      case 'nearest': {
        const list = card.kind === 'metro' ? METROS : UTILS;
        let to = list.find(x => x > p.pos); if (to === undefined) to = list[0];
        moveTo(s, p, to, true); land(s, p, card.kind === 'metro' ? 'double' : 'ten');
        break;
      }
      case 'repairs': {
        const { h, H } = houseCount(s, p.id);
        const cost = h * card.h + H * card.H;
        if (cost > 0) charge(s, p.id, cost, -1, 'card'); else log(s, `${p.name}da bino yo'q — to'lov yo'q.`);
        break;
      }
      case 'eachPay':
        alive(s).forEach(o => { if (o.id !== p.id) charge(s, p.id, card.v, o.id, 'card'); });
        break;
      case 'eachGet':
        alive(s).forEach(o => { if (o.id !== p.id) charge(s, o.id, card.v, p.id, 'card'); });
        break;
    }
  }

  function proceed(s) {
    if (s.phase === 'gameover') return;
    if (!settleDebts(s)) { s.phase = 'debt'; return; }
    if (s.pendingBuy !== null) { s.phase = 'buy'; return; }
    const p = s.players[s.turn];
    if (p.bankrupt) { nextTurn(s); return; }
    s.phase = (s.rollAgain && !p.inJail) ? 'roll' : 'end';
  }

  function nextTurn(s) {
    const cur = s.players[s.turn];
    cur.doubles = 0;
    s.rollAgain = false;
    let n = s.turn;
    for (let k = 0; k < s.players.length; k++) {
      n = (n + 1) % s.players.length;
      if (!s.players[n].bankrupt) break;
    }
    if (n <= s.turn) s.round++;
    s.turn = n; s.phase = 'roll'; s.turnCount++;
    if (s.settings.maxRounds && s.round > s.settings.maxRounds) { finishByWorth(s); return; }
    s.lastCard = null; s.pendingBuy = null;
    ev(s, { k: 'turn', pid: n });
  }

  function checkWinner(s) {
    const a = alive(s);
    if (a.length === 1) {
      s.phase = 'gameover'; s.winner = a[0].id; s.trade = null; s.auction = null; s.debts = [];
      log(s, `🏆 ${a[0].name} g'olib bo'ldi!`);
      ev(s, { k: 'win', pid: a[0].id });
      return true;
    }
    return false;
  }

  function finishByWorth(s) {
    const a = alive(s).slice().sort((x, y) => netWorth(s, y.id) - netWorth(s, x.id));
    s.round = s.settings.maxRounds;
    s.phase = 'gameover'; s.winner = a[0].id; s.trade = null; s.auction = null; s.debts = [];
    log(s, `⏱ Raundlar tugadi! Eng boy o'yinchi — ${a[0].name} (${fmt(netWorth(s, a[0].id))}) g'olib!`);
    ev(s, { k: 'win', pid: a[0].id });
  }

  function doBankrupt(s, pid) {
    const p = s.players[pid];
    const d = s.debts.find(x => x.pid === pid);
    const creditor = d ? d.to : -1;
    // Binolar bankka yarim narxda sotiladi
    ownedBy(s, pid).forEach(i => {
      const pr = s.props[i], c = CELLS[i];
      if (c.t === 'street' && pr.houses > 0) { p.money += pr.houses * GROUPS[c.g].house / 2; pr.houses = 0; }
    });
    const heir = creditor >= 0 && !s.players[creditor].bankrupt ? s.players[creditor] : null;
    if (heir) {
      if (p.money > 0) { heir.money += p.money; ev(s, { k: 'money', pid: heir.id, delta: p.money, reason: 'bankrupt' }); }
      ownedBy(s, pid).forEach(i => { s.props[i].owner = heir.id; });
      heir.jailCards.push(...p.jailCards);
      log(s, `💥 ${p.name} bankrot bo'ldi! Barcha mulki ${heir.name}ga o'tdi.`);
    } else {
      ownedBy(s, pid).forEach(i => { s.props[i] = { owner: -1, houses: 0, mortgaged: false }; });
      p.jailCards.forEach(jc => s.decks[jc.deck].push(jc.id));
      log(s, `💥 ${p.name} bankrot bo'ldi! Mulklari bankka qaytdi.`);
    }
    p.jailCards = []; p.money = 0; p.bankrupt = true; p.inJail = false;
    s.debts = s.debts.filter(x => x.pid !== pid);
    s.debts.forEach(x => { if (x.to === pid) x.to = -1; });
    if (s.trade && (s.trade.from === pid || s.trade.to === pid)) s.trade = null;
    if (s.auction) {
      s.auction.active = s.auction.active.filter(x => x !== pid);
      if (s.auction.leader === pid) { s.auction.leader = -1; s.auction.bid = 0; }
    }
    ev(s, { k: 'bankrupt', pid });
    if (checkWinner(s)) return;
    if (s.phase === 'auction' && s.auction) { auctionAdvance(s, true); return; }
    proceed(s);
  }

  // ---------- Auksion ----------
  function startAuction(s, cell) {
    const order = [];
    for (let k = 0; k < s.players.length; k++) {
      const pl = s.players[(s.turn + k) % s.players.length];
      if (!pl.bankrupt) order.push(pl.id);
    }
    s.auction = { cell, bid: 0, leader: -1, active: order, idx: 0 };
    s.phase = 'auction';
    log(s, `🔨 ${CELLS[cell].name} auksionga qo'yildi.`);
    ev(s, { k: 'auction', cell });
    skipBrokeBidders(s);
  }
  function skipBrokeBidders(s) {
    // Navbatni yetakchidan o'tkazamiz; pulga qurbi yetmaydiganlar avtomatik chiqadi
    const a = s.auction;
    let guard = 0;
    while (guard++ < 60) {
      if (finishAuctionIfDone(s)) return;
      if (a.idx >= a.active.length) a.idx = 0;
      const pid = a.active[a.idx];
      if (pid === a.leader) { a.idx = (a.idx + 1) % a.active.length; continue; }
      if (s.players[pid].money >= a.bid + 10) return;
      a.active.splice(a.idx, 1);
    }
  }
  function finishAuctionIfDone(s) {
    const a = s.auction;
    if (!a) return true;
    const others = a.active.filter(x => x !== a.leader);
    if (others.length === 0) {
      if (a.leader >= 0) {
        const w = s.players[a.leader];
        w.money -= a.bid; ev(s, { k: 'money', pid: w.id, delta: -a.bid, reason: 'buy' });
        s.props[a.cell].owner = w.id;
        ev(s, { k: 'buy', pid: w.id, cell: a.cell });
        log(s, `🔨 ${w.name} ${CELLS[a.cell].name}ni ${fmt(a.bid)}ga yutib oldi.`);
      } else log(s, `Hech kim taklif bermadi — ${CELLS[a.cell].name} bankda qoldi.`);
      s.auction = null; s.pendingBuy = null;
      s.phase = 'x';
      proceed(s);
      return true;
    }
    return false;
  }
  function auctionAdvance(s, removedCurrent) {
    const a = s.auction;
    if (!a) return;
    if (!removedCurrent) a.idx++;
    if (a.idx >= a.active.length) a.idx = 0;
    skipBrokeBidders(s);
  }

  // ---------- Qurilish tekshiruvlari ----------
  function canBuild(s, pid, i) {
    const c = CELLS[i], pr = s.props[i];
    if (!c || c.t !== 'street' || pr.owner !== pid) return 'Bu sizning mulkingiz emas';
    if (!ownsGroup(s, pid, c.g)) return 'Avval shu rangdagi barcha mulklarni yig\'ing';
    if (GROUP_CELLS[c.g].some(j => s.props[j].mortgaged)) return 'Guruhda garovdagi mulk bor';
    if (pr.houses >= 5) return 'Mehmonxona allaqachon bor';
    if (s.settings.evenBuild) {
      const min = Math.min(...GROUP_CELLS[c.g].map(j => s.props[j].houses));
      if (pr.houses > min) return 'Uylarni teng qurish kerak';
    }
    if (s.players[pid].money < GROUPS[c.g].house) return 'Pul yetmaydi';
    return null;
  }
  function canSell(s, pid, i) {
    const c = CELLS[i], pr = s.props[i];
    if (!c || c.t !== 'street' || pr.owner !== pid) return 'Bu sizning mulkingiz emas';
    if (pr.houses <= 0) return 'Bino yo\'q';
    if (s.settings.evenBuild) {
      const max = Math.max(...GROUP_CELLS[c.g].map(j => s.props[j].houses));
      if (pr.houses < max) return 'Uylarni teng sotish kerak';
    }
    return null;
  }
  function canMortgage(s, pid, i) {
    const c = CELLS[i], pr = s.props[i];
    if (!c || !c.price || pr.owner !== pid) return 'Bu sizning mulkingiz emas';
    if (pr.mortgaged) return 'Allaqachon garovda';
    if (c.t === 'street' && groupHasHouses(s, c.g)) return 'Avval guruhdagi uylarni soting';
    return null;
  }
  function canUnmortgage(s, pid, i) {
    const c = CELLS[i], pr = s.props[i];
    if (!c || !c.price || pr.owner !== pid) return 'Bu sizning mulkingiz emas';
    if (!pr.mortgaged) return 'Garovda emas';
    if (s.players[pid].money < unmortgageCost(i)) return 'Pul yetmaydi';
    return null;
  }
  function tradable(s, pid, i) {
    const c = CELLS[i], pr = s.props[i];
    if (!c || !c.price || pr.owner !== pid) return false;
    if (c.t === 'street' && groupHasHouses(s, c.g)) return false;
    return true;
  }
  function validTrade(s, t) {
    const A = s.players[t.from], B = s.players[t.to];
    if (!A || !B || A.bankrupt || B.bankrupt || t.from === t.to) return 'Noto\'g\'ri sherik';
    if ((t.give.money || 0) < 0 || (t.get.money || 0) < 0) return 'Noto\'g\'ri summa';
    if ((t.give.money || 0) > A.money) return `${A.name}da pul yetmaydi`;
    if ((t.get.money || 0) > B.money) return `${B.name}da pul yetmaydi`;
    if ((t.give.cards || 0) > A.jailCards.length || (t.get.cards || 0) > B.jailCards.length) return 'Karta yetmaydi';
    if (!t.give.cells.every(i => tradable(s, t.from, i))) return 'Berilayotgan mulk mos emas';
    if (!t.get.cells.every(i => tradable(s, t.to, i))) return 'So\'ralayotgan mulk mos emas';
    if (!t.give.cells.length && !t.get.cells.length && !t.give.money && !t.get.money && !t.give.cards && !t.get.cards) return 'Taklif bo\'sh';
    return null;
  }
  function execTrade(s, t) {
    const A = s.players[t.from], B = s.players[t.to];
    const gm = t.give.money || 0, rm = t.get.money || 0;
    if (gm) { A.money -= gm; B.money += gm; ev(s, { k: 'money', pid: A.id, delta: -gm }); ev(s, { k: 'money', pid: B.id, delta: gm }); }
    if (rm) { B.money -= rm; A.money += rm; ev(s, { k: 'money', pid: B.id, delta: -rm }); ev(s, { k: 'money', pid: A.id, delta: rm }); }
    t.give.cells.forEach(i => { s.props[i].owner = B.id; });
    t.get.cells.forEach(i => { s.props[i].owner = A.id; });
    for (let k = 0; k < (t.give.cards || 0); k++) B.jailCards.push(A.jailCards.pop());
    for (let k = 0; k < (t.get.cards || 0); k++) A.jailCards.push(B.jailCards.pop());
    ev(s, { k: 'trade', from: A.id, to: B.id });
  }

  // ---------- Asosiy harakat funksiyasi ----------
  // act(s, pid, {a:'roll'|...}) -> null (muvaffaqiyat) yoki xato matni
  function act(s, pid, action, rnd) {
    rnd = rnd || Math.random;
    const a = action.a;
    const p = s.players[pid];
    if (!p) return 'O\'yinchi topilmadi';
    if (s.phase === 'gameover') return 'O\'yin tugagan';
    const myTurn = s.turn === pid;
    const manageOK = (!s.trade && myTurn && ['roll', 'end', 'buy'].includes(s.phase)) ||
                     (s.phase === 'debt' && s.debts.length && s.debts[0].pid === pid);

    switch (a) {
      case 'roll': {
        if (!myTurn || s.phase !== 'roll' || s.trade) return 'Hozir zar tashlab bo\'lmaydi';
        const d1 = 1 + Math.floor(rnd() * 6), d2 = 1 + Math.floor(rnd() * 6);
        s.dice = [d1, d2];
        const dbl = d1 === d2, sum = d1 + d2;
        ev(s, { k: 'dice', d: [d1, d2], pid });
        s.lastCard = null;
        if (p.inJail) {
          if (dbl) {
            p.inJail = false; p.jailTurns = 0; s.rollAgain = false;
            log(s, `${p.name} dubl tashladi va qamoqdan chiqdi!`);
            moveTo(s, p, (p.pos + sum) % 40, true); land(s, p);
          } else {
            p.jailTurns++;
            if (p.jailTurns >= 3) {
              log(s, `${p.name} 3-urinishda ham chiqa olmadi — ${fmt(JAIL_FINE)} jarima to'laydi.`);
              p.inJail = false; p.jailTurns = 0; s.rollAgain = false;
              charge(s, pid, JAIL_FINE, -1, 'jail');
              moveTo(s, p, (p.pos + sum) % 40, true); land(s, p);
            } else {
              log(s, `${p.name} qamoqda qoldi (${p.jailTurns}/3).`);
              s.rollAgain = false;
            }
          }
        } else {
          if (dbl) {
            p.doubles++;
            if (p.doubles >= 3) { log(s, `${p.name} ketma-ket 3 marta dubl tashladi!`); sendToJail(s, p); proceed(s); return null; }
            s.rollAgain = true;
          } else s.rollAgain = false;
          moveTo(s, p, (p.pos + sum) % 40, true);
          land(s, p);
        }
        proceed(s);
        return null;
      }
      case 'payJail': {
        if (!myTurn || s.phase !== 'roll' || !p.inJail) return 'Mumkin emas';
        if (p.money < JAIL_FINE) return 'Pul yetmaydi';
        p.money -= JAIL_FINE; ev(s, { k: 'money', pid, delta: -JAIL_FINE, reason: 'jail' });
        credit(s, s.settings.jackpot ? -2 : -1, JAIL_FINE, 'jail');
        p.inJail = false; p.jailTurns = 0;
        ev(s, { k: 'free', pid });
        log(s, `${p.name} jarima to'lab qamoqdan chiqdi.`);
        return null;
      }
      case 'useCard': {
        if (!myTurn || s.phase !== 'roll' || !p.inJail || !p.jailCards.length) return 'Mumkin emas';
        const jc = p.jailCards.pop(); s.decks[jc.deck].push(jc.id);
        p.inJail = false; p.jailTurns = 0;
        ev(s, { k: 'free', pid });
        log(s, `${p.name} ozodlik kartasini ishlatdi.`);
        return null;
      }
      case 'buy': {
        if (!myTurn || s.phase !== 'buy') return 'Mumkin emas';
        const i = s.pendingBuy, c = CELLS[i];
        if (p.money < c.price) return 'Pul yetmaydi';
        p.money -= c.price; ev(s, { k: 'money', pid, delta: -c.price, reason: 'buy' });
        s.props[i].owner = pid; s.pendingBuy = null;
        ev(s, { k: 'buy', pid, cell: i });
        log(s, `${p.name} ${c.name}ni ${fmt(c.price)}ga sotib oldi.`);
        proceed(s);
        return null;
      }
      case 'decline': {
        if (!myTurn || s.phase !== 'buy') return 'Mumkin emas';
        const i = s.pendingBuy;
        if (s.settings.auction) { startAuction(s, i); }
        else { s.pendingBuy = null; log(s, `${p.name} ${CELLS[i].name}ni sotib olmadi.`); proceed(s); }
        return null;
      }
      case 'bid': {
        if (s.phase !== 'auction' || awaiting(s) !== pid) return 'Navbat sizda emas';
        const amt = Math.round(action.amount);
        if (!(amt > s.auction.bid)) return 'Taklif joriy narxdan yuqori bo\'lishi kerak';
        if (amt > p.money) return 'Pul yetmaydi';
        s.auction.bid = amt; s.auction.leader = pid;
        ev(s, { k: 'bid', pid, amount: amt });
        auctionAdvance(s, false);
        return null;
      }
      case 'pass': {
        if (s.phase !== 'auction' || awaiting(s) !== pid) return 'Navbat sizda emas';
        const au = s.auction;
        au.active.splice(au.idx, 1);
        ev(s, { k: 'passbid', pid });
        auctionAdvance(s, true);
        return null;
      }
      case 'build': {
        if (!manageOK || s.phase === 'debt') return 'Hozir qurib bo\'lmaydi';
        const err = canBuild(s, pid, action.cell); if (err) return err;
        const c = CELLS[action.cell], cost = GROUPS[c.g].house;
        p.money -= cost; s.props[action.cell].houses++;
        ev(s, { k: 'money', pid, delta: -cost, reason: 'build' });
        ev(s, { k: 'build', pid, cell: action.cell });
        log(s, `${p.name} ${c.name}da ${s.props[action.cell].houses === 5 ? 'mehmonxona' : 'uy'} qurdi.`);
        return null;
      }
      case 'sell': {
        if (!manageOK) return 'Hozir sotib bo\'lmaydi';
        const err = canSell(s, pid, action.cell); if (err) return err;
        const c = CELLS[action.cell], back = GROUPS[c.g].house / 2;
        s.props[action.cell].houses--; p.money += back;
        ev(s, { k: 'money', pid, delta: back, reason: 'sell' });
        ev(s, { k: 'build', pid, cell: action.cell });
        log(s, `${p.name} ${c.name}dagi binoni sotdi (+${fmt(back)}).`);
        return null;
      }
      case 'mortgage': {
        if (!manageOK) return 'Hozir garovga qo\'yib bo\'lmaydi';
        const err = canMortgage(s, pid, action.cell); if (err) return err;
        const c = CELLS[action.cell], v = c.price / 2;
        s.props[action.cell].mortgaged = true; p.money += v;
        ev(s, { k: 'money', pid, delta: v, reason: 'mortgage' });
        log(s, `${p.name} ${c.name}ni garovga qo'ydi (+${fmt(v)}).`);
        return null;
      }
      case 'unmortgage': {
        if (!manageOK || s.phase === 'debt') return 'Hozir mumkin emas';
        const err = canUnmortgage(s, pid, action.cell); if (err) return err;
        const cost = unmortgageCost(action.cell);
        s.props[action.cell].mortgaged = false; p.money -= cost;
        ev(s, { k: 'money', pid, delta: -cost, reason: 'unmortgage' });
        log(s, `${p.name} ${CELLS[action.cell].name}ni garovdan chiqardi.`);
        return null;
      }
      case 'pay': {
        if (s.phase !== 'debt' || !s.debts.length || s.debts[0].pid !== pid) return 'Qarz yo\'q';
        if (p.money < s.debts[0].amount) return 'Pul hali yetmaydi';
        proceed(s);
        return null;
      }
      case 'bankrupt': {
        if (s.phase !== 'debt' || !s.debts.length || s.debts[0].pid !== pid) return 'Mumkin emas';
        doBankrupt(s, pid);
        return null;
      }
      case 'trade': {
        if (!myTurn || !['roll', 'end'].includes(s.phase) || s.trade) return 'Hozir savdo qilib bo\'lmaydi';
        const t = { from: pid, to: action.to, give: norm(action.give), get: norm(action.get) };
        const err = validTrade(s, t); if (err) return err;
        s.trade = t;
        ev(s, { k: 'tradeOffer', from: pid, to: t.to });
        log(s, `🤝 ${p.name} ${s.players[t.to].name}ga savdo taklif qildi.`);
        return null;
      }
      case 'tradeReply': {
        if (!s.trade || s.trade.to !== pid) return 'Taklif yo\'q';
        const t = s.trade; s.trade = null;
        if (action.accept) {
          const err = validTrade(s, t);
          if (err) { log(s, `Savdo bekor: ${err}`); ev(s, { k: 'tradeResult', ok: false, from: t.from, to: t.to }); return null; }
          execTrade(s, t);
          log(s, `✅ ${p.name} savdoni qabul qildi.`);
          ev(s, { k: 'tradeResult', ok: true, from: t.from, to: t.to });
        } else {
          log(s, `❌ ${p.name} savdoni rad etdi.`);
          ev(s, { k: 'tradeResult', ok: false, from: t.from, to: t.to });
        }
        return null;
      }
      case 'cancelTrade': {
        if (!s.trade || s.trade.from !== pid) return 'Taklif yo\'q';
        s.trade = null; log(s, `${p.name} savdo taklifini qaytarib oldi.`);
        return null;
      }
      case 'endTurn': {
        if (!myTurn || s.phase !== 'end' || s.trade) return 'Hozir navbatni tugatib bo\'lmaydi';
        nextTurn(s);
        return null;
      }
      case 'resign': {
        // O'yinchi o'yindan chiqadi (onlaynda uzilib qolganda ham)
        if (p.bankrupt) return 'Allaqachon chiqqan';
        const prev = s.phase;
        if (!(s.phase === 'debt' && s.debts.length && s.debts[0].pid === pid)) {
          s.debts = s.debts.filter(x => x.pid !== pid);
          s.debts.unshift({ pid, amount: 0, to: -1, reason: 'resign' });
        }
        doBankrupt(s, pid);
        if (s.phase !== 'gameover' && s.turn !== pid && ['roll', 'end', 'buy'].includes(prev) && !s.debts.length && !s.auction) s.phase = prev;
        return null;
      }
    }
    return 'Noma\'lum harakat';
  }
  function norm(x) {
    x = x || {};
    return { money: Math.max(0, Math.round(x.money || 0)), cells: (x.cells || []).slice(), cards: x.cards || 0 };
  }

  const Engine = {
    GROUPS, CELLS, CARDS, GROUP_CELLS, METROS, UTILS, OWNABLE, GO_SALARY, JAIL_FINE, JAIL_POS,
    newGame, act, awaiting, rentFor, fmt, ownedBy, ownsGroup, groupHasHouses, netWorth, liquidValue,
    canBuild, canSell, canMortgage, canUnmortgage, unmortgageCost, tradable, validTrade, alive, countType,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
