# Peer-to-Peer One-Dimensional Battleship

This folder contains a browser-based, two-player port of the original
`Battleship.py` project. It uses HTML, CSS, JavaScript, WebRTC data channels,
and PeerJS. It does **not** run Python in the browser.

## Recommendation

For this portfolio project, the PeerJS/WebRTC version is the better first
implementation:

- GitHub Pages can host the HTML, CSS, and JavaScript directly.
- Only two browsers need to exchange small JSON messages.
- The host browser can act as the authoritative game controller.
- No paid or separately deployed application server is required for normal
  use.

A Socket.IO backend is a better choice when the project needs public
matchmaking, persistent accounts, reconnectable sessions, anti-cheat controls,
spectators, many rooms, or server-owned secrets.

## Project Files

```text
battleship-web/
├── index.html       Page structure and controls
├── style.css        Responsive game presentation
├── game.js          Pure Battleship rules ported from Python
├── client.js        DOM rendering and PeerJS networking
├── game.test.js     Dependency-free Node tests for game.js
├── .nojekyll        Tells GitHub Pages to serve files without Jekyll
└── README.md        Setup, deployment, and architecture notes
```

## How the Python Code Maps to JavaScript

| Python method or value | Web equivalent |
|---|---|
| `BOARD_SIZE`, `MAX_MISSES`, `SHIP_SIZES` | Constants in `game.js` |
| `create_empty_board()` | `createEmptyBoard()` |
| `place_ships()` | `placeShips()` |
| `can_place_ship()` | `canPlaceShip()` |
| `process_guess()` | `processGuess()` |
| `all_ships_sunk()` | `allShipsSunk()` |
| `display_status()` | DOM rendering functions in `client.js` |
| `main()` / `play_game()` | Peer connection events and host game controller |
| `ask_play_again()` | Two-player rematch-ready buttons |

The original Python game has one hidden board controlled by the computer. The
web version creates two player records. Each record has:

- A private ship board
- Ship records and sunk state
- A public attack board containing only that player's guesses
- Hit and miss totals

## Game Rules

- The board has 20 positions numbered `0` through `19`.
- Each player has ships of lengths 2, 3, and 4.
- Ships are placed randomly in consecutive, non-overlapping positions.
- Player 1, the host, takes the first turn.
- A valid new guess changes the turn.
- Invalid and repeated guesses are rejected without changing the turn.
- A player wins by hitting all nine enemy ship positions.
- A player also loses after making more than six misses.
- Both players must select **Ready for Rematch** before a new game starts.

## Host-Authoritative Networking

The host browser acts like a small game server:

1. It creates the complete game object and both hidden boards.
2. It handles its own local guesses directly.
3. Player 2 sends guess requests through a WebRTC data channel.
4. The host validates the player, turn, range, and repeated-guess rules.
5. The host updates the authoritative state.
6. The host creates a separate filtered view for each player.
7. Each browser renders only its filtered view.

The guest does not receive the host's hidden ship positions. The host does store
both boards, as required by this design. This means the host player could inspect
their browser's developer tools and cheat. For a competitive game, use a
trusted server-authoritative Socket.IO design instead.

## PeerJS and WebRTC

WebRTC provides encrypted browser-to-browser data channels. PeerJS wraps the
complex WebRTC connection APIs.

PeerJS still needs a signaling server for the initial handshake. This project
uses the default free PeerJS Cloud signaling service. After connection setup,
game messages normally travel directly between browsers.

The signaling server:

- Helps peers find each other.
- Exchanges connection-negotiation information.
- Does not own the Battleship game state.
- Does not normally relay game data.

## Run Locally

Opening `index.html` directly may work for basic layout, but browser security
features are more reliable when the project is served over HTTP.

From this folder, run:

