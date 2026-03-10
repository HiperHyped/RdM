let workspaceState = null;

function scaledPixelPosition(image, clickEvent) {
  const rect = image.getBoundingClientRect();
  const scaleX = image.naturalWidth / rect.width;
  const scaleY = image.naturalHeight / rect.height;
  return {
    x: (clickEvent.clientX - rect.left) * scaleX,
    y: (clickEvent.clientY - rect.top) * scaleY,
    displayX: clickEvent.clientX - rect.left,
    displayY: clickEvent.clientY - rect.top,
  };
}

function renderNodeList(nodes) {
  const list = document.getElementById('node-list');
  list.innerHTML = '';

  nodes
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((node) => {
      const item = document.createElement('li');
      item.className = 'node-row';
      item.innerHTML = `
        <div>
          <strong>${node.id}</strong><br />
          <span class="player-meta">${node.kind} | ${node.label || '-'} | (${node.x.toFixed(1)}, ${node.y.toFixed(1)})</span>
        </div>
        <button type="button" data-node-id="${node.id}">Excluir</button>
      `;
      list.appendChild(item);
    });
}

function wrapAwareEdgeTrace(left, right) {
  const xDelta = Math.abs((left.x ?? 0) - (right.x ?? 0));
  const lonDelta = Math.abs((left.lon ?? 0) - (right.lon ?? 0));
  if (lonDelta > 300 || xDelta > 1800) {
    const leftBoundaryLon = left.lon >= 0 ? 179.5 : -179.5;
    const rightBoundaryLon = right.lon >= 0 ? 179.5 : -179.5;
    return [
      {
        type: 'scattergeo',
        mode: 'lines',
        lat: [left.lat, left.lat],
        lon: [left.lon, leftBoundaryLon],
        line: { width: 2, color: 'rgba(240,180,41,0.6)' },
        hoverinfo: 'skip',
        showlegend: false,
      },
      {
        type: 'scattergeo',
        mode: 'lines',
        lat: [right.lat, right.lat],
        lon: [rightBoundaryLon, right.lon],
        line: { width: 2, color: 'rgba(240,180,41,0.6)' },
        hoverinfo: 'skip',
        showlegend: false,
      },
    ];
  }

  return [
    {
      type: 'scattergeo',
      mode: 'lines',
      lat: [left.lat, right.lat],
      lon: [left.lon, right.lon],
      line: { width: 2, color: 'rgba(240,180,41,0.6)' },
      hoverinfo: 'skip',
      showlegend: false,
    },
  ];
}

function renderPreviewMap(projectedNodes, edges, referenceProperties) {
  const nodeById = Object.fromEntries(projectedNodes.map((node) => [node.id, node]));
  const traces = [];

  edges.forEach((edge) => {
    const left = nodeById[edge.from_node_id];
    const right = nodeById[edge.to_node_id];
    if (!left || !right || left.lat === null || right.lat === null || left.lon === null || right.lon === null) {
      return;
    }
    traces.push(...wrapAwareEdgeTrace(left, right));
  });

  const typedNodes = {
    port: projectedNodes.filter((node) => node.kind === 'port'),
    toll: projectedNodes.filter((node) => node.kind === 'toll'),
    route: projectedNodes.filter((node) => node.kind === 'route'),
    fuel: projectedNodes.filter((node) => node.kind === 'fuel'),
    chance: projectedNodes.filter((node) => node.kind === 'chance'),
  };

  traces.push(
    {
      type: 'scattergeo',
      mode: 'markers+text',
      lat: typedNodes.port.map((node) => node.lat),
      lon: typedNodes.port.map((node) => node.lon),
      text: typedNodes.port.map((node) => node.label || node.id),
      textposition: 'top center',
      marker: { size: 9, color: '#ffffff', line: { width: 1, color: '#111827' } },
      name: 'Portos',
    },
    {
      type: 'scattergeo',
      mode: 'markers+text',
      lat: typedNodes.toll.map((node) => node.lat),
      lon: typedNodes.toll.map((node) => node.lon),
      text: typedNodes.toll.map((node) => node.label || node.id),
      textposition: 'top center',
      marker: { size: 10, symbol: 'diamond', color: '#f0b429', line: { width: 1, color: '#111827' } },
      name: 'Pedágios',
    },
    {
      type: 'scattergeo',
      mode: 'markers',
      lat: typedNodes.fuel.map((node) => node.lat),
      lon: typedNodes.fuel.map((node) => node.lon),
      marker: { size: 7, color: '#23b5d3', line: { width: 0.8, color: '#082032' } },
      name: 'Abastecimento',
    },
    {
      type: 'scattergeo',
      mode: 'markers',
      lat: typedNodes.chance.map((node) => node.lat),
      lon: typedNodes.chance.map((node) => node.lon),
      marker: { size: 9, symbol: 'circle-open', color: '#111827', line: { width: 2, color: '#111827' } },
      name: 'Sorte/Revés',
    },
    {
      type: 'scattergeo',
      mode: 'markers',
      lat: referenceProperties.map((item) => item.lat),
      lon: referenceProperties.map((item) => item.lon),
      marker: { size: 3, color: 'rgba(255,255,255,0.25)' },
      hoverinfo: 'skip',
      showlegend: false,
      name: 'Referência',
    },
  );

  Plotly.newPlot(
    'tool-preview-map',
    traces,
    {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 0, r: 0, t: 0, b: 0 },
      legend: { orientation: 'h', y: -0.05, x: 0, font: { color: '#d7e6f5' } },
      geo: {
        scope: 'world',
        projection: { type: 'natural earth' },
        showland: true,
        landcolor: '#2d6a4f',
        showcountries: true,
        countrycolor: '#94a3b8',
        showocean: true,
        oceancolor: '#0b7bc0',
        lakecolor: '#38bdf8',
        bgcolor: 'rgba(0,0,0,0)',
      },
    },
    { displayModeBar: false, responsive: true },
  );
}

function fillCalibrationForm(calibration) {
  const form = document.getElementById('calibration-form');
  Object.entries(calibration).forEach(([key, value]) => {
    const input = form.elements.namedItem(key);
    if (input && typeof value !== 'object') {
      input.value = value;
    }
  });

  const boardImage = document.getElementById('board-image');
  if (boardImage && calibration.source_image_url) {
    boardImage.src = calibration.source_image_url;
  }
}

function currentCalibrationPayload() {
  const form = document.getElementById('calibration-form');
  return {
    image_width: Number(form.elements.namedItem('image_width').value),
    image_height: Number(form.elements.namedItem('image_height').value),
    lon_min: Number(form.elements.namedItem('lon_min').value),
    lon_max: Number(form.elements.namedItem('lon_max').value),
    lat_min: Number(form.elements.namedItem('lat_min').value),
    lat_max: Number(form.elements.namedItem('lat_max').value),
    source_image_url: workspaceState?.calibration?.source_image_url || '/static/assets/board-source-updated.png',
    anchors: workspaceState?.calibration?.anchors || [],
  };
}

async function loadWorkspace() {
  const response = await fetch('/api/map/bootstrap');
  return response.json();
}

async function refreshWorkspace() {
  workspaceState = await loadWorkspace();
  renderNodeList(workspaceState.nodes);
  renderPreviewMap(workspaceState.projected_nodes, workspaceState.edges, workspaceState.reference_properties);
  fillCalibrationForm(workspaceState.calibration);
  return workspaceState;
}

document.addEventListener('DOMContentLoaded', async () => {
  const boardImage = document.getElementById('board-image');
  const marker = document.getElementById('capture-marker');
  const nodeForm = document.getElementById('node-form');
  const nodeList = document.getElementById('node-list');
  const calibrationForm = document.getElementById('calibration-form');

  boardImage.addEventListener('click', (event) => {
    const pixel = scaledPixelPosition(boardImage, event);
    nodeForm.elements.namedItem('x').value = pixel.x.toFixed(2);
    nodeForm.elements.namedItem('y').value = pixel.y.toFixed(2);
    marker.classList.remove('hidden');
    marker.style.left = `${pixel.displayX}px`;
    marker.style.top = `${pixel.displayY}px`;
  });

  nodeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      kind: nodeForm.elements.namedItem('kind').value,
      label: nodeForm.elements.namedItem('label').value,
      route_id: nodeForm.elements.namedItem('route_id').value || null,
      order: nodeForm.elements.namedItem('order').value ? Number(nodeForm.elements.namedItem('order').value) : null,
      x: Number(nodeForm.elements.namedItem('x').value),
      y: Number(nodeForm.elements.namedItem('y').value),
      lat: null,
      lon: null,
      notes: '',
    };

    await fetch('/api/map/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    nodeForm.reset();
    marker.classList.add('hidden');
    await refreshWorkspace();
  });

  nodeList.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const nodeId = target.dataset.nodeId;
    if (!nodeId) {
      return;
    }
    await fetch(`/api/map/nodes/${nodeId}`, { method: 'DELETE' });
    await refreshWorkspace();
  });

  calibrationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await fetch('/api/map/calibration', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentCalibrationPayload()),
    });
    await refreshWorkspace();
  });

  await refreshWorkspace();
});

