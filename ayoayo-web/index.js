const Ayoayo = require('../ayoayo');

(function () {
  let game;
  const newGameButton = document.querySelector('.controls button');
  const sides = document.querySelectorAll('.side');
  const players = document.querySelectorAll('.player');
  const noGamePadding = document.querySelector('.no-game-padding');
  const turnBadges = document.querySelectorAll('.turn-badge');
  const seedingHand = document.querySelector('.hand.seeding');
  const capturingHand = document.querySelector('.hand.capturing');
  let currentEvent;
  let eventQueue = [];
  let droppedNextSeed = false;

  const eventTypeToHandler = {
    [Ayoayo.events.PICKUP_SEEDS]: handlePickupSeedsEvent,
    [Ayoayo.events.MOVE_TO]: handleMoveToEvent,
    [Ayoayo.events.DROP_SEED]: handleDropSeedEvent,
    [Ayoayo.events.SWITCH_TURN]: handleSwitchTurnEvent,
    [Ayoayo.events.CAPTURE]: handleCaptureEvent,
  };

  const DEFAULT_EVENT_DURATION = 250;

  newGameButton.addEventListener('click', onClickNewGame);
  document.querySelectorAll('.side .pit').forEach((pit) => {
    pit.addEventListener('mouseenter', onMouseEnterPit);
    pit.addEventListener('focus', onMouseEnterPit);
    pit.addEventListener('mouseleave', onMouseLeavePit);
    pit.addEventListener('blur', onMouseLeavePit);
    pit.addEventListener('click', onClickPit);
  });
  document.querySelectorAll('.captured').forEach((pit) => {
    pit.addEventListener('mouseenter', onMouseEnterPit);
    pit.addEventListener('mouseleave', onMouseLeavePit);
  });

  init();
  requestAnimationFrame(handleEventQueue);

  function onClickNewGame() {
    game = new Ayoayo();
    game.on(Ayoayo.events.PICKUP_SEEDS, onPickupSeeds);
    game.on(Ayoayo.events.MOVE_TO, onMoveTo);
    game.on(Ayoayo.events.DROP_SEED, onDropSeed);
    game.on(Ayoayo.events.SWITCH_TURN, onSwitchTurn);
    game.on(Ayoayo.events.CAPTURE, onCapture);

    players.forEach((player) => {
      player.style.display = 'block';
    });
    noGamePadding.style.display = 'none';

    updateTurn();

    game.board.forEach((row, rowIndex) => {
      row.forEach((cellCount, cellIndex) => {
        const pit = sides[rowIndex].children.item(cellIndex);
        while (pit.lastElementChild) {
          pit.removeChild(pit.lastElementChild);
        }

        for (let i = 0; i < cellCount; i++) {
          const seed = document.createElement('div');
          seed.classList.add('seed');
          styleSeed(seed);
          pit.appendChild(seed);
        }

        appendSummary(pit, cellCount);
      });
    });

    const seedsInHand = seedingHand.querySelectorAll('.seed');
    seedsInHand.forEach((seed) => {
      seedingHand.removeChild(seed);
    });

    players.forEach((player) => {
      const captured = player.querySelector('.captured');
      while (captured.lastElementChild) {
        captured.removeChild(captured.lastElementChild);
      }
      appendSummary(captured, 0);
    });

    currentEvent = null;
    eventQueue = [];
    droppedNextSeed = false;
  }

  function updateTurn() {
    const nextPlayer = game.nextPlayer;
    const otherPlayer = game.nextPlayer == 0 ? 1 : 0;

    turnBadges.item(nextPlayer).style.display = 'inline-block';
    turnBadges.item(otherPlayer).style.display = 'none';

    sides.item(nextPlayer).classList.remove('disabled');
    sides.item(otherPlayer).classList.add('disabled');
  }

  function styleSeed(seed) {
    const r = Math.round(Math.random() * 360);
    const x = Math.round(Math.random() * 40) - 20;
    const y = Math.round(Math.random() * 40) - 20;
    seed.style.transform = `rotate(${r}deg) translate(${x}px, ${y}px)`;
  }

  function onMouseEnterPit(evt) {
    const summary = evt.target.querySelector('.pit-summary');
    if (summary) {
      summary.style.opacity = '100%';
    }
  }

  function onMouseLeavePit(evt) {
    const summary = evt.target.querySelector('.pit-summary');
    if (summary) {
      summary.style.opacity = '0%';
    }
  }

  function appendSummary(parent, count) {
    const summary = document.createElement('div');
    summary.classList.add('pit-summary');
    summary.textContent = String(count);
    parent.appendChild(summary);
  }

  function init() {
    const seeds = document.querySelectorAll('.seed');
    seeds.forEach((seed) => {
      styleSeed(seed);
    });
  }

  function onClickPit(evt) {
    const sideElement = evt.currentTarget.parentElement;
    if (game && !sideElement.classList.contains('disabled')) {
      const classList = evt.currentTarget.classList.toString().split(' ');
      const idxClassName = classList.find((className) =>
        className.includes('pit-'),
      );
      const cellIndex = idxClassName[4] - 1;
      game.play(cellIndex);
    }
  }

  function onPickupSeeds(...args) {
    eventQueue.push({ type: Ayoayo.events.PICKUP_SEEDS, args });
  }

  function onMoveTo(...args) {
    eventQueue.push({ type: Ayoayo.events.MOVE_TO, args });
  }

  function onDropSeed(...args) {
    eventQueue.push({ type: Ayoayo.events.DROP_SEED, args });
  }

  function onSwitchTurn(...args) {
    eventQueue.push({ type: Ayoayo.events.SWITCH_TURN, args });
  }

  function onCapture(...args) {
    eventQueue.push({ type: Ayoayo.events.CAPTURE, args });
  }

  function handleEventQueue(time) {
    if (!currentEvent) {
      if (eventQueue.length == 0) {
        requestAnimationFrame(handleEventQueue);
        return;
      }

      currentEvent = eventQueue.shift();
      currentEvent.start = time;
      requestAnimationFrame(handleEventQueue);
      return;
    }

    const fractionDone = (time - currentEvent.start) / DEFAULT_EVENT_DURATION;

    if (fractionDone > 1) {
      currentEvent = null;
      requestAnimationFrame(handleEventQueue);
      return;
    }

    const handler = eventTypeToHandler[currentEvent.type];
    if (handler) {
      handler(currentEvent, fractionDone);
    } else {
      console.log(currentEvent);
    }

    requestAnimationFrame(handleEventQueue);
  }

  function handlePickupSeedsEvent(event) {
    const [row, column] = event.args;
    const [handRowPosition, handColumnPosition] = getPitPosition(row, column);
    seedingHand.style.left = `${handColumnPosition}px`;
    seedingHand.style.top = `${handRowPosition}px`;

    const pit = getPitAtPosition(row, column);
    const seeds = pit.querySelectorAll(`.seed`);

    if (seeds.length) {
      seeds.forEach((seed) => {
        pit.removeChild(seed);
        seedingHand.appendChild(seed);
      });
      pit.querySelector('.pit-summary').textContent = '0';
    }
  }

  function getPitPosition(row, column) {
    return [45 + row * 180, 42 + column * 106];
  }

  function getPitAtPosition(row, column) {
    return document.querySelector(`.side-${row + 1} .pit-${column + 1}`);
  }

  function handleMoveToEvent(event, fractionDone) {
    const [[initialRow, initialColumn], [nextRow, nextColumn]] = event.args;
    const [initialRowHandPosition, initialColumnHandPosition] = getPitPosition(
      initialRow,
      initialColumn,
    );
    const [nextRowHandPosition, nextColumnHandPosition] = getPitPosition(
      nextRow,
      nextColumn,
    );
    const currentRowHandPosition =
      initialRowHandPosition +
      fractionDone * (nextRowHandPosition - initialRowHandPosition);
    const currentColumnHandPosition =
      initialColumnHandPosition +
      fractionDone * (nextColumnHandPosition - initialColumnHandPosition);
    seedingHand.style.left = `${currentColumnHandPosition}px`;
    seedingHand.style.top = `${currentRowHandPosition}px`;

    // Reset dropped seed status
    droppedNextSeed = false;

    // Reset captured seeds status
    // Transfer seeds from capturing hand to capture store
    const seedsInCapturingHand = capturingHand.querySelectorAll('.seed');
    const playerThatCaptured = capturingHand.style.top[0] == '-' ? 1 : 2;
    const captureStore = document.querySelector(
      `.player-${playerThatCaptured} .captured`,
    );

    const pitSummary = captureStore.querySelector('.pit-summary');
    pitSummary.textContent = `${
      Number(pitSummary.textContent) + seedsInCapturingHand.length
    }`;

    seedsInCapturingHand.forEach((seed) => {
      capturingHand.removeChild(seed);
      captureStore.appendChild(seed);
    });
  }

  function handleDropSeedEvent(event) {
    if (!droppedNextSeed) {
      const firstSeedInHand = seedingHand.querySelector('.seed');
      seedingHand.removeChild(firstSeedInHand);
      const [row, column] = event.args;
      const pit = getPitAtPosition(row, column);
      pit.appendChild(firstSeedInHand);
      const pitSummary = pit.querySelector('.pit-summary');
      pitSummary.textContent = `${Number(pitSummary.textContent) + 1}`;
      droppedNextSeed = true;
    }
  }

  function handleSwitchTurnEvent() {
    updateTurn();
  }

  function handleCaptureEvent(event, fractionDone) {
    const [row, column, capturingPlayer] = event.args;

    const pit = getPitAtPosition(row, column);
    const seedsInPit = pit.querySelectorAll('.seed');
    seedsInPit.forEach((seed) => {
      pit.removeChild(seed);
      capturingHand.appendChild(seed);
    });

    const [capturedPitRowPosition, capturedPitColumnPosition] = getPitPosition(
      row,
      column,
    );
    const [
      captureStoreRowPosition,
      captureStoreColumnPosition,
    ] = getCaptureStorePosition(capturingPlayer + 1);

    capturingHand.style.top = `${
      capturedPitRowPosition +
      fractionDone * (captureStoreRowPosition - capturedPitRowPosition)
    }px`;
    capturingHand.style.left = `${
      capturedPitColumnPosition +
      fractionDone * (captureStoreColumnPosition - capturedPitColumnPosition)
    }px`;

    const pitSummary = pit.querySelector('.pit-summary');
    pitSummary.textContent = '0';
  }

  function getCaptureStorePosition(player) {
    return [-90 + (player - 1) * 450, 315];
  }
})();
