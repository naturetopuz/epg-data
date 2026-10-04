/* Toshkent Biznes — onlayn xona mantiqi (DOM'siz, Firebase Realtime Database ustida).
   `firebaseLike` — window.firebase (compat SDK) yoki test uchun soxta versiyasi. */
(function (root) {
  'use strict';
  const ROOT = 'biznes/rooms/';
  const COLORS = ['#E53935', '#1E88E5', '#43A047', '#F9A825', '#8E24AA', '#FB8C00'];

  function createRoomClient(firebaseLike, Engine) {
    const db = firebaseLike.database();
    const TS = (firebaseLike.database && firebaseLike.database.ServerValue && firebaseLike.database.ServerValue.TIMESTAMP) || Date.now();

    let code = null, myUid = null, mySeat = null, isHost = false, closed = false;
    let listeners = []; // {ref, evt, h}
    const hooks = {};
    function on(name, fn) { hooks[name] = fn; }
    function emit(name) { const f = hooks[name]; if (f) f.apply(null, Array.prototype.slice.call(arguments, 1)); }

    function r(path) { return db.ref(ROOT + path); }
    function track(ref, evt, h) { listeners.push({ ref, evt, h }); }

    function seatObj(p, type, level) {
      return { uid: p.uid, name: p.name, token: p.token, color: p.color || null, type: type, level: level || 'medium', connected: true };
    }
    function genCode() { return String(1000 + Math.floor(Math.random() * 9000)); }

    function createRoom(profile, settings) {
      myUid = profile.uid; isHost = true; mySeat = 0;
      let c;
      function tryCode(left) {
        c = genCode();
        return r(c).once('value').then(snap => {
          if (!snap.val()) return c;
          if (left <= 0) return c; // ehtimoli juda kam, baribir davom etamiz
          return tryCode(left - 1);
        });
      }
      return tryCode(8).then(finalCode => {
        code = finalCode;
        const room = { host: myUid, createdAt: TS, status: 'lobby', settings: settings, seats: { 0: seatObj(profile, 'human') } };
        return r(code).set(room).then(() => {
          try { r(code + '/seats/0/connected').onDisconnect().set(false); } catch (e) {}
          try { r(code).onDisconnect().update({ hostLeft: true }); } catch (e) {}
          listenLobby();
          return code;
        });
      });
    }

    function joinRoom(codeIn, profile) {
      return r(codeIn).once('value').then(snap => {
        const room = snap.val();
        if (!room) return { err: 'notfound' };
        if (room.status && room.status !== 'lobby') return { err: 'started' };
        const seats = room.seats || {};
        const idxs = Object.keys(seats).map(Number);
        myUid = profile.uid;
        let mine = idxs.find(i => seats[i] && seats[i].uid === myUid);
        let idx;
        if (mine !== undefined) idx = mine;
        else {
          if (idxs.length >= 6) return { err: 'full' };
          idx = 0; while (seats[idx]) idx++;
        }
        code = codeIn; isHost = false; mySeat = idx;
        return r(code + '/seats/' + idx).set(seatObj(profile, 'human')).then(() => {
          try { r(code + '/seats/' + idx + '/connected').onDisconnect().set(false); } catch (e) {}
          listenLobby();
          listenStatus();
          return { ok: true, seat: idx };
        });
      });
    }

    // Xonaga (allaqachon bo'lgan o'yinga) qayta ulanish — sahifa qayta ochilganda
    function rejoin(codeIn, profile, wasHost) {
      myUid = profile.uid; code = codeIn; isHost = !!wasHost;
      return r(code).once('value').then(snap => {
        const room = snap.val();
        if (!room) return { err: 'notfound' };
        const seats = room.seats || {};
        const idx = Object.keys(seats).map(Number).find(i => seats[i] && seats[i].uid === myUid);
        if (idx === undefined) return { err: 'notfound' };
        mySeat = idx;
        r(code + '/seats/' + idx + '/connected').set(true);
        try { r(code + '/seats/' + idx + '/connected').onDisconnect().set(false); } catch (e) {}
        if (room.status === 'playing') {
          listenSync();
          return r(code + '/sync').once('value').then(s2 => {
            const sync = s2.val();
            emit('start', sync ? sync.state : null, mySeat, isHost ? 'host' : 'guest');
            return { ok: true, playing: true };
          });
        }
        listenLobby();
        if (!isHost) listenStatus();
        return { ok: true, playing: false };
      });
    }

    function listenLobby() {
      const rs = r(code + '/seats');
      const cb = snap => emit('lobby', snap.val() || {});
      rs.on('value', cb); track(rs, 'value', cb);
      const rset = r(code + '/settings');
      const cb2 = snap => emit('settings', snap.val() || {});
      rset.on('value', cb2); track(rset, 'value', cb2);
      const rh = r(code + '/hostLeft');
      const cb3 = snap => { if (snap.val() && !isHost) emit('hostLeft'); };
      rh.on('value', cb3); track(rh, 'value', cb3);
    }

    function listenStatus() {
      const rst = r(code + '/status');
      const cb = snap => { if (snap.val() === 'playing') beginPlayingAsGuest(); };
      rst.on('value', cb); track(rst, 'value', cb);
    }

    function beginPlayingAsGuest() {
      listenSync();
      r(code + '/sync').once('value').then(snap => {
        const sync = snap.val();
        emit('start', sync ? sync.state : null, mySeat, 'guest');
      });
    }

    let lastSeenSeq = -1, syncAttached = false;
    function listenSync() {
      if (syncAttached) return;
      syncAttached = true;
      const rsync = r(code + '/sync');
      const cb = snap => {
        const v = snap.val(); if (!v) return;
        if (v.seq === lastSeenSeq) return;
        lastSeenSeq = v.seq;
        emit('sync', v.state, v.evs || null);
      };
      rsync.on('value', cb); track(rsync, 'value', cb);
      if (isHost) {
        const ract = r(code + '/actions');
        const cba = snap => emit('action', snap.val());
        ract.on('child_added', cba); track(ract, 'child_added', cba);
      }
    }

    function addBot(name, token, level) {
      if (!isHost || closed) return Promise.resolve();
      return r(code + '/seats').once('value').then(snap => {
        const seats = snap.val() || {};
        let idx = 0; while (seats[idx] && idx < 6) idx++;
        if (idx > 5) return;
        const uid = 'bot_' + idx + '_' + Math.random().toString(36).slice(2, 8);
        return r(code + '/seats/' + idx).set(seatObj({ uid, name, token, color: COLORS[idx] }, 'bot', level || 'medium'));
      });
    }
    function removeSeat(idx) {
      if (!isHost || idx === 0 || closed) return Promise.resolve();
      return r(code + '/seats/' + idx).remove();
    }
    function setSeatLevel(idx, level) {
      if (!isHost || closed) return Promise.resolve();
      return r(code + '/seats/' + idx + '/level').set(level);
    }
    function updateSettings(patch) {
      if (!isHost || closed) return Promise.resolve();
      return r(code + '/settings').update(patch);
    }

    function start() {
      if (!isHost || closed) return Promise.resolve();
      return r(code + '/seats').once('value').then(snap => {
        const seats = snap.val() || {};
        const order = Object.keys(seats).map(Number).sort((a, b) => a - b);
        return r(code + '/settings').once('value').then(s2 => {
          const settings = s2.val() || {};
          const players = order.map((i, k) => ({ name: seats[i].name, token: seats[i].token, color: seats[i].color || COLORS[k % COLORS.length], type: seats[i].type, level: seats[i].level, uid: seats[i].uid }));
          const state = Engine.newGame({ players, settings });
          // Xona ichidagi pid = order ro'yxatidagi o'rin (0..n-1); saqlab qo'yamiz
          const seatToPid = {}; order.forEach((seatIdx, pid) => { seatToPid[seatIdx] = pid; });
          mySeat = seatToPid[mySeat];
          return r(code).update({ status: 'playing', seatToPid }).then(() => {
            return r(code + '/sync').set({ seq: 1, state, evs: null }).then(() => {
              listenSync();
              emit('start', state, mySeat, 'host');
            });
          });
        });
      });
    }

    function sendAction(pid, action) {
      if (closed || !code) return;
      r(code + '/actions').push({ pid, action, uid: myUid, ts: Date.now() });
    }
    let seqCounter = 1;
    function publish(state, evs) {
      if (closed || !code) return;
      seqCounter++;
      r(code + '/sync').set({ seq: seqCounter, state, evs });
    }

    function leave() {
      closed = true;
      listeners.forEach(l => { try { l.ref.off(l.evt, l.h); } catch (e) {} });
      listeners = [];
      if (code && mySeat !== null) {
        if (isHost) { try { r(code).remove(); } catch (e) {} }
        else { try { r(code + '/seats/' + mySeat).remove(); } catch (e) {} }
      }
    }
    function disconnectOnly() {
      // Vaqtincha uzilish (masalan ekranni yopish) — xonani o'chirmaydi
      closed = true;
      listeners.forEach(l => { try { l.ref.off(l.evt, l.h); } catch (e) {} });
      listeners = [];
    }

    return {
      on, createRoom, joinRoom, rejoin, addBot, removeSeat, setSeatLevel, updateSettings, start,
      sendAction, publish, leave, disconnectOnly,
      get code() { return code; }, get mySeat() { return mySeat; }, get isHost() { return isHost; },
    };
  }

  const RC = { createRoomClient, COLORS };
  if (typeof module !== 'undefined' && module.exports) module.exports = RC;
  else root.RoomClient = RC;
})(typeof window !== 'undefined' ? window : globalThis);
