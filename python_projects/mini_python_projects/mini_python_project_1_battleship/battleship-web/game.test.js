"use strict";

/*
 * Lightweight tests for the pure game engine.
 *
 * Run with: node game.test.js
 * No npm packages are required because Node includes the assert module.
 */
const assert = require("node:assert/strict");
const Game = require("./game.js");

function createKnownGame() {
  const game = Game.createGame();

  // Replace random placement with predictable positions so tests can state
  // exactly which guesses should hit and miss.
  game.players.host.hiddenBoard = new Array(Game.BOARD_SIZE).fill(Game.EMPTY);
  game.players.guest.hiddenBoard = new Array(Game.BOARD_SIZE).fill(Game.EMPTY);

  game.players.host.ships = [
    { name: "Scout", size: 2, positions: [0, 1], sunk: false },
    { name: "Cruiser", size: 3, positions: [2, 3, 4], sunk: false },
    { name: "Battleship", size: 4, positions: [5, 6, 7, 8], sunk: false },
  ];
  game.players.guest.ships = [
    { name: "Scout", size: 2, positions: [0, 1], sunk: false },
    { name: "Cruiser", size: 3, positions: [2, 3, 4], sunk: false },
    { name: "Battleship", size: 4, positions: [5, 6, 7, 8], sunk: false },
  ];

  for (let position = 0; position <= 8; position += 1) {
    game.players.host.hiddenBoard[position] = Game.SHIP;
    game.players.guest.hiddenBoard[position] = Game.SHIP;
  }

  game.players.host.attackBoard = Game.createEmptyBoard();
  game.players.guest.attackBoard = Game.createEmptyBoard();
  game.players.host.hits = 0;
  game.players.host.misses = 0;
  game.players.guest.hits = 0;
  game.players.guest.misses = 0;
  return game;
}

for (let repetition = 0; repetition < 500; repetition += 1) {
  const placement = Game.placeShips();
  assert.equal(placement.board.length, Game.BOARD_SIZE);
  assert.equal(
    placement.board.filter((marker) => marker === Game.SHIP).length,
    Game.SHIP_SIZES.reduce((total, size) => total + size, 0),
  );
}

const game = createKnownGame();

let result = Game.processGuess(game, Game.PLAYER_HOST, -1);
assert.equal(result.code, "invalid");
assert.equal(game.turn, Game.PLAYER_HOST);

result = Game.processGuess(game, Game.PLAYER_HOST, 0);
assert.equal(result.code, "hit");
assert.equal(game.players.host.hits, 1);
assert.equal(game.turn, Game.PLAYER_GUEST);

result = Game.processGuess(game, Game.PLAYER_HOST, 0);
assert.equal(result.code, "wrong-turn");

result = Game.processGuess(game, Game.PLAYER_GUEST, 19);
assert.equal(result.code, "miss");
assert.equal(game.players.guest.misses, 1);
assert.equal(game.turn, Game.PLAYER_HOST);

result = Game.processGuess(game, Game.PLAYER_HOST, 0);
assert.equal(result.code, "repeated");
assert.equal(game.turn, Game.PLAYER_HOST);

const hostView = Game.createPlayerView(game, Game.PLAYER_HOST);
assert.equal(hostView.ownBoard[0], Game.SHIP);
assert.equal(hostView.targetBoard[0], Game.HIT);
assert.equal("hiddenBoard" in hostView, false);
assert.equal("positions" in hostView.opponentShips[0], false);

console.log("All Battleship game-engine tests passed.");
