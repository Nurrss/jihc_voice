"use strict";

var path = require("path");
var http = require("http");
var express = require("express");
var WebSocket = require("ws");

var PORT = parseInt(process.env.PORT || "3000", 10);
var JURY_COUNT = 5;

function defaultVotes() {
  var v = {};
  for (var i = 1; i <= JURY_COUNT; i++) v[String(i)] = null;
  return v;
}

var votes = defaultVotes();

var app = express();
var root = path.join(__dirname);
app.use(express.static(root));

var server = http.createServer(app);
var wss = new WebSocket.Server({ server });

function broadcastState() {
  var payload = JSON.stringify({ type: "state", votes: votes });
  wss.clients.forEach(function (client) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

wss.on("connection", function (ws) {
  ws.send(JSON.stringify({ type: "state", votes: votes }));

  ws.on("message", function (raw) {
    var msg;
    try {
      msg = JSON.parse(String(raw));
    } catch (e) {
      return;
    }
    if (!msg || typeof msg.type !== "string") return;

    if (msg.type === "setVote") {
      var sid = parseInt(msg.juryId, 10);
      var val = msg.value;
      if (sid >= 1 && sid <= JURY_COUNT && (val === "yes" || val === "no")) {
        votes[String(sid)] = val;
        broadcastState();
      }
    } else if (msg.type === "clearVote") {
      var cid = parseInt(msg.juryId, 10);
      if (cid >= 1 && cid <= JURY_COUNT) {
        votes[String(cid)] = null;
        broadcastState();
      }
    } else if (msg.type === "clearAll") {
      votes = defaultVotes();
      broadcastState();
    }
  });
});

server.listen(PORT, function () {
  console.log("Listening on " + PORT + " (juries: " + JURY_COUNT + ")");
});
