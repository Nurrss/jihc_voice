(function () {
  var params = new URLSearchParams(window.location.search);
  var idRaw = params.get("id");
  var juryId = parseInt(idRaw, 10);
  var maxJury =
    window.VoiceVoteSync && window.VoiceVoteSync.JURY_COUNT
      ? window.VoiceVoteSync.JURY_COUNT
      : 4;
  if (juryId < 1 || juryId > maxJury) {
    window.location.href = "index.html";
    return;
  }

  var titleEl = document.getElementById("jury-title");
  var confirmEl = document.getElementById("jury-confirm");
  var btnYes = document.getElementById("btn-yes");
  var btnNo = document.getElementById("btn-no");
  var syncDot = document.getElementById("jury-sync-dot");
  var syncText = document.getElementById("jury-sync-text");

  if (titleEl) titleEl.textContent = "Jury " + juryId;

  var confirmTimer = null;

  function showConfirm(message) {
    if (confirmTimer) window.clearTimeout(confirmTimer);
    if (confirmEl) {
      confirmEl.textContent = message;
      confirmEl.classList.add("is-visible");
      confirmTimer = window.setTimeout(function () {
        confirmEl.classList.remove("is-visible");
      }, 3500);
    }
  }

  function updateSelection(current) {
    if (btnYes) btnYes.classList.toggle("is-selected", current === "yes");
    if (btnNo) btnNo.classList.toggle("is-selected", current === "no");
  }

  function cast(value) {
    if (!window.VoiceVoteSync) return;
    window.VoiceVoteSync.setVote(juryId, value);
    updateSelection(value);
    showConfirm("Vote recorded: " + (value === "yes" ? "Yes" : "No"));
    if (syncDot) syncDot.classList.add("is-live");
    if (syncText) syncText.textContent = "Vote sent";
  }

  if (btnYes) {
    btnYes.addEventListener("click", function () {
      cast("yes");
    });
  }
  if (btnNo) {
    btnNo.addEventListener("click", function () {
      cast("no");
    });
  }

  if (window.VoiceVoteSync) {
    window.VoiceVoteSync.subscribe(function (votes) {
      var v = votes[juryId];
      updateSelection(v);
    });
  }
})();
