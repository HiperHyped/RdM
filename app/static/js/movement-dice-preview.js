const movementDiceState = {
  values: [1, 1],
  finalValues: [1, 1],
  rolling: false,
  rafId: 0,
};

function getMovementDiceStage() {
  return document.getElementById('movement-dice-stage');
}

function getMovementDiceButton() {
  return document.getElementById('movement-dice-button');
}

function getMovementDiceResult() {
  return document.getElementById('movement-dice-result');
}

function getMovementDiceActive() {
  return document.getElementById('movement-dice-active');
}

function randomDie() {
  return 1 + Math.floor(Math.random() * 6);
}

function setMovementDiceResult(message) {
  const node = getMovementDiceResult();
  if (node) node.textContent = message;
}

function setMovementDiceActive(message) {
  const node = getMovementDiceActive();
  if (node) node.textContent = message;
}

function renderMovementDice() {
  const stage = getMovementDiceStage();
  const button = getMovementDiceButton();
  if (!stage) return;

  const total = movementDiceState.values[0] + movementDiceState.values[1];
  const isDouble = movementDiceState.values[0] === movementDiceState.values[1];
  const rollingClass = movementDiceState.rolling ? ' is-rolling' : '';
  const note = movementDiceState.rolling
    ? 'Rolando...'
    : (isDouble ? 'Dupla. O jogador ganha uma jogada extra.' : 'Sem dupla nesta rolagem.');

  stage.innerHTML = `
    <div class="movement-dice-pair">
      <article class="movement-die${rollingClass}">
        <span class="movement-die-value">${movementDiceState.values[0]}</span>
      </article>
      <article class="movement-die${rollingClass}">
        <span class="movement-die-value">${movementDiceState.values[1]}</span>
      </article>
    </div>
    <div class="movement-dice-summary">
      <strong class="movement-dice-total">Total ${total}</strong>
      <span class="movement-dice-note">${note}</span>
    </div>
  `;

  if (button) {
    button.disabled = movementDiceState.rolling;
    button.textContent = movementDiceState.rolling ? 'Rolando...' : 'Rolar 2 dados';
  }
}

function startMovementDiceRoll() {
  if (movementDiceState.rolling) return;

  movementDiceState.rolling = true;
  movementDiceState.finalValues = [randomDie(), randomDie()];
  setMovementDiceActive('Rolando');
  setMovementDiceResult('Os dois dados estao rolando...');
  renderMovementDice();

  const startedAt = performance.now();
  const durationMs = 1450;
  const tickMs = 80;
  let lastTickAt = 0;

  function step(now) {
    const elapsed = now - startedAt;

    if ((now - lastTickAt) >= tickMs) {
      movementDiceState.values = [randomDie(), randomDie()];
      lastTickAt = now;
      renderMovementDice();
    }

    if (elapsed < durationMs) {
      movementDiceState.rafId = window.requestAnimationFrame(step);
      return;
    }

    movementDiceState.rolling = false;
    movementDiceState.values = [...movementDiceState.finalValues];
    const [left, right] = movementDiceState.values;
    const total = left + right;
    const isDouble = left === right;
    setMovementDiceActive(isDouble ? `Dupla ${left}-${right}` : `Resultado ${left}-${right}`);
    setMovementDiceResult(isDouble
      ? `Resultado final: ${left} + ${right} = ${total}. Saiu dupla, entao ha uma jogada extra.`
      : `Resultado final: ${left} + ${right} = ${total}.`);
    renderMovementDice();
  }

  if (movementDiceState.rafId) {
    window.cancelAnimationFrame(movementDiceState.rafId);
  }
  movementDiceState.rafId = window.requestAnimationFrame(step);
}

document.addEventListener('DOMContentLoaded', () => {
  movementDiceState.values = [randomDie(), randomDie()];
  renderMovementDice();
  document.getElementById('movement-dice-button')?.addEventListener('click', startMovementDiceRoll);
});
