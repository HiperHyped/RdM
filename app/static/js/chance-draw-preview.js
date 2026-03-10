const chanceDrawState = {
  cards: [],
  order: [],
  visibleIds: [],
  selectedCardId: '',
  drawing: false,
  frame: 0,
  rafId: 0,
};

function getChanceDrawData() {
  const node = document.getElementById('chance-draw-preview-data');
  return node ? JSON.parse(node.textContent || '[]') : [];
}

function getChanceDrawStage() {
  return document.getElementById('chance-draw-stage');
}

function getChanceDrawButton() {
  return document.getElementById('chance-draw-button');
}

function getChanceDrawResult() {
  return document.getElementById('chance-draw-result');
}

function getChanceDrawActive() {
  return document.getElementById('chance-draw-active');
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function visibleCards() {
  if (chanceDrawState.selectedCardId) {
    const selected = chanceDrawState.cards.find((card) => card.id === chanceDrawState.selectedCardId);
    const rest = chanceDrawState.order
      .filter((id) => id !== chanceDrawState.selectedCardId)
      .slice(0, 10)
      .map((id) => chanceDrawState.cards.find((card) => card.id === id))
      .filter(Boolean);
    return selected ? [selected, ...rest] : rest;
  }

  return chanceDrawState.order
    .slice(0, 12)
    .map((id) => chanceDrawState.cards.find((card) => card.id === id))
    .filter(Boolean);
}

function setChanceDrawResult(message) {
  const node = getChanceDrawResult();
  if (node) node.textContent = message;
}

function setChanceDrawActive(message) {
  const node = getChanceDrawActive();
  if (node) node.textContent = message;
}

function chanceCardTransform(index, cardId) {
  const total = visibleCards().length || 1;
  const centeredIndex = index - ((total - 1) / 2);

  if (chanceDrawState.drawing) {
    const frame = chanceDrawState.frame;
    const x = Math.sin((frame * 0.2) + index) * 170 + (centeredIndex * 12);
    const y = Math.cos((frame * 0.16) + (index * 0.8)) * 36;
    const rotate = Math.sin((frame * 0.1) + index) * 18;
    return `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(0.94)`;
  }

  if (chanceDrawState.selectedCardId) {
    if (cardId === chanceDrawState.selectedCardId) {
      return 'translate(0px, -8px) rotate(0deg) scale(1.06)';
    }
    return `translate(${centeredIndex * 90}px, 114px) rotate(${centeredIndex * 7}deg) scale(0.8)`;
  }

  return `translate(${centeredIndex * 18}px, ${Math.abs(centeredIndex) * 3}px) rotate(${centeredIndex * 4}deg)`;
}

function renderChanceDraw() {
  const stage = getChanceDrawStage();
  const button = getChanceDrawButton();
  if (!stage) return;

  const cards = visibleCards();
  stage.innerHTML = cards.map((card, index) => {
    const selected = chanceDrawState.selectedCardId === card.id;
    const faded = Boolean(chanceDrawState.selectedCardId) && !selected;
    const zIndex = selected ? 1000 : (faded ? 50 + index : 120 + index);
    return `
      <article class="chance-draw-card${selected ? ' is-selected' : ''}${faded ? ' is-faded' : ''}" style="--chance-accent:${card.accent}; --chance-text:${card.text}; transform:${chanceCardTransform(index, card.id)}; z-index:${zIndex};">
        <header class="chance-draw-card-head">${card.title}</header>
        <div class="chance-draw-card-body">${card.description}</div>
        <footer class="chance-draw-card-foot">${card.effect_text}</footer>
      </article>
    `;
  }).join('');

  if (button) {
    button.disabled = chanceDrawState.drawing;
    button.textContent = chanceDrawState.drawing ? 'Embaralhando...' : 'Embaralhar e sortear';
  }
}

function startChanceDraw() {
  if (chanceDrawState.drawing || !chanceDrawState.cards.length) return;
  chanceDrawState.drawing = true;
  chanceDrawState.selectedCardId = '';
  chanceDrawState.frame = 0;
  setChanceDrawActive('Embaralhando');
  setChanceDrawResult('Misturando o baralho de sorte e rev?s...');
  renderChanceDraw();

  const durationMs = 1900;
  const shuffleEveryMs = 100;
  let lastShuffleAt = 0;
  const startedAt = performance.now();

  function step(now) {
    const elapsed = now - startedAt;
    chanceDrawState.frame += 1;

    if ((now - lastShuffleAt) >= shuffleEveryMs) {
      chanceDrawState.order = shuffleArray(chanceDrawState.cards.map((card) => card.id));
      lastShuffleAt = now;
    }

    renderChanceDraw();

    if (elapsed < durationMs) {
      chanceDrawState.rafId = window.requestAnimationFrame(step);
      return;
    }

    chanceDrawState.drawing = false;
    chanceDrawState.order = shuffleArray(chanceDrawState.cards.map((card) => card.id));
    const selected = chanceDrawState.order[Math.floor(Math.random() * chanceDrawState.order.length)];
    chanceDrawState.selectedCardId = selected;
    const card = chanceDrawState.cards.find((item) => item.id === selected);
    setChanceDrawActive(card ? `${card.category_label}: ${card.title}` : 'Carta sorteada');
    setChanceDrawResult(`Carta sorteada: ${card?.title || 'desconhecida'} (${card?.category_label || 'baralho'}).`);
    renderChanceDraw();
  }

  if (chanceDrawState.rafId) {
    window.cancelAnimationFrame(chanceDrawState.rafId);
  }
  chanceDrawState.rafId = window.requestAnimationFrame(step);
}

document.addEventListener('DOMContentLoaded', () => {
  chanceDrawState.cards = getChanceDrawData();
  chanceDrawState.order = shuffleArray(chanceDrawState.cards.map((card) => card.id));
  renderChanceDraw();
  document.getElementById('chance-draw-button')?.addEventListener('click', startChanceDraw);
});
