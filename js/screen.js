(function () {
  var cards = document.querySelectorAll(".screen-card");

  function applyCard(card, vote) {
    card.classList.remove("is-yes", "is-no", "is-pending");
    var el = card.querySelector('[data-role="vote"]');
    if (!el) return;

    if (vote === "yes") {
      card.classList.add("is-yes");
      el.textContent = "Yes";
    } else if (vote === "no") {
      card.classList.add("is-no");
      el.textContent = "No";
    } else {
      card.classList.add("is-pending");
      el.textContent = "Awaiting vote";
    }
  }

  function render(votes) {
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var id = parseInt(card.getAttribute("data-jury"), 10);
      applyCard(card, votes[id]);
    }
  }

  var btnRemove = document.getElementById("btn-remove-votes");
  if (btnRemove && window.VoiceVoteSync) {
    btnRemove.addEventListener("click", function () {
      if (window.confirm("Remove all jury votes?")) {
        window.VoiceVoteSync.clearAllVotes();
      }
    });
  }

  if (window.VoiceVoteSync) {
    window.VoiceVoteSync.subscribe(render);
  }
})();
