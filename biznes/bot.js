/* Toshkent Biznes — kompyuter raqiblar (bot) mantiqi */
(function (root) {
  'use strict';
  const E = (typeof module !== 'undefined' && module.exports) ? require('./engine.js') : root.Engine;
  const { CELLS, GROUPS, GROUP_CELLS, OWNABLE } = E;

  // Uy qurish uchun foydaliroq guruhlar tartibi
  const BUILD_PRIORITY = ['orange', 'red', 'lblue', 'pink', 'yellow', 'dblue', 'green', 'brown'];

  function maxDanger(s, pid) {
    // Raqiblarning eng katta ijarasi — pul zaxirasini belgilash uchun
    let m = 0;
    OWNABLE.forEach(i => {
      const pr = s.props[i];
      if (pr.owner >= 0 && pr.owner !== pid && !pr.mortgaged) m = Math.max(m, E.rentFor(s, i, 8));
    });
    return m;
  }
  function reserve(s, pid, level) {
    const d = maxDanger(s, pid);
    if (level === 'easy') return 200 + d * 0.2;
    if (level === 'hard') return Math.min(6000, 400 + d * 0.4);
    return Math.min(5000, 900 + d * 0.45);
  }
  function groupStat(s, pid, g) {
    const cells = GROUP_CELLS[g];
    const mine = cells.filter(i => s.props[i].owner === pid).length;
    const owners = new Set(cells.map(i => s.props[i].owner).filter(o => o >= 0 && o !== pid));
    return { total: cells.length, mine, others: owners.size, free: cells.filter(i => s.props[i].owner < 0).length };
  }
  // Mulkning shu o'yinchi uchun qiymati
  function valueFor(s, pid, i, extraOwned) {
    const c = CELLS[i];
    let v = c.price;
    if (c.t === 'street') {
      const cells = GROUP_CELLS[c.g];
      const have = cells.filter(j => s.props[j].owner === pid || (extraOwned && extraOwned.includes(j))).length;
      if (have === cells.length - 1) v *= 2.6;       // to'plamni yakunlaydi
      else if (have >= 1) v *= 1.35;
      // raqib to'plamini to'sadi
      const opp = {};
      cells.forEach(j => { const o = s.props[j].owner; if (o >= 0 && o !== pid) opp[o] = (opp[o] || 0) + 1; });
      if (Object.values(opp).some(n => n === cells.length - 1)) v *= 1.5;
    } else if (c.t === 'metro') {
      v *= 1 + 0.3 * E.countType(s, pid, E.METROS);
    }
    return v;
  }
  function tradeGain(s, pid, t) {
    // pid = qabul qiluvchi; t.give — taklif qiluvchi beradi (pid oladi)
    const other = t.from;
    let gain = (t.give.money || 0) - (t.get.money || 0);
    gain += ((t.give.cards || 0) - (t.get.cards || 0)) * 300;
    t.give.cells.forEach(i => { gain += valueFor(s, pid, i, t.give.cells) * (s.props[i].mortgaged ? 0.55 : 1); });
    t.get.cells.forEach(i => {
      const c = CELLS[i];
      let v = c.price;
      if (c.t === 'street') {
        const cells = GROUP_CELLS[c.g];
        const myHave = cells.filter(j => s.props[j].owner === pid).length;
        if (myHave >= 2) v *= 1.5; else if (myHave === 1) v *= 1.2;
        const oppHave = cells.filter(j => s.props[j].owner === other || t.get.cells.includes(j)).length;
        if (oppHave === cells.length) v += c.price * 1.6;   // raqibga to'plam beradi
      } else if (c.t === 'metro') v *= 1 + 0.25 * E.countType(s, pid, E.METROS);
      if (s.props[i].mortgaged) v *= 0.55;
      gain -= v;
    });
    return gain;
  }

  function debtAction(s, pid) {
    const p = s.players[pid];
    const d = s.debts[0];
    if (p.money >= d.amount) return { a: 'pay' };
    if (E.liquidValue(s, pid) < d.amount) return { a: 'bankrupt' };
    // 1) garovga qo'yish — to'plamda bo'lmagan arzon mulklar
    const mine = E.ownedBy(s, pid);
    const mortgageable = mine.filter(i => !E.canMortgage(s, pid, i));
    const nonSet = mortgageable.filter(i => CELLS[i].t !== 'street' || !E.ownsGroup(s, pid, CELLS[i].g));
    const pick = (list) => list.sort((a, b) => CELLS[a].price - CELLS[b].price)[0];
    if (nonSet.length) return { a: 'mortgage', cell: pick(nonSet) };
    // 2) uylarni sotish
    const sellable = mine.filter(i => !E.canSell(s, pid, i));
    if (sellable.length) {
      sellable.sort((a, b) => s.props[b].houses - s.props[a].houses || CELLS[a].price - CELLS[b].price);
      return { a: 'sell', cell: sellable[0] };
    }
    if (mortgageable.length) return { a: 'mortgage', cell: pick(mortgageable) };
    return { a: 'bankrupt' };
  }

  function manageAction(s, pid, level) {
    const p = s.players[pid];
    const res = reserve(s, pid, level);
    // Garovdan chiqarish (avval to'plamdagilar)
    const mort = E.ownedBy(s, pid).filter(i => s.props[i].mortgaged);
    if (mort.length) {
      mort.sort((a, b) => {
        const sa = CELLS[a].t === 'street' && E.ownsGroup(s, pid, CELLS[a].g) ? 0 : 1;
        const sb = CELLS[b].t === 'street' && E.ownsGroup(s, pid, CELLS[b].g) ? 0 : 1;
        return sa - sb || CELLS[a].price - CELLS[b].price;
      });
      const i = mort[0];
      if (p.money - E.unmortgageCost(i) >= res * 1.3) return { a: 'unmortgage', cell: i };
    }
    // Uy qurish
    for (const g of BUILD_PRIORITY) {
      if (!E.ownsGroup(s, pid, g)) continue;
      const cost = GROUPS[g].house;
      if (p.money - cost < res) continue;
      const cells = GROUP_CELLS[g].filter(i => !E.canBuild(s, pid, i));
      if (!cells.length) continue;
      cells.sort((a, b) => s.props[a].houses - s.props[b].houses || CELLS[b].price - CELLS[a].price);
      // Oson bot 3 uydan keyin to'xtaydi
      if (level === 'easy' && s.props[cells[0]].houses >= 3) continue;
      return { a: 'build', cell: cells[0] };
    }
    return null;
  }

  function tradeProposal(s, pid, level) {
    if (level === 'easy') return null;
    const p = s.players[pid];
    s._bt = s._bt || {};
    const last = s._bt['t' + pid] || -99;
    if (s.turnCount - last < 3 * s.players.length) return null;
    const res = reserve(s, pid, level);
    for (const g of BUILD_PRIORITY) {
      const cells = GROUP_CELLS[g];
      const mine = cells.filter(i => s.props[i].owner === pid);
      if (mine.length !== cells.length - 1) continue;
      const miss = cells.find(i => s.props[i].owner !== pid);
      const owner = s.props[miss].owner;
      if (owner < 0 || s.players[owner].bankrupt || !E.tradable(s, owner, miss)) continue;
      if (mine.some(i => !E.tradable(s, pid, i))) continue;
      const key = pid + '-' + miss;
      const tries = s._bt[key] || 0;
      if (tries >= 3) continue;
      // Almashuv uchun mulk: sherikka to'plam beradigani bo'lsa — eng yaxshisi
      const spare = E.ownedBy(s, pid).filter(i => E.tradable(s, pid, i) && !(CELLS[i].t === 'street' && CELLS[i].g === g) &&
        !(CELLS[i].t === 'street' && E.ownsGroup(s, pid, CELLS[i].g)));
      spare.sort((a, b) => valueFor(s, owner, b) - valueFor(s, owner, a));
      const t = { from: pid, to: owner, give: { money: 0, cells: [] }, get: { money: 0, cells: [miss] } };
      const myWorth = CELLS[miss].price * (level === 'hard' ? 3.4 : 3);
      if (spare.length && valueFor(s, owner, spare[0]) >= CELLS[miss].price * 1.5) t.give.cells.push(spare[0]);
      let gain = tradeGain(s, owner, t);
      const need = 100 + tries * 250;
      if (gain < need) t.give.money = Math.ceil((need - gain) / 50) * 50;
      const giveVal = t.give.money + t.give.cells.reduce((n, i) => n + CELLS[i].price, 0);
      if (giveVal > myWorth || p.money - t.give.money < res * 0.4) continue;
      s._bt[key] = tries + 1;
      s._bt['t' + pid] = s.turnCount;
      return { a: 'trade', to: owner, give: t.give, get: t.get };
    }
    return null;
  }

  function decide(s, pid) {
    const p = s.players[pid];
    const level = p.level || 'medium';
    const res = reserve(s, pid, level);

    if (s.trade && s.trade.to === pid) {
      const g = tradeGain(s, pid, s.trade);
      const need = level === 'hard' ? 80 : level === 'easy' ? -200 : 0;
      return { a: 'tradeReply', accept: g >= need };
    }
    if (s.trade && s.trade.from === pid) return null; // javob kutilmoqda

    switch (s.phase) {
      case 'debt': return debtAction(s, pid);
      case 'buy': {
        const i = s.pendingBuy, c = CELLS[i];
        const v = valueFor(s, pid, i);
        const special = v > c.price * 1.4;
        let ok;
        if (level === 'easy') ok = p.money >= c.price && (p.money - c.price > 100 || Math.random() < 0.5);
        else ok = p.money >= c.price && (p.money - c.price >= res * (level === 'hard' ? 0.25 : 0.45) || (special && p.money - c.price >= 0));
        return { a: ok ? 'buy' : 'decline' };
      }
      case 'auction': {
        const au = s.auction, c = CELLS[au.cell];
        let max = valueFor(s, pid, au.cell) * (level === 'easy' ? 0.6 + Math.random() * 0.3 : level === 'hard' ? 1.15 : 0.9);
        max = Math.min(max, p.money - res * 0.3);
        const step = au.bid < 1000 ? 50 : 100;
        const next = Math.max(au.bid + step, au.bid === 0 ? Math.round(c.price * 0.3 / 10) * 10 : 0);
        if (next <= max && next <= p.money) return { a: 'bid', amount: next };
        return { a: 'pass' };
      }
      case 'roll': {
        if (p.inJail) {
          const board = E.OWNABLE.reduce((n, i) => n + (s.props[i].owner >= 0 && s.props[i].owner !== pid ? s.props[i].houses : 0), 0);
          const stay = level !== 'easy' && board >= 8;
          if (!stay) {
            if (p.jailCards.length) return { a: 'useCard' };
            if (p.money >= E.JAIL_FINE + res * 0.5) return { a: 'payJail' };
          }
          return { a: 'roll' };
        }
        const m = manageAction(s, pid, level); if (m) return m;
        return { a: 'roll' };
      }
      case 'end': {
        const m = manageAction(s, pid, level); if (m) return m;
        const t = tradeProposal(s, pid, level); if (t && !E.validTrade(s, { from: pid, to: t.to, give: t.give, get: t.get })) return t;
        return { a: 'endTurn' };
      }
    }
    return null;
  }

  const Bot = { decide, tradeGain, valueFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = Bot;
  else root.Bot = Bot;
})(typeof window !== 'undefined' ? window : globalThis);
