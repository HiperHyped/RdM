const previewState = {
  cards: [],
  order: [],
  selectedCardId: '',
  drawing: false,
  frame: 0,
  rafId: 0,
};

function getPreviewData() {
  const node = document.getElementById('permission-draw-preview-data');
  return node ? JSON.parse(node.textContent || '[]') : [];
}

function getPreviewStage() {
  return document.getElementById('permission-draw-preview-stage');
}

function getPreviewButton() {
  return document.getElementById('permission-draw-preview-button');
}

function getPreviewResult() {
  return document.getElementById('permission-draw-preview-result');
}

function getPreviewActiveBadge() {
  return document.getElementById('permission-draw-preview-active');
}

function permissionIconSvg(kind) {
  if (kind === 'bulk') return '<svg viewBox="0 0 32 32" class="permission-draw-icon-svg" aria-hidden="true"><polygon points="16,4 28,26 4,26" fill="#b8ef9b" stroke="#10b53a" stroke-width="2.6"></polygon></svg>';
  if (kind === 'container') return '<svg viewBox="0 0 32 32" class="permission-draw-icon-svg" aria-hidden="true"><rect x="5" y="8" width="22" height="14" fill="#6f8fce" stroke="#355fb6" stroke-width="2.4"></rect><polygon points="27,8 30,11 30,23 27,22" fill="#355fb6" stroke="#355fb6" stroke-width="1"></polygon></svg>';
  if (kind === 'oil') return '<svg viewBox="0 0 32 32" class="permission-draw-icon-svg" aria-hidden="true"><path d="M16 4 C20 10, 26 15, 26 21 C26 27, 21.5 30, 16 30 C10.5 30, 6 27, 6 21 C6 15, 12 10, 16 4 Z" fill="#b9babd" stroke="#7d7d81" stroke-width="2.4"></path></svg>';
  if (kind === 'gas') return '<svg viewBox="0 0 32 32" class="permission-draw-icon-svg" aria-hidden="true"><polygon points="16,3 20,12 29,16 20,20 16,29 12,20 3,16 12,12" fill="#ffd24a" stroke="#e68400" stroke-width="2.4"></polygon></svg>';
  if (kind === 'cruise') return '<svg viewBox="0 0 32 32" class="permission-draw-icon-svg" aria-hidden="true"><circle cx="16" cy="16" r="11.5" fill="#ffb49e" stroke="#df1a12" stroke-width="2.4"></circle><circle cx="12" cy="13" r="1.6" fill="#df1a12"></circle><circle cx="20" cy="13" r="1.6" fill="#df1a12"></circle><path d="M10 20 C12.5 22.5, 19.5 22.5, 22 20" fill="none" stroke="#df1a12" stroke-width="2.2" stroke-linecap="round"></path></svg>';
  return '<svg viewBox="0 0 32 32" class="permission-draw-icon-svg" aria-hidden="true"><rect x="4.5" y="18" width="23" height="6" rx="1.8" fill="#dff5ff" stroke="#18aef0" stroke-width="2.2"></rect><rect x="9" y="9" width="14" height="9" rx="1.5" fill="#dff5ff" stroke="#18aef0" stroke-width="2.2"></rect><circle cx="10.5" cy="26" r="2.5" fill="none" stroke="#18aef0" stroke-width="2"></circle><circle cx="21.5" cy="26" r="2.5" fill="none" stroke="#18aef0" stroke-width="2"></circle></svg>';
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function setPreviewResult(message) {
  const node = getPreviewResult();
  if (node) node.textContent = message;
}

function setPreviewActive(text) {
  const node = getPreviewActiveBadge();
  if (node) node.textContent = text;
}

function cardTransform(index, cardId) {
  const total = previewState.order.length || 1;
  const centeredIndex = index - ((total - 1) / 2);

  if (previewState.drawing) {
    const frame = previewState.frame;
    const x = Math.sin((frame * 0.18) + index) * 130 + (centeredIndex * 8);
    const y = Math.cos((frame * 0.14) + (index * 0.9)) * 18;
    const rotate = Math.sin((frame * 0.11) + index) * 18;
    return `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(0.96)`;
  }

  if (previewState.selectedCardId) {
    if (cardId === previewState.selectedCardId) {
      return 'translate(0px, -6px) rotate(0deg) scale(1.08)';
    }
    return `translate(${centeredIndex * 82}px, 82px) rotate(${centeredIndex * 6}deg) scale(0.86)`;
  }

  return `translate(${centeredIndex * 8}px, ${Math.abs(centeredIndex) * 1.5}px) rotate(${centeredIndex * 3}deg)`;
}

function renderPreview() {
  const stage = getPreviewStage();
  const button = getPreviewButton();
  if (!stage) return;

  const orderedCards = previewState.order
    .map((id) => previewState.cards.find((card) => card.id === id))
    .filter(Boolean);

  stage.innerHTML = orderedCards.map((card, index) => {
    const selected = previewState.selectedCardId === card.id;
    const faded = Boolean(previewState.selectedCardId) && !selected;
    const zIndex = selected ? 1000 : (faded ? 40 + index : 100 + index);
    return `
      <article class="permission-draw-card${selected ? ' is-selected' : ''}${faded ? ' is-faded' : ''}" style="--permission-accent:${card.accent}; --permission-text:${card.text}; transform:${cardTransform(index, card.id)}; z-index:${zIndex};">
        <header class="permission-draw-card-head">${card.title}</header>
        <div class="permission-draw-card-row permission-draw-card-row-top">
          <span class="permission-draw-icon">${permissionIconSvg(card.kind)}</span>
          <span class="permission-draw-icon">${permissionIconSvg(card.kind)}</span>
        </div>
        <div class="permission-draw-card-body">${card.body_text}</div>
        <div class="permission-draw-card-row permission-draw-card-row-bottom">
          <span class="permission-draw-icon">${permissionIconSvg(card.kind)}</span>
          <span class="permission-draw-icon">${permissionIconSvg(card.kind)}</span>
        </div>
      </article>
    `;
  }).join('');

  if (button) {
    button.disabled = previewState.drawing;
    button.textContent = previewState.drawing ? 'Embaralhando...' : 'Embaralhar e sortear';
  }
}

function startPreviewDraw() {
  if (previewState.drawing || !previewState.cards.length) return;
  previewState.drawing = true;
  previewState.selectedCardId = '';
  previewState.frame = 0;
  setPreviewActive('Embaralhando');
  setPreviewResult('Embaralhando as permissoes...');
  renderPreview();

  const durationMs = 1800;
  const shuffleEveryMs = 110;
  let lastShuffleAt = 0;
  const startedAt = performance.now();

  function step(now) {
    const elapsed = now - startedAt;
    previewState.frame += 1;

    if ((now - lastShuffleAt) >= shuffleEveryMs) {
      previewState.order = shuffleArray(previewState.cards.map((card) => card.id));
      lastShuffleAt = now;
    }

    renderPreview();

    if (elapsed < durationMs) {
      previewState.rafId = window.requestAnimationFrame(step);
      return;
    }

    previewState.drawing = false;
    previewState.order = shuffleArray(previewState.cards.map((card) => card.id));
    const selected = previewState.order[Math.floor(Math.random() * previewState.order.length)];
    previewState.selectedCardId = selected;
    const card = previewState.cards.find((item) => item.id === selected);
    setPreviewActive(card ? `Selecionada: ${card.title}` : 'Selecionada');
    setPreviewResult(`Permissao sorteada: ${card?.title || 'desconhecida'}.`);
    renderPreview();
  }

  if (previewState.rafId) {
    window.cancelAnimationFrame(previewState.rafId);
  }
  previewState.rafId = window.requestAnimationFrame(step);
}

document.addEventListener('DOMContentLoaded', () => {
  previewState.cards = getPreviewData();
  previewState.order = previewState.cards.map((card) => card.id);
  renderPreview();
  document.getElementById('permission-draw-preview-button')?.addEventListener('click', startPreviewDraw);
});