```powershell
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

Open a second browser or private window:

1. First window: select **Host Game**.
2. Copy the six-character room code.
3. Second window: enter the code and select **Join Game**.

## Run the Game-Logic Tests

Node.js is optional and is needed only for the included pure-logic tests:

```powershell
node game.test.js
```

No `npm install` is required for this static version.

## Deploy on GitHub Pages

This project is inside a larger portfolio repository. GitHub Pages can publish
it in either of these common ways.

### Option 1: Publish the Whole Portfolio Repository

If the repository already has a Pages deployment:

1. Commit and push this folder.
2. Confirm the Pages source includes the project path.
3. Visit the generated URL ending in:

   ```text
   /python_projects/mini_python_projects/
   mini_python_project_1_battleship/battleship-web/
   ```

The path is shown on two lines here only for readability.

### Option 2: Deploy with a GitHub Actions Workflow

Use a Pages workflow that copies the portfolio's static files into the Pages
artifact. Make sure `battleship-web/index.html` remains at its expected URL.

### GitHub Pages Settings

For a branch-based Pages site:

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Choose **Deploy from a branch**.
4. Select the branch and supported source folder.
5. Save and wait for the deployment.

GitHub Pages serves static HTML, CSS, and JavaScript. It does not run Node.js,
Express, Socket.IO servers, Python, or databases.

## WebRTC Limitations

Direct peer-to-peer connections do not succeed on every network.

Possible problems:

- Corporate, school, or public networks may block WebRTC.
- Symmetric NAT or strict firewalls may prevent a direct route.
- Browser extensions or privacy settings may interfere.
- The free public signaling service may be unavailable or rate-limited.
- Refreshing either page ends the in-memory match.
- No central server exists to restore disconnected state.

STUN servers help browsers discover public network routes. TURN servers relay
traffic when a direct route is impossible. TURN service costs bandwidth and
usually requires separate credentials and hosting.

## Optional Self-Hosted PeerJS Signaling Server

For more control, deploy PeerServer separately from GitHub Pages.

Install and run locally:

```powershell
npm install --global peer
peerjs --port 9000 --key peerjs --path /battleship
```

Then configure the Peer constructor in `client.js`:

```javascript
new Peer(peerId, {
  host: "your-peer-server.example.com",
  port: 443,
  path: "/battleship",
  secure: true,
});
```

The PeerServer must be hosted on a platform that can run a long-lived Node.js
process. GitHub Pages cannot host it.

For difficult networks, also configure TURN entries in PeerJS's WebRTC `config`
option. TURN credentials should not be committed publicly when they provide
billable access.

## Socket.IO Alternative

The reference `tic-tac-combo` repository uses:

- Express to serve a `public` directory.
- Socket.IO attached to the HTTP server.
- A server-side player list.
- Events for game start, turns, moves, and disconnects.

A modern server-authoritative Battleship version could use:

```text
socketio-battleship/
├── server.js
├── package.json
└── public/
    ├── index.html
    ├── style.css
    └── client.js
```

The server would keep:

```javascript
const games = new Map();
```

Each room record would contain both secret boards, player socket IDs, turn,
guesses, scores, and game status. Clients would emit room and guess requests;
the server would validate and broadcast filtered state.

Typical events:

- `create-room`
- `join-room`
- `game-start`
- `guess`
- `state`
- `invalid-move`
- `restart-ready`
- `disconnect`

### Why Socket.IO Cannot Run on GitHub Pages

Socket.IO requires a running server process and persistent network
connections. GitHub Pages only serves static files and cannot execute
`server.js`.

Host the backend on a service that supports Node.js processes, such as:

- Render
- Railway
- Replit
- Fly.io
- Glitch, if its current service limits support the project

The frontend may remain on GitHub Pages, but it must connect to the backend's
HTTPS URL and the backend must allow the frontend origin with CORS settings.

## Security and Trust Notes

- Peer messages are validated by the host before changing state.
- The guest never receives the opponent's unhit ship positions.
- The host owns both private boards and therefore must be trusted.
- Room codes are convenient identifiers, not passwords.
- Anyone who knows an unused room code may attempt to connect.
- State exists only in memory and disappears when the host closes the page.

## Reference Architecture

This project was inspired by
[`StrawberryStego/tic-tac-combo`](https://github.com/StrawberryStego/tic-tac-combo).
That repository demonstrates an Express static-file server and Socket.IO events
for connecting two players, assigning turns, broadcasting moves, and handling
disconnects. This Battleship version keeps the event-driven multiplayer idea
while replacing the central Socket.IO server with a host-authoritative PeerJS
data connection so it can be deployed as a static GitHub Pages site.

## Further Reading

- [PeerJS client documentation](https://peerjs.com/)
- [PeerJS FAQ](https://peerjs.com/client/faq)
- [Self-hosting PeerServer](https://peerjs.com/server/getting-started)
- [GitHub Pages documentation](https://docs.github.com/en/pages)
- [Socket.IO documentation](https://socket.io/docs/v4/)
