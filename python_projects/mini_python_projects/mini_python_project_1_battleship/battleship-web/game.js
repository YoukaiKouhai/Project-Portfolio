/*
 * Pure Battleship rules
 * ---------------------
 * This file ports the original Python algorithms to JavaScript. It does not
 * access the page or the network, which keeps the rules easy to read and test.
 *
 * The host browser uses these functions as the authoritative game engine.
 */
(function exposeBattleshipGame(globalObject) {
  "use strict";

  const BOARD_SIZE = 20;
  const MAX_MISSES = 6;
  const SHIP_SIZES = Object.freeze([2, 3, 4]);

  const EMPTY = "-";
  const SHIP = "S";
  const HIT = "H";
  const MISS = "M";

  const PLAYER_HOST = "host";
  const PLAYER_GUEST = "guest";

  const SHIP_NAMES = Object.freeze({
    2: "Scout",
    3: "Cruiser",
    4: "Battleship",
  });

  /**
   * Create a fresh one-dimensional board.
   *
   * Array.fill is the JavaScript equivalent of the Python expression
   * [EMPTY] * BOARD_SIZE used in the original project.
   */
  function createEmptyBoard() {
    return new Array(BOARD_SIZE).fill(EMPTY);
  }

  /**
   * Return true when every position needed by a ship is currently empty.
   */
  function canPlaceShip(board, startPosition, shipSize) {
    for (
      let position = startPosition;
      position < startPosition + shipSize;
      position += 1
    ) {
      if (board[position] !== EMPTY) {
        return false;
      }
    }

    return true;
  }

  /**
   * Place the three ships randomly and return both the board and ship records.
   *
   * The optional randomFunction parameter makes the algorithm deterministic
   * during automated tests while using Math.random during normal games.
   */
  function placeShips(randomFunction = Math.random) {
    const board = createEmptyBoard();
    const ships = [];

    SHIP_SIZES.forEach((shipSize, shipIndex) => {
      let shipPlaced = false;

      while (!shipPlaced) {
        // A start past this value would make the ship leave the board.
        const largestStart = BOARD_SIZE - shipSize;
        const startPosition = Math.floor(randomFunction() * (largestStart + 1));

        if (canPlaceShip(board, startPosition, shipSize)) {
          const positions = [];

          for (
            let position = startPosition;
            position < startPosition + shipSize;
            position += 1
          ) {
            board[position] = SHIP;
            positions.push(position);
          }

          ships.push({
            id: `${SHIP_NAMES[shipSize].toLowerCase()}-${shipIndex}`,
            name: SHIP_NAMES[shipSize],
            size: shipSize,
            positions,
            sunk: false,
          });

          shipPlaced = true;
        }
      }
    });

    return { board, ships };
  }

  /**
   * Create all private and public attack state for one player.
   */
  function createPlayer() {
    const placement = placeShips();

    return {
      hiddenBoard: placement.board,
      ships: placement.ships,
      attackBoard: createEmptyBoard(),
      hits: 0,
      misses: 0,
    };
  }

  /**
   * Create a complete two-player match owned by the host browser.
   */
  function createGame() {
    return {
      status: "active",
      turn: PLAYER_HOST,
      winner: null,
      finishReason: null,
      lastMessage: "Both fleets are ready. Host fires first.",
      moveNumber: 0,
      restartReady: {
        [PLAYER_HOST]: false,
        [PLAYER_GUEST]: false,
      },
      players: {
        [PLAYER_HOST]: createPlayer(),
        [PLAYER_GUEST]: createPlayer(),
      },
    };
  }

  function otherPlayer(playerId) {
    return playerId === PLAYER_HOST ? PLAYER_GUEST : PLAYER_HOST;
  }

  /**
   * Mark a ship sunk when every one of its positions has been hit.
   */
  function updateSunkShips(defender) {
    defender.ships.forEach((ship) => {
      ship.sunk = ship.positions.every(
        (position) => defender.hiddenBoard[position] === HIT,
      );
    });
  }

  function allShipsSunk(player) {
    return player.ships.every((ship) => ship.sunk);
  }

  /**
   * Validate and process one guess.
   *
   * Only the host calls this function. Invalid and repeated guesses return
   * without changing the turn, matching the behavior of the Python game.
   */
  function processGuess(game, attackerId, rawPosition) {
    if (!game || game.status !== "active") {
      return {
        accepted: false,
        code: "game-over",
        message: "The game is already over.",
      };
    }

    if (attackerId !== game.turn) {
      return {
        accepted: false,
        code: "wrong-turn",
        message: "It is not your turn.",
      };
    }

    const position = Number(rawPosition);
    if (
      !Number.isInteger(position) ||
      position < 0 ||
      position >= BOARD_SIZE
    ) {
      return {
        accepted: false,
        code: "invalid",
        message: `Choose a whole-number position from 0 through ${BOARD_SIZE - 1}.`,
      };
    }

    const defenderId = otherPlayer(attackerId);
    const attacker = game.players[attackerId];
    const defender = game.players[defenderId];

    if (attacker.attackBoard[position] !== EMPTY) {
      return {
        accepted: false,
        code: "repeated",
        message: `Position ${position} was already guessed. Choose another position.`,
      };
    }

    let result;
    if (defender.hiddenBoard[position] === SHIP) {
      defender.hiddenBoard[position] = HIT;
      attacker.attackBoard[position] = HIT;
      attacker.hits += 1;
      result = HIT;
      updateSunkShips(defender);

      const sunkShip = defender.ships.find(
        (ship) => ship.sunk && ship.positions.includes(position),
      );
      game.lastMessage = sunkShip
        ? `${displayPlayer(attackerId)} hit position ${position} and sank the ${sunkShip.name}!`
        : `${displayPlayer(attackerId)} hit a ship at position ${position}.`;
    } else {
      // A miss is stored on both views: the attack board shows the guess, and
      // the defender's own board shows where the opponent fired.
      defender.hiddenBoard[position] = MISS;
      attacker.attackBoard[position] = MISS;
      attacker.misses += 1;
      result = MISS;
      game.lastMessage = `${displayPlayer(attackerId)} missed at position ${position}.`;
    }

    game.moveNumber += 1;

    if (allShipsSunk(defender)) {
      game.status = "finished";
      game.winner = attackerId;
      game.finishReason = "all-ships-sunk";
      game.lastMessage = `${displayPlayer(attackerId)} wins by sinking every enemy ship!`;
    } else if (attacker.misses > MAX_MISSES) {
      game.status = "finished";
      game.winner = defenderId;
      game.finishReason = "too-many-misses";
      game.lastMessage =
        `${displayPlayer(attackerId)} exceeded ${MAX_MISSES} misses. ` +
        `${displayPlayer(defenderId)} wins!`;
    } else {
      game.turn = defenderId;
    }

    return {
      accepted: true,
      code: result === HIT ? "hit" : "miss",
      result,
      position,
      message: game.lastMessage,
    };
  }

  function displayPlayer(playerId) {
    return playerId === PLAYER_HOST ? "Player 1" : "Player 2";
  }

  /**
   * Build the safe state sent to one browser.
   *
   * The opponent's hidden board and exact ship positions are deliberately
   * omitted. The receiving player gets only their own board and the guesses
   * they have already made against the opponent.
   */
  function createPlayerView(game, viewerId) {
    const opponentId = otherPlayer(viewerId);
    const viewer = game.players[viewerId];
    const opponent = game.players[opponentId];

    return {
      status: game.status,
      turn: game.turn,
      winner: game.winner,
      finishReason: game.finishReason,
      lastMessage: game.lastMessage,
      moveNumber: game.moveNumber,
      viewerId,
      opponentId,
      restartReady: { ...game.restartReady },
      ownBoard: [...viewer.hiddenBoard],
      targetBoard: [...viewer.attackBoard],
      yourHits: viewer.hits,
      yourMisses: viewer.misses,
      opponentHits: opponent.hits,
      opponentMisses: opponent.misses,
      ownShips: viewer.ships.map(({ name, size, sunk }) => ({
        name,
        size,
        sunk,
      })),
      opponentShips: opponent.ships.map(({ name, size, sunk }) => ({
        name,
        size,
        sunk,
      })),
    };
  }

  const api = Object.freeze({
    BOARD_SIZE,
    MAX_MISSES,
    SHIP_SIZES,
    EMPTY,
    SHIP,
    HIT,
    MISS,
    PLAYER_HOST,
    PLAYER_GUEST,
    createEmptyBoard,
    canPlaceShip,
    placeShips,
    createGame,
    processGuess,
    createPlayerView,
    otherPlayer,
    allShipsSunk,
  });

  globalObject.BattleshipGame = api;

  // This guarded export allows the same browser file to be tested with Node.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
