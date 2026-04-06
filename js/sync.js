(function () {
  var STORAGE_KEY = "voiceCompetitionVotes_v1";
  var BC_NAME = "voice-votes";

  function defaultVotes() {
    return { 1: null, 2: null, 3: null, 4: null };
  }

  function loadVotes() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultVotes();
      var o = JSON.parse(raw);
      return {
        1: o["1"] === "yes" || o["1"] === "no" ? o["1"] : null,
        2: o["2"] === "yes" || o["2"] === "no" ? o["2"] : null,
        3: o["3"] === "yes" || o["3"] === "no" ? o["3"] : null,
        4: o["4"] === "yes" || o["4"] === "no" ? o["4"] : null,
      };
    } catch (e) {
      return defaultVotes();
    }
  }

  function saveVotes(votes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
    try {
      var bc = new BroadcastChannel(BC_NAME);
      bc.postMessage({ type: "update" });
      bc.close();
    } catch (e) {}
  }

  function setVote(juryId, value) {
    if (juryId !== 1 && juryId !== 2 && juryId !== 3 && juryId !== 4) return;
    if (value !== "yes" && value !== "no") return;
    var votes = loadVotes();
    votes[juryId] = value;
    saveVotes(votes);
  }

  function clearVote(juryId) {
    if (juryId !== 1 && juryId !== 2 && juryId !== 3 && juryId !== 4) return;
    var votes = loadVotes();
    votes[juryId] = null;
    saveVotes(votes);
  }

  function clearAllVotes() {
    saveVotes(defaultVotes());
  }

  /**
   * @param {(votes: {1: string|null,2: string|null,3: string|null,4: string|null}) => void} callback
   * @returns {function(): void}
   */
  function subscribe(callback) {
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

  window.VoiceVoteSync = {
    loadVotes: loadVotes,
    setVote: setVote,
    clearVote: clearVote,
    clearAllVotes: clearAllVotes,
    subscribe: subscribe,
  };
})();
