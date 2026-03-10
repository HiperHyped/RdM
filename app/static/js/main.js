const SHIP_SYMBOLS = {
  bulk: "square",
  container: "diamond",
  oil: "triangle-up",
  gas: "triangle-down",
  cruise: "circle",
  cars: "star",
};

function renderMetricChips(target, values) {
  target.innerHTML = "";
  values.forEach((value) => {
    const chip = document.createElement("div");
    chip.className = "metric-chip";
    chip.textContent = value;
    target.appendChild(chip);
  });
}

function buildPlayerCard(player) {
  const wrapper = document.createElement("article");
  wrapper.className = "player-card";
  wrapper.innerHTML = `
    <div class="player-accent" style="background:${player.color_hex}"></div>
    <div>
      <h3>${player.name}</h3>
      <p class="player-meta">${player.location_code} | ${player.ship_type}</p>
    </div>
    <p class="player-meta">$${player.cash} | contratos ${player.contracts_done}</p>
  `;
  return wrapper;
}

function routeTraces(projectedNodes) {
  const grouped = {};
  projectedNodes
    .filter((node) => node.route_id && node.lat !== null && node.lon !== null)
    .forEach((node) => {
      if (!grouped[node.route_id]) {
        grouped[node.route_id] = [];
      }
      grouped[node.route_id].push(node);
    });

  return Object.values(grouped)
    .map((nodes) => nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
    .filter((nodes) => nodes.length > 1)
    .map((nodes) => ({
      type: "scattergeo",
      mode: "lines",
      lat: nodes.map((node) => node.lat),
      lon: nodes.map((node) => node.lon),
      line: { width: 2, color: "rgba(240, 180, 41, 0.6)" },
      hoverinfo: "skip",
      showlegend: false,
    }));
}

function renderMainMap(payload) {
  const properties = payload.properties.filter((item) => item.lat !== null && item.lon !== null);
  const ports = properties.filter((item) => item.kind === "port");
  const tolls = properties.filter((item) => item.kind === "toll");

  const traces = [
    ...routeTraces(payload.board.projected_nodes),
    {
      type: "scattergeo",
      mode: "markers+text",
      lat: ports.map((item) => item.lat),
      lon: ports.map((item) => item.lon),
      text: ports.map((item) => item.code),
      textposition: "top center",
      marker: {
        size: 10,
        color: "#f8fafc",
        line: { width: 1, color: "#0f172a" },
      },
      name: "Portos",
      hovertemplate: "Porto %{text}<extra></extra>",
    },
    {
      type: "scattergeo",
      mode: "markers+text",
      lat: tolls.map((item) => item.lat),
      lon: tolls.map((item) => item.lon),
      text: tolls.map((item) => item.code),
      textposition: "top center",
      marker: {
        size: 12,
        symbol: "diamond",
        color: "#f0b429",
        line: { width: 1, color: "#3b2f05" },
      },
      name: "Pedagios",
      hovertemplate: "Pedagio %{text}<extra></extra>",
    },
  ];

  payload.players.forEach((player) => {
    traces.push({
      type: "scattergeo",
      mode: "markers+text",
      lat: [player.lat],
      lon: [player.lon],
      text: [player.name],
      textposition: "bottom center",
      marker: {
        size: player.id === "human" ? 22 : 18,
        symbol: SHIP_SYMBOLS[player.ship_type] || "circle",
        color: player.color_hex,
        line: { width: 2, color: "#0b1320" },
      },
      name: player.name,
      hovertemplate: `${player.name}<br>Navio: ${player.ship_type}<br>Porto: ${player.location_code}<extra></extra>`,
    });
  });

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 0, r: 0, t: 0, b: 0 },
    showlegend: false,
    geo: {
      scope: "world",
      projection: { type: "natural earth" },
      showland: true,
      landcolor: "#2d6a4f",
      showcountries: true,
      countrycolor: "#94a3b8",
      showocean: true,
      oceancolor: "#0b7bc0",
      showlakes: true,
      lakecolor: "#38bdf8",
      coastlinecolor: "#17324f",
      bgcolor: "rgba(0,0,0,0)",
    },
  };

  Plotly.newPlot("main-map", traces, layout, { displayModeBar: false, responsive: true });
}

async function bootstrapApp() {
  const response = await fetch("/api/bootstrap");
  const payload = await response.json();

  const human = payload.players.find((player) => player.id === "human") || payload.players[0];
  document.getElementById("human-name").textContent = human.name;

  renderMetricChips(document.getElementById("human-summary"), [
    `Cor ${human.color_id}`,
    `Navio ${human.ship_type}`,
    `Porto atual ${human.location_code}`,
    `Caixa $${human.cash}`,
  ]);

  renderMetricChips(document.getElementById("capture-status"), [
    `${payload.capture_status.node_count} pontos capturados`,
    `${payload.capture_status.route_groups} grupos de rota`,
    `Imagem ${payload.capture_status.image_width}x${payload.capture_status.image_height}`,
  ]);

  const playerStrip = document.getElementById("player-strip");
  playerStrip.innerHTML = "";
  payload.players.forEach((player) => playerStrip.appendChild(buildPlayerCard(player)));

  renderMainMap(payload);
}

document.addEventListener("DOMContentLoaded", () => {
  bootstrapApp().catch((error) => {
    console.error(error);
  });
});
