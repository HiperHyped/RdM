(function attachSaveBrowser(global) {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatSavedAt(savedAt) {
    if (!savedAt) return '--';
    const parsed = new Date(savedAt);
    if (Number.isNaN(parsed.getTime())) return String(savedAt);
    return parsed.toLocaleString('pt-BR');
  }

  function createSaveBrowserController(config) {
    const state = config.state;
    const byId = config.byId;
    const fetchJson = config.fetchJson;
    const setPaused = config.setPaused;
    const openDecisionModal = config.openDecisionModal;
    const runtime = config.runtime;
    const onLoad = typeof config.onLoad === 'function' ? config.onLoad : null;
    const onAfterSuccess = typeof config.onAfterSuccess === 'function' ? config.onAfterSuccess : null;
    const baseTitle = config.title || 'Saves compativeis';
    const baseCopy = config.copy || 'Selecione um save compativel para validar o arquivo.';
    const emptyCopy = config.emptyCopy || 'Nenhum save compativel encontrado para esta tela.';
    const confirmEyebrow = config.confirmEyebrow || 'Carregamento de Arquivo';
    const confirmTitle = config.confirmTitle || 'Carregamento de Arquivo';
    const confirmCopyBuilder = config.confirmCopyBuilder || ((payload) => {
      const label = payload?.meta?.file_name || payload?.meta?.label || 'selecionado';
      return `Arquivo <strong>${escapeHtml(label)}</strong> carregado com sucesso.`;
    });
    const failureEyebrow = config.failureEyebrow || 'Carregamento de Arquivo';
    const failureTitle = config.failureTitle || 'Carregamento de Arquivo';
    const failureCopy = config.failureCopy || 'Nao foi possivel carregar o arquivo selecionado.';
    const latestEyebrow = config.latestEyebrow || 'Continuar';
    const latestTitle = config.latestTitle || 'Continuar';
    const latestEmptyCopy = config.latestEmptyCopy || 'Nenhum save compativel encontrado para continuar nesta tela.';

    function buildTurnLabel(payload) {
      const meta = payload?.meta || {};
      const record = payload?.record || {};
      const snapshot = record.snapshot || {};
      const session = snapshot.session || {};
      return meta.turn_label || session.turn_label || '--';
    }

    const turnDetailLabel = config.turnDetailLabel || 'Turno';
    const turnDetailValue = config.turnDetailValue || ((payload) => buildTurnLabel(payload));
    const showFileCard = config.showFileCard !== false;
    const showVariantCard = Boolean(config.showVariantCard);
    const showSelectedTitle = Boolean(config.showSelectedTitle);
    const selectedTitleBuilder = config.selectedTitleBuilder || ((payload) => payload?.meta?.label || payload?.meta?.file_name || 'Save');
    const selectedBadgeBuilder = config.selectedBadgeBuilder || (() => '');
    const resumeAfterSuccess = config.resumeAfterSuccess !== false;

    const confirmCopy = confirmCopyBuilder || ((payload) => {
      const label = payload?.meta?.file_name || payload?.meta?.label || 'selecionado';
      return `Arquivo <strong>${escapeHtml(label)}</strong> carregado com sucesso.`;
    });

    if (!state.loadBrowser) {
      state.loadBrowser = {};
    }

    function browserState() {
      return state.loadBrowser;
    }

    function getOverlay() { return byId('load-browser-overlay'); }
    function getTitle() { return byId('load-browser-title'); }
    function getCopy() { return byId('load-browser-copy'); }
    function getStatus() { return byId('load-browser-status'); }
    function getRefresh() { return byId('load-browser-refresh'); }
    function getList() { return byId('load-browser-list'); }
    function getDetail() { return byId('load-browser-detail'); }
    function getPrimary() { return byId('load-browser-primary'); }
    function getSecondary() { return byId('load-browser-secondary'); }

    function ensureBrowserDefaults() {
      Object.assign(browserState(), {
        resolver: null,
        runtime,
        items: [],
        selectedFileName: '',
        selectedSave: null,
        loading: false,
        error: '',
        wasPaused: false,
      }, browserState());
    }

    function setVisible(visible) {
      const overlay = getOverlay();
      if (!overlay) return;
      overlay.classList.toggle('is-hidden', !visible);
      overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    function currentItemsLabel() {
      const items = browserState().items || [];
      if (!items.length) return emptyCopy;
      return `${items.length} save${items.length === 1 ? '' : 's'} compativel${items.length === 1 ? '' : 'eis'} nesta tela.`;
    }

    function buildDetailMarkup(payload) {
      const meta = payload?.meta || {};
      const record = payload?.record || {};
      const snapshot = record.snapshot || {};
      const session = snapshot.session || {};
      const players = Array.isArray(snapshot.players) ? snapshot.players : [];
      const detailCards = [];
      if (showFileCard) {
        detailCards.push(`
            <div class="load-browser-detail-card">
              <span>Arquivo</span>
              <strong>${escapeHtml(meta.file_name || '--')}</strong>
            </div>
        `);
      }
      detailCards.push(`
            <div class="load-browser-detail-card">
              <span>Salvo em</span>
              <strong>${escapeHtml(formatSavedAt(meta.saved_at))}</strong>
            </div>
      `);
      detailCards.push(`
            <div class="load-browser-detail-card">
              <span>Modo</span>
              <strong>${escapeHtml(meta.mode || '--')}</strong>
            </div>
      `);
      if (showVariantCard) {
        detailCards.push(`
            <div class="load-browser-detail-card">
              <span>Variante</span>
              <strong>${escapeHtml(meta.variant || '--')}</strong>
            </div>
        `);
      }
      detailCards.push(`
            <div class="load-browser-detail-card">
              <span>${escapeHtml(turnDetailLabel)}</span>
              <strong>${escapeHtml(turnDetailValue(payload) || '--')}</strong>
            </div>
      `);
      detailCards.push(`
            <div class="load-browser-detail-card">
              <span>Jogadores</span>
              <strong>${players.length}</strong>
            </div>
      `);
      const selectedTitle = showSelectedTitle ? `
            <div>
              <p class="eyebrow">Arquivo selecionado</p>
              <h3>${escapeHtml(selectedTitleBuilder(payload))}</h3>
            </div>
      ` : '<p class="eyebrow">Arquivo selecionado</p>';
      const selectedBadge = selectedBadgeBuilder(payload);

      return `
        <div class="load-browser-detail-stack">
          <div class="load-browser-detail-head">
            ${selectedTitle}
            ${selectedBadge ? `<span class="load-browser-detail-turn">${escapeHtml(selectedBadge)}</span>` : ''}
          </div>
          <div class="load-browser-detail-grid">
            ${detailCards.join('')}
          </div>
        </div>
      `;
    }

    function renderList() {
      const list = getList();
      if (!list) return;
      list.innerHTML = '';

      if (browserState().loading && !(browserState().items || []).length) {
        list.innerHTML = '<div class="load-browser-empty">Buscando saves compativeis...</div>';
        return;
      }

      if (!(browserState().items || []).length) {
        list.innerHTML = `<div class="load-browser-empty">${escapeHtml(browserState().error || emptyCopy)}</div>`;
        return;
      }

      browserState().items.forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `load-browser-item${browserState().selectedFileName === item.file_name ? ' is-selected' : ''}`;
        button.innerHTML = `
          <span class="load-browser-item-title">${escapeHtml(item.label || item.file_name || '--')}</span>
          <span class="load-browser-item-meta">${escapeHtml(item.turn_label || '--')} • ${escapeHtml(formatSavedAt(item.saved_at))}</span>
        `;
        button.addEventListener('click', () => {
          selectSave(item.file_name).catch(() => {});
        });
        list.appendChild(button);
      });
    }

    function renderDetail() {
      const detail = getDetail();
      if (!detail) return;
      if (browserState().loading && !browserState().selectedSave) {
        detail.innerHTML = '<div class="load-browser-detail-empty">Carregando detalhes do save...</div>';
        return;
      }
      if (browserState().selectedSave) {
        detail.innerHTML = buildDetailMarkup(browserState().selectedSave);
        return;
      }
      detail.innerHTML = `<div class="load-browser-detail-empty">${escapeHtml(browserState().error || 'Selecione um save para inspecionar os detalhes.')}</div>`;
    }

    function renderChrome() {
      const title = getTitle();
      const copy = getCopy();
      const status = getStatus();
      const refresh = getRefresh();
      const primary = getPrimary();
      const secondary = getSecondary();
      if (title) title.textContent = baseTitle;
      if (copy) copy.textContent = baseCopy;
      if (status) {
        if (browserState().loading && !(browserState().items || []).length) status.textContent = 'Buscando saves...';
        else if (browserState().loading) status.textContent = 'Validando save selecionado...';
        else status.textContent = browserState().error && !(browserState().items || []).length ? browserState().error : currentItemsLabel();
      }
      if (refresh) refresh.disabled = browserState().loading;
      if (primary) primary.disabled = browserState().loading || !browserState().selectedSave;
      if (secondary) secondary.disabled = false;
    }

    function render() {
      renderChrome();
      renderList();
      renderDetail();
    }

    async function selectSave(fileName) {
      const resolvedName = String(fileName || '').trim();
      if (!resolvedName || browserState().loading) return;
      browserState().selectedFileName = resolvedName;
      browserState().selectedSave = null;
      browserState().error = '';
      browserState().loading = true;
      render();
      try {
        browserState().selectedSave = await fetchJson(`/api/saves/runtime/${encodeURIComponent(runtime)}/${encodeURIComponent(resolvedName)}`);
      } catch (_error) {
        browserState().selectedSave = null;
        browserState().error = 'Nao foi possivel ler o save selecionado.';
      } finally {
        browserState().loading = false;
        render();
      }
    }

    async function refresh() {
      browserState().runtime = runtime;
      browserState().items = [];
      browserState().selectedFileName = '';
      browserState().selectedSave = null;
      browserState().error = '';
      browserState().loading = true;
      render();
      try {
        const response = await fetchJson(`/api/saves/runtime/${encodeURIComponent(runtime)}`);
        browserState().items = Array.isArray(response?.saves) ? response.saves : [];
        browserState().loading = false;
        render();
        if (browserState().items.length) {
          await selectSave(browserState().items[0].file_name);
        }
      } catch (_error) {
        browserState().items = [];
        browserState().selectedSave = null;
        browserState().error = 'Nao foi possivel listar os saves compativeis.';
        browserState().loading = false;
        render();
      }
    }

    function close(result = 'secondary', { restorePause = true } = {}) {
      const overlay = getOverlay();
      const resolver = browserState().resolver;
      const shouldResume = restorePause && !browserState().wasPaused;
      if (overlay) overlay.onkeydown = null;
      setVisible(false);
      browserState().resolver = null;
      browserState().wasPaused = false;
      if (shouldResume) setPaused(false);
      if (resolver) resolver(result === 'primary' ? browserState().selectedSave : null);
    }

    function triggerEnterOnOverlay() {
      if (getOverlay()?.classList.contains('is-hidden')) return false;
      const button = getPrimary();
      if (button && !button.disabled) {
        button.click();
        return true;
      }
      return false;
    }

    function open() {
      const wasPausedBeforeOpen = Boolean(state.view?.paused);
      ensureBrowserDefaults();
      const overlay = getOverlay();
      const primary = getPrimary();
      const secondary = getSecondary();
      const refreshButton = getRefresh();
      browserState().wasPaused = wasPausedBeforeOpen;
      setPaused(true);
      if (primary) primary.onclick = () => close('primary', { restorePause: false });
      if (secondary) secondary.onclick = () => close('secondary');
      if (refreshButton) refreshButton.onclick = () => {
        refresh().catch(() => {});
      };
      if (overlay) {
        overlay.tabIndex = -1;
        overlay.onkeydown = (event) => {
          if (event.key === 'Escape' && !event.repeat) {
            event.preventDefault();
            close('secondary');
            return;
          }
          if (event.key === 'Enter' && !event.repeat) {
            const button = getPrimary();
            if (button && !button.disabled) {
              event.preventDefault();
              button.click();
            }
          }
        };
      }
      setVisible(true);
      render();
      window.requestAnimationFrame(() => {
        overlay?.focus();
      });
      refresh().catch(() => {});
      return new Promise((resolve) => {
        browserState().resolver = resolve;
      });
    }

    async function confirmLoadedPayload(payload, wasPausedBeforeOpen) {
      if (onLoad) {
        await onLoad(payload);
      }
      await openDecisionModal({
        eyebrowLabel: confirmEyebrow,
        title: confirmTitle,
        copy: confirmCopy(payload),
        copyIsHtml: true,
        hideTitle: !confirmTitle || confirmTitle === confirmEyebrow,
        primaryLabel: 'OK',
        hideSecondary: true,
      });
      if (resumeAfterSuccess && !wasPausedBeforeOpen) {
        setPaused(false);
        if (onAfterSuccess) {
          await onAfterSuccess(payload);
        }
      } else {
        setPaused(true);
      }
    }

    async function showLoadFailure(wasPausedBeforeOpen) {
      await openDecisionModal({
        eyebrowLabel: failureEyebrow,
        title: failureTitle,
        copy: failureCopy,
        hideTitle: !failureTitle || failureTitle === failureEyebrow,
        primaryLabel: 'OK',
        hideSecondary: true,
      });
      if (!wasPausedBeforeOpen) {
        setPaused(false);
      }
    }

    async function browseCompatibleSaves() {
      const wasPausedBeforeOpen = Boolean(state.view?.paused);
      const selectedPayload = await open();
      if (!selectedPayload) return null;
      try {
        await confirmLoadedPayload(selectedPayload, wasPausedBeforeOpen);
      } catch (_error) {
        await showLoadFailure(wasPausedBeforeOpen);
        return null;
      }
      return selectedPayload;
    }

    async function loadLatestCompatibleSave() {
      const wasPausedBeforeOpen = Boolean(state.view?.paused);
      setPaused(true);
      try {
        const response = await fetchJson(`/api/saves/runtime/${encodeURIComponent(runtime)}`);
        const items = Array.isArray(response?.saves) ? response.saves : [];
        if (!items.length) {
          await openDecisionModal({
            eyebrowLabel: latestEyebrow,
            title: latestTitle,
            copy: latestEmptyCopy,
            hideTitle: !latestTitle || latestTitle === latestEyebrow,
            primaryLabel: 'OK',
            hideSecondary: true,
          });
          if (!wasPausedBeforeOpen) {
            setPaused(false);
          }
          return null;
        }
        const latestFileName = String(items[0]?.file_name || '').trim();
        if (!latestFileName) {
          throw new Error('latest-save-missing-file-name');
        }
        const payload = await fetchJson(`/api/saves/runtime/${encodeURIComponent(runtime)}/${encodeURIComponent(latestFileName)}`);
        await confirmLoadedPayload(payload, wasPausedBeforeOpen);
        return payload;
      } catch (_error) {
        await showLoadFailure(wasPausedBeforeOpen);
        return null;
      }
    }

    ensureBrowserDefaults();
    return {
      browseCompatibleSaves,
      close,
      loadLatestCompatibleSave,
      open,
      refresh,
      triggerEnterOnOverlay,
    };
  }

  global.createSaveBrowserController = createSaveBrowserController;
})(window);