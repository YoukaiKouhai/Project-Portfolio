/*
 * Browser interface and PeerJS networking
 * ---------------------------------------
 * The host is authoritative: it owns the complete game object, validates all
 * moves, and sends each player a filtered view. The joining browser never
 * receives the host's unhit ship locations.
 */
"use strict";

const Game = window.BattleshipGame;

const PEER_PREFIX = "battleship-";
const ROOM_CODE_LENGTH = 6;

let peer = null;
let connection = null;
let localRole = null;
let authoritativeGame = null;
let latestView = null;

const elements = {
  connectionBadge: document.querySelector("#connectionBadge"),
  connectionPanel: document.querySelector("#connectionPanel"),
  connectionMessage: document.querySelector("#connectionMessage"),
  hostButton: document.querySelector("#hostButton"),
  joinButton: document.querySelector("#joinButton"),
  joinCode: document.querySelector("#joinCode"),
  roomCodeBox: document.querySelector("#roomCodeBox"),
  roomCode: document.querySelector("#roomCode"),
  copyCodeButton: document.querySelector("#copyCodeButton"),
  gamePanel: document.querySelector("#gamePanel"),
  playerChip: document.querySelector("#playerChip"),
  turnMessage: document.querySelector("#turnMessage"),
  gameMessage: document.querySelector("#gameMessage"),
  ownBoard: document.querySelector("#ownBoard"),
  targetBoard: document.querySelector("#targetBoard"),
  ownShipList: document.querySelector("#ownShipList"),
  opponentShipList: document.querySelector("#opponentShipList"),
  yourHits: document.querySelector("#yourHits"),
  yourMisses: document.querySelector("#yourMisses"),
  opponentHits: document.querySelector("#opponentHits"),
  opponentMisses: document.querySelector("#opponentMisses"),
  restartButton: document.querySelector("#restartButton"),
};

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function roomCodeToPeerId(code) {
  return `${PEER_PREFIX}${code.toLowerCase()}`;
}

function normalizeRoomCode(value) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function setConnectionMessage(message, isError = false) {
  elements.connectionMessage.textContent = message;
  elements.connectionMessage.classList.toggle("error", isError);
}

function setConnectionBadge(message, connected = false) {
  elements.connectionBadge.textContent = message;
  elements.connectionBadge.classList.toggle("connected", connected);
}

function disableConnectionControls(disabled) {
  elements.hostButton.disabled = disabled;
  elements.joinButton.disabled = disabled;
  elements.joinCode.disabled = disabled;
}

function destroyPeer() {
  if (connection) {
    connection.close();
  }

  if (peer) {
    peer.destroy();
  }

  connection = null;
  peer = null;
}

/**
 * Create a public room. The custom PeerJS ID becomes the shareable room code.
 */
function hostGame() {
  if (typeof window.Peer !== "function") {
    setConnectionMessage(
      "PeerJS did not load. Check the internet connection and refresh the page.",
      true,
    );
    return;
  }

  destroyPeer();
  disableConnectionControls(true);
  localRole = Game.PLAYER_HOST;

  const roomCode = createRoomCode();
  const peerId = roomCodeToPeerId(roomCode);
  peer = new Peer(peerId);

  setConnectionMessage("Creating the room...");
  setConnectionBadge("Connecting");

  peer.on("open", () => {
    elements.roomCode.textContent = roomCode;
    elements.roomCodeBox.classList.remove("hidden");
    setConnectionMessage("Room created. Share the code and wait for Player 2.");
    setConnectionBadge("Waiting for Player 2");
  });

  peer.on("connection", (incomingConnection) => {
    // A Battleship room accepts one opponent. Extra connections are closed so
    // they cannot receive match messages or interfere with the game.
    if (connection && connection.open) {
      incomingConnection.on("open", () => {
        incomingConnection.send({
          type: "room-full",
          message: "This room already has two players.",
        });
        incomingConnection.close();
      });
      return;
    }

    connection = incomingConnection;
    configureConnection();
  });

  peer.on("error", handlePeerError);
}

/**
 * Connect Player 2 to the PeerJS ID derived from the room code.
 */
function joinGame() {
  if (typeof window.Peer !== "function") {
    setConnectionMessage(
      "PeerJS did not load. Check the internet connection and refresh the page.",
      true,
    );
    return;
  }

  const roomCode = normalizeRoomCode(elements.joinCode.value);
  elements.joinCode.value = roomCode;

  if (roomCode.length !== ROOM_CODE_LENGTH) {
    setConnectionMessage("Enter the host's six-character room code.", true);
    return;
  }

  destroyPeer();
  disableConnectionControls(true);
  localRole = Game.PLAYER_GUEST;
  peer = new Peer();

  setConnectionMessage("Contacting the host...");
  setConnectionBadge("Connecting");

  peer.on("open", () => {
    connection = peer.connect(roomCodeToPeerId(roomCode), {
      reliable: true,
      metadata: { game: "one-dimensional-battleship" },
    });
    configureConnection();
  });

  peer.on("error", handlePeerError);
}

function configureConnection() {
  connection.on("open", () => {
    setConnectionBadge("Peer connected", true);
    setConnectionMessage("Peer connection established. Preparing the match...");

    if (localRole === Game.PLAYER_HOST) {
      authoritativeGame = Game.createGame();
      sendViewsToPlayers();
    } else {
      connection.send({ type: "guest-ready" });
    }
  });

  connection.on("data", handleNetworkMessage);

  connection.on("close", () => {
    setConnectionBadge("Opponent disconnected");
    setConnectionMessage(
      "The peer connection closed. Refresh the page to create or join a new room.",
      true,
    );
    lockTargetBoard();
  });

  connection.on("error", (error) => {
    setConnectionMessage(`Connection error: ${error.message}`, true);
  });
}

/**
 * All messages are treated as untrusted input. Only the host is allowed to
 * process guesses or replace the authoritative game state.
 */
function handleNetworkMessage(message) {
  if (!message || typeof message.type !== "string") {
    return;
  }

  if (message.type === "room-full") {
    setConnectionMessage(message.message, true);
    setConnectionBadge("Room full");
    disableConnectionControls(false);
    return;
  }

  if (message.type === "state" && localRole === Game.PLAYER_GUEST) {
    latestView = message.view;
    renderView(latestView);
    return;
  }

  if (message.type === "notice" && localRole === Game.PLAYER_GUEST) {
    elements.gameMessage.textContent = message.message;
    return;
  }

  if (localRole !== Game.PLAYER_HOST || !authoritativeGame) {
    return;
  }

  if (message.type === "guess") {
    const result = Game.processGuess(
      authoritativeGame,
      Game.PLAYER_GUEST,
      message.position,
    );

    if (!result.accepted) {
      sendGuestNotice(result.message);
      return;
    }

    sendViewsToPlayers();
  } else if (message.type === "restart-ready") {
    markRestartReady(Game.PLAYER_GUEST);
  } else if (message.type === "guest-ready") {
    sendViewsToPlayers();
  }
}

function sendGuestNotice(message) {
  if (connection && connection.open) {
    connection.send({ type: "notice", message });
  }
}

function sendViewsToPlayers() {
  if (!authoritativeGame) {
    return;
  }

  latestView = Game.createPlayerView(
    authoritativeGame,
    Game.PLAYER_HOST,
  );
  renderView(latestView);

  if (connection && connection.open) {
    connection.send({
      type: "state",
      view: Game.createPlayerView(authoritativeGame, Game.PLAYER_GUEST),
    });
  }
}

/**
 * Forward a target-board click to the authority. The host calls the game
 * engine directly; the guest sends a request over the data channel.
 */
function submitGuess(position) {
  if (!latestView || latestView.status !== "active") {
    return;
  }

  if (localRole === Game.PLAYER_HOST) {
    const result = Game.processGuess(
      authoritativeGame,
      Game.PLAYER_HOST,
      position,
    );

    if (!result.accepted) {
      elements.gameMessage.textContent = result.message;
    }

    sendViewsToPlayers();
  } else if (connection && connection.open) {
    connection.send({ type: "guess", position });
  }
}

function markRestartReady(playerId) {
  if (!authoritativeGame || authoritativeGame.status !== "finished") {
    return;
  }

  authoritativeGame.restartReady[playerId] = true;

  if (
    authoritativeGame.restartReady[Game.PLAYER_HOST] &&
    authoritativeGame.restartReady[Game.PLAYER_GUEST]
  ) {
    authoritativeGame = Game.createGame();
  }

  sendViewsToPlayers();
}

function requestRestart() {
  if (!latestView || latestView.status !== "finished") {
    return;
  }

  elements.restartButton.disabled = true;

  if (localRole === Game.PLAYER_HOST) {
    markRestartReady(Game.PLAYER_HOST);
  } else if (connection && connection.open) {
    connection.send({ type: "restart-ready" });
  }
}

function renderView(view) {
  elements.connectionPanel.classList.add("hidden");
  elements.gamePanel.classList.remove("hidden");
  elements.playerChip.textContent =
    view.viewerId === Game.PLAYER_HOST ? "Player 1 · Host" : "Player 2 · Guest";

  elements.yourHits.textContent = view.yourHits;
  elements.yourMisses.textContent = view.yourMisses;
  elements.opponentHits.textContent = view.opponentHits;
  elements.opponentMisses.textContent = view.opponentMisses;
  elements.gameMessage.textContent = view.lastMessage;

  const isYourTurn = view.turn === view.viewerId;
  if (view.status === "finished") {
    elements.turnMessage.textContent =
      view.winner === view.viewerId ? "You won the match!" : "You lost the match.";
  } else {
    elements.turnMessage.textContent = isYourTurn
      ? "Your turn — choose a target."
      : "Opponent's turn — stand by.";
  }

  renderBoard(elements.ownBoard, view.ownBoard, false);
  renderBoard(
    elements.targetBoard,
    view.targetBoard,
    view.status === "active" && isYourTurn,
  );
  renderShips(elements.ownShipList, view.ownShips, "Your");
  renderShips(elements.opponentShipList, view.opponentShips, "Enemy");

  const localReady = view.restartReady[view.viewerId];
  elements.restartButton.classList.toggle("hidden", view.status !== "finished");
  elements.restartButton.disabled = localReady;
  elements.restartButton.textContent = localReady
    ? "Waiting for opponent..."
    : "Ready for Rematch";
}

function renderBoard(container, board, interactive) {
  container.replaceChildren();

  board.forEach((marker, position) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `cell ${markerClass(marker)}`;
    cell.textContent = position;
    cell.setAttribute("aria-label", boardCellLabel(position, marker));
    cell.disabled = !interactive || marker !== Game.EMPTY;

    if (interactive && marker === Game.EMPTY) {
      cell.addEventListener("click", () => submitGuess(position));
    }

    container.append(cell);
  });
}

function markerClass(marker) {
  if (marker === Game.SHIP) return "ship";
  if (marker === Game.HIT) return "hit";
  if (marker === Game.MISS) return "miss";
  return "unknown";
}

function boardCellLabel(position, marker) {
  const descriptions = {
    [Game.EMPTY]: "not guessed",
    [Game.SHIP]: "your ship",
    [Game.HIT]: "hit",
    [Game.MISS]: "miss",
  };
  return `Position ${position}: ${descriptions[marker]}`;
}

function renderShips(container, ships, ownerLabel) {
  container.replaceChildren();

  ships.forEach((ship) => {
    const item = document.createElement("span");
    item.className = `ship-status${ship.sunk ? " sunk" : ""}`;
    item.textContent =
      `${ownerLabel} ${ship.name} (${ship.size}) — ` +
      (ship.sunk ? "sunk" : "afloat");
    container.append(item);
  });
}

function lockTargetBoard() {
  elements.targetBoard
    .querySelectorAll("button")
    .forEach((button) => {
      button.disabled = true;
    });
}

function handlePeerError(error) {
  const friendlyMessages = {
    "peer-unavailable": "No host was found for that room code.",
    "unavailable-id": "That room code is already in use. Try hosting again.",
    network: "The signaling service could not be reached.",
    server: "The signaling service reported an error.",
  };

  setConnectionMessage(
    friendlyMessages[error.type] || `Peer connection error: ${error.message}`,
    true,
  );
  setConnectionBadge("Connection failed");
  disableConnectionControls(false);
}

elements.hostButton.addEventListener("click", hostGame);
elements.joinButton.addEventListener("click", joinGame);
elements.restartButton.addEventListener("click", requestRestart);

elements.joinCode.addEventListener("input", () => {
  elements.joinCode.value = normalizeRoomCode(elements.joinCode.value);
});

elements.joinCode.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    joinGame();
  }
});

elements.copyCodeButton.addEventListener("click", async () => {
  const code = elements.roomCode.textContent;

  try {
    await navigator.clipboard.writeText(code);
    elements.copyCodeButton.textContent = "Copied";
    window.setTimeout(() => {
      elements.copyCodeButton.textContent = "Copy";
    }, 1200);
  } catch {
    setConnectionMessage(`Room code: ${code}. Copy it manually.`, true);
  }
});

window.addEventListener("beforeunload", destroyPeer);
