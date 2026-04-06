(function () {
  var STORAGE_KEY = "voiceCompetitionVotes_v1";
  var BC_NAME = "voice-votes";
  var JURY_COUNT = 5;

  function defaultVotes() {
    var v = {};
    for (var i = 1; i <= JURY_COUNT; i++) v[i] = null;
    return v;
  }

  function normalizeVotes(raw) {
    var out = defaultVotes();
    if (!raw || typeof raw !== "object") return out;
    for (var k in raw) {
      if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
      var id = parseInt(k, 10);
      if (id >= 1 && id <= JURY_COUNT) {
        var val = raw[k];
        out[id] = val === "yes" || val === "no" ? val : null;
      }
    }
    return out;
  }

  function loadVotes() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultVotes();
      return normalizeVotes(JSON.parse(raw));
    } catch (e) {
      return defaultVotes();
    }
  }

  function saveVotes(votes) {
    var toStore = {};
    for (var i = 1; i <= JURY_COUNT; i++) toStore[i] = votes[i];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    try {
      var bc = new BroadcastChannel(BC_NAME);
      bc.postMessage({ type: "update" });
      bc.close();
    } catch (e) {}
  }

  function shouldUseWs() {
    return (
      window.location.protocol === "http:" ||
      window.location.protocol === "https:"
    );
  }

  function wsUrl() {
    var p = window.location.protocol === "https:" ? "wss:" : "ws:";
    return p + "//" + window.location.host;
  }

  var ws = null;
  var wsVotes = null;
  var wsConnected = false;
  var reconnectTimer = null;
  var subscribers = [];

  function notifyAll() {
    var snapshot;
    if (shouldUseWs()) {
      snapshot = wsVotes !== null ? wsVotes : defaultVotes();
    } else {
      snapshot = loadVotes();
    }
    for (var i = 0; i < subscribers.length; i++) {
      subscribers[i](snapshot);
    }
  }

  function applyServerVotes(raw) {
    wsVotes = normalizeVotes(raw);
    notifyAll();
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = window.setTimeout(function () {
      reconnectTimer = null;
      connectWs();
    }, 2000);
  }

  function connectWs() {
    if (!shouldUseWs()) return;
    if (ws && ws.readyState === WebSocket.OPEN) return;

    try {
      ws = new WebSocket(wsUrl());
    } catch (e) {
      scheduleReconnect();
      return;
    }

    ws.onopen = function () {
      wsConnected = true;
    };

    ws.onclose = function () {
      wsConnected = false;
      scheduleReconnect();
    };

    ws.onerror = function () {
      try {
        ws.close();
      } catch (e) {}
    };

    ws.onmessage = function (ev) {
      var msg;
      try {
        msg = JSON.parse(ev.data);
      } catch (e) {
        return;
      }
      if (msg && msg.type === "state" && msg.votes) {
        applyServerVotes(msg.votes);
      }
    };
  }

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function setVote(juryId, value) {
    if (juryId < 1 || juryId > JURY_COUNT) return;
    if (value !== "yes" && value !== "no") return;
    if (shouldUseWs()) {
      send({ type: "setVote", juryId: juryId, value: value });
      return;
    }
    var votes = loadVotes();
    votes[juryId] = value;
    saveVotes(votes);
  }

  function clearVote(juryId) {
    if (juryId < 1 || juryId > JURY_COUNT) return;
    if (shouldUseWs()) {
      send({ type: "clearVote", juryId: juryId });
      return;
    }
    var votes = loadVotes();
    votes[juryId] = null;
    saveVotes(votes);
  }

  function clearAllVotes() {
    if (shouldUseWs()) {
      send({ type: "clearAll" });
      return;
    }
    saveVotes(defaultVotes());
  }

  function subscribeLocal(callback) {
    var last = "";
    function emit() {
      var votes = loadVotes();
      var s = JSON.stringify(votes);
      if (s === last) return;
      last = s;
      callback(votes);
    }

    emit();

    var bc = null;
    try {
      bc = new BroadcastChannel(BC_NAME);
      bc.onmessage = function () {
        emit();
      };
    } catch (e) {}

    function onStorage(ev) {
      if (ev.key === STORAGE_KEY) emit();
    }
    window.addEventListener("storage", onStorage);

    var pollId = window.setInterval(emit, 200);

    return function unsubscribe() {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(pollId);
      if (bc) bc.close();
    };
  }

  function subscribe(callback) {
    if (!shouldUseWs()) {
      return subscribeLocal(callback);
    }

    subscribers.push(callback);
    connectWs();
    callback(wsVotes !== null ? wsVotes : defaultVotes());

    return function unsubscribe() {
      var idx = subscribers.indexOf(callback);
      if (idx !== -1) subscribers.splice(idx, 1);
    };
  }

  window.VoiceVoteSync = {
    JURY_COUNT: JURY_COUNT,
    loadVotes: function () {
      if (shouldUseWs() && wsVotes !== null) return wsVotes;
      return loadVotes();
    },
    setVote: setVote,
    clearVote: clearVote,
    clearAllVotes: clearAllVotes,
    subscribe: subscribe,
  };
})();
