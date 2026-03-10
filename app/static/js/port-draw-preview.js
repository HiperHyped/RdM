const portDrawState = {
  cards: [],
  mode: 'origin',
  originCode: 'RIO',
  order: [],
  selectedCardId: '',
  drawing: false,
  frame: 0,
  rafId: 0,
};

function getPortDrawData() {
  const node = document.getElementById('port-draw-preview-data');
  return node ? JSON.parse(node.textContent || '[]') : [];
}

function getPortDrawConfig() {
  const node = document.getElementById('port-draw-preview-config');
  return node ? JSON.parse(node.textContent || '{}') : {};
}

function getPortDrawStage() {
  return document.getElementById('port-draw-stage');
}

function getPortDrawButton() {
  return document.getElementById('port-draw-button');
}

function getPortDrawResult() {
  return document.getElementById('port-draw-result');
}

function getPortDrawActive() {
  return document.getElementById('port-draw-active');
}

function getPortDrawCopy() {
  return document.getElementById('port-draw-copy');
}

function getPortDrawOriginSelect() {
  return document.getElementById('port-draw-origin-select');
}

function getPortDrawRuleCopy() {
  return document.getElementById('port-draw-rule-copy');
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function currentOriginCard() {
  return portDrawState.cards.find((card) => card.code === portDrawState.originCode) || null;
}

function availablePortCards() {
  if (portDrawState.mode !== 'destination') {
    return [...portDrawState.cards];
  }

  const origin = currentOriginCard();
  if (!origin) {
    return [...portDrawState.cards];
  }

  return portDrawState.cards.filter((card) => card.code !== origin.code && card.continent !== origin.continent);
}

function visiblePortCards() {
  const available = availablePortCards();
  const visibleIds = portDrawState.order.filter((id) => available.some((card) => card.code === id));
  const cards = visibleIds
    .slice(0, 10)
    .map((id) => available.find((card) => card.code === id))
    .filter(Boolean);

  if (portDrawState.selectedCardId) {
    const selected = available.find((card) => card.code === portDrawState.selectedCardId);
    const rest = visibleIds
      .filter((id) => id !== portDrawState.selectedCardId)
      .slice(0, 8)
      .map((id) => available.find((card) => card.code === id))
      .filter(Boolean);
    return selected ? [selected, ...rest] : rest;
  }

  return cards;
}

function syncPortOrder() {
  portDrawState.order = shuffleArray(availablePortCards().map((card) => card.code));
}

function setPortDrawResult(message) {
  const node = getPortDrawResult();
  if (node) node.textContent = message;
}

function setPortDrawActive(message) {
  const node = getPortDrawActive();
  if (node) node.textContent = message;
}

function updatePortDrawCopy() {
  const copy = getPortDrawCopy();
  const rule = getPortDrawRuleCopy();
  const availableCount = availablePortCards().length;
  if (!copy) return;

  if (portDrawState.mode === 'origin') {
    copy.textContent = 'Todos os 30 portos entram no embaralhamento. O sorteio final escolhe o porto inicial da companhia.';
    return;
  }

  if (portDrawState.mode === 'toll') {
    copy.textContent = 'Os seis pedagios entram no embaralhamento. O sorteio final escolhe o pedagio obrigatorio da rota.';
    return;
  }

  const origin = currentOriginCard();
  if (!origin) {
    copy.textContent = 'Selecione um porto de saida para filtrar os destinos validos.';
    if (rule) rule.textContent = 'Destino deve ser de outra regiao.';
    return;
  }

  copy.textContent = `Origem atual: ${origin.code} - ${origin.name}. O embaralhamento considera ${availableCount} destinos validos.`;
  if (rule) rule.textContent = `Exclui ${origin.code} e toda a regiao ${origin.continent}.`;
}

function cargoIconSvg(kind) {
  if (kind === 'bulk') return '<svg viewBox="0 0 32 32" class="port-draw-icon-svg" aria-hidden="true"><polygon points="16,4 28,26 4,26" fill="#8ed26a" stroke="#00a651" stroke-width="2.8"></polygon></svg>';
  if (kind === 'container') return '<svg viewBox="0 0 32 32" class="port-draw-icon-svg" aria-hidden="true"><rect x="5" y="7" width="22" height="18" fill="#4f7de8" stroke="#355fb6" stroke-width="2.6"></rect><polygon points="27,7 30,10 30,28 27,25" fill="#355fb6" stroke="#355fb6" stroke-width="1"></polygon><line x1="10" y1="10" x2="10" y2="23" stroke="#6e94ef" stroke-width="1.6"></line><line x1="16" y1="10" x2="16" y2="23" stroke="#6e94ef" stroke-width="1.6"></line><line x1="22" y1="10" x2="22" y2="23" stroke="#6e94ef" stroke-width="1.6"></line></svg>';
  if (kind === 'oil') return '<svg viewBox="0 0 32 32" class="port-draw-icon-svg" aria-hidden="true"><path d="M16 4 C20 10, 26 15, 26 21 C26 27, 21.5 30, 16 30 C10.5 30, 6 27, 6 21 C6 15, 12 10, 16 4 Z" fill="#b9babd" stroke="#7d7d81" stroke-width="2.6"></path></svg>';
  if (kind === 'gas') return '<svg viewBox="0 0 32 32" class="port-draw-icon-svg" aria-hidden="true"><polygon points="16,3 20,12 29,16 20,20 16,29 12,20 3,16 12,12" fill="#f5b33d" stroke="#c66b1d" stroke-width="2.6"></polygon></svg>';
  if (kind === 'cruise') return '<svg viewBox="0 0 32 32" class="port-draw-icon-svg" aria-hidden="true"><circle cx="16" cy="16" r="11.5" fill="#ffb49e" stroke="#df4f3f" stroke-width="2.6"></circle><circle cx="12" cy="13" r="1.7" fill="#df4f3f"></circle><circle cx="20" cy="13" r="1.7" fill="#df4f3f"></circle><path d="M10 20 C12.5 22.5, 19.5 22.5, 22 20" fill="none" stroke="#df4f3f" stroke-width="2.4" stroke-linecap="round"></path></svg>';
  return '<svg viewBox="0 0 32 32" class="port-draw-icon-svg" aria-hidden="true"><rect x="4.5" y="18" width="23" height="6" rx="1.8" fill="#d5f1fb" stroke="#12b8e6" stroke-width="2.4"></rect><rect x="9" y="9" width="14" height="9" rx="1.6" fill="#d5f1fb" stroke="#12b8e6" stroke-width="2.4"></rect><circle cx="10.5" cy="26.5" r="2.7" fill="none" stroke="#12b8e6" stroke-width="2.2"></circle><circle cx="21.5" cy="26.5" r="2.7" fill="none" stroke="#12b8e6" stroke-width="2.2"></circle></svg>';
}


function tollDiamondSvg() {
  return '<svg viewBox="0 0 28 18" class="port-draw-toll-diamond" aria-hidden="true"><polygon points="14,2 26,9 14,16 2,9" fill="none" stroke="#05070a" stroke-width="2.8"></polygon></svg>';
}

function renderPortDrawRows(card) {
  return card.rows.map((row) => `
    <div class="port-draw-row">
      <div class="port-draw-icon" title="${row.label}">${cargoIconSvg(row.kind)}</div>
      <span class="port-draw-fee">${row.fee}</span>
      <span class="port-draw-multiplier">${row.multiplier}</span>
    </div>
  `).join('');
}

function portCardTransform(index, cardCode) {
  const total = visiblePortCards().length || 1;
  const centeredIndex = index - ((total - 1) / 2);

  if (portDrawState.drawing) {
    const frame = portDrawState.frame;
    const x = Math.sin((frame * 0.18) + index) * 220 + (centeredIndex * 12);
    const y = Math.cos((frame * 0.14) + (index * 0.85)) * 22;
    const rotate = Math.sin((frame * 0.09) + index) * 16;
    return `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(0.78)`;
  }

  if (portDrawState.selectedCardId) {
    if (cardCode === portDrawState.selectedCardId) {
      return 'translate(0px, -10px) rotate(0deg) scale(0.98)';
    }
    return `translate(${centeredIndex * 126}px, 132px) rotate(${centeredIndex * 6}deg) scale(0.72)`;
  }

  return `translate(${centeredIndex * 26}px, ${Math.abs(centeredIndex) * 3}px) rotate(${centeredIndex * 4}deg) scale(0.8)`;
}

function renderPortDraw() {
  const stage = getPortDrawStage();
  const button = getPortDrawButton();
  if (!stage) return;

  const cards = visiblePortCards();
  stage.innerHTML = cards.map((card, index) => {
    const selected = portDrawState.selectedCardId === card.code;
    const faded = Boolean(portDrawState.selectedCardId) && !selected;
    const zIndex = selected ? 1000 : (faded ? 40 + index : 120 + index);
    return `
      <article class="port-draw-card${card.is_toll ? ' toll-draw-card' : ''}${selected ? ' is-selected' : ''}${faded ? ' is-faded' : ''}" style="--title-fill:${card.fill}; --title-text:${card.text}; transform:${portCardTransform(index, card.code)}; z-index:${zIndex};">
        <header class="port-draw-card-head${card.is_toll ? ' toll-draw-title-head' : ''}">
          ${card.is_toll ? `<span class="port-draw-toll-side-icon">${tollDiamondSvg()}</span>` : `<span class="port-draw-title-number">${card.number_display}</span>`}
          <div class="port-draw-title-heading">
            <strong class="port-draw-title-code">${card.code}</strong>
            <span class="port-draw-title-name">${card.name} (${card.country})</span>
          </div>
          ${card.is_toll ? `<span class="port-draw-toll-side-icon">${tollDiamondSvg()}</span>` : ''}
        </header>
        <div class="port-draw-title-body">
          <div class="port-draw-table-head">
            <span>Carga</span>
            <span>${card.column_fee_label}</span>
            <span>${card.column_multiplier_label}</span>
          </div>
          <div class="port-draw-title-rows">${renderPortDrawRows(card)}</div>
        </div>
        <footer class="port-draw-card-foot">
          <span>Preco</span>
          <strong>${card.price}</strong>
        </footer>
      </article>
    `;
  }).join('');

  if (button) {
    button.disabled = portDrawState.drawing || !availablePortCards().length;
    button.textContent = portDrawState.drawing ? 'Embaralhando...' : 'Embaralhar e sortear';
  }
}

function finishPortDraw() {
  portDrawState.drawing = false;
  syncPortOrder();
  const available = availablePortCards();
  const selected = available[Math.floor(Math.random() * available.length)];
  portDrawState.selectedCardId = selected?.code || '';

  if (selected) {
    if (portDrawState.mode === 'origin') {
      setPortDrawActive(`Saida: ${selected.code}`);
      setPortDrawResult(`Porto de saida sorteado: ${selected.code} - ${selected.name}.`);
    } else if (portDrawState.mode === 'destination') {
      setPortDrawActive(`Destino: ${selected.code}`);
      setPortDrawResult(`Porto de destino sorteado: ${selected.code} - ${selected.name}.`);
    } else {
      setPortDrawActive(`Pedagio: ${selected.code}`);
      setPortDrawResult(`Pedagio sorteado: ${selected.code} - ${selected.name}.`);
    }
  }
  renderPortDraw();
}

function startPortDraw() {
  const available = availablePortCards();
  if (portDrawState.drawing || !available.length) return;

  portDrawState.drawing = true;
  portDrawState.selectedCardId = '';
  portDrawState.frame = 0;
  setPortDrawActive('Embaralhando');
  setPortDrawResult('Embaralhando os portos...');
  renderPortDraw();

  const durationMs = 1800;
  const shuffleEveryMs = 100;
  let lastShuffleAt = 0;
  const startedAt = performance.now();

  function step(now) {
    const elapsed = now - startedAt;
    portDrawState.frame += 1;

    if ((now - lastShuffleAt) >= shuffleEveryMs) {
      syncPortOrder();
      lastShuffleAt = now;
    }

    renderPortDraw();

    if (elapsed < durationMs) {
      portDrawState.rafId = window.requestAnimationFrame(step);
      return;
    }

    finishPortDraw();
  }

  if (portDrawState.rafId) {
    window.cancelAnimationFrame(portDrawState.rafId);
  }
  portDrawState.rafId = window.requestAnimationFrame(step);
}

function changeOrigin(event) {
  portDrawState.originCode = event.target.value;
  portDrawState.selectedCardId = '';
  syncPortOrder();
  updatePortDrawCopy();
  setPortDrawActive('Aguardando sorteio');
  setPortDrawResult('Clique em embaralhar para sortear um porto.');
  renderPortDraw();
}

document.addEventListener('DOMContentLoaded', () => {
  const config = getPortDrawConfig();
  portDrawState.cards = getPortDrawData();
  portDrawState.mode = config.mode || 'origin';
  portDrawState.originCode = config.default_origin || 'RIO';
  syncPortOrder();
  updatePortDrawCopy();
  renderPortDraw();

  document.getElementById('port-draw-button')?.addEventListener('click', startPortDraw);
  getPortDrawOriginSelect()?.addEventListener('change', changeOrigin);
});
