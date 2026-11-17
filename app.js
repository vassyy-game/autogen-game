(() => {
  "use strict";

  const STORAGE_KEY = "autogen-garage-v1";
  const STARTER_CAR = {
    id: "starter-001",
    name: "Vortex RS",
    trim: "SPORT COUPE",
    color: "#b9ed62",
    hp: 320,
    speed: 268,
    accel: 4.8,
    level: 1,
    parts: ["Кованый впуск", "Спортивное шасси"],
    plate: "AG-0001"
  };
  const STARTER_CREDITS = 2400;
  const STARTER_TECH_CORES = 3;
  const SHOWROOM_PRICE_CREDITS = 1200;
  const TECH_CORE_ACHIEVEMENTS = ["pro-circuit-win"];
  const MAX_RACE_STAKE = 500;
  const RACE_TYPES = {
    sprint: { label: "Спринт", description: "разгон и мощность", power: (car) => car.hp * 0.48 + car.speed * 0.22 + 100 / car.accel * 24 },
    circuit: { label: "Кольцо", description: "сбалансированная трасса", power: (car) => car.hp * 0.3 + car.speed * 0.25 + 100 / car.accel * 42 + car.level * 5 },
    drag: { label: "Дрэг", description: "скорость и ускорение", power: (car) => car.hp * 0.55 + car.speed * 0.23 + 100 / car.accel * 26 }
  };
  const OPPONENTS = [
    { id: "rookie", name: "Mika «Старт»", car: { id: "rival-rookie", name: "Kairo S", trim: "STREET SPORT", color: "#67a8d7", hp: 245, speed: 232, accel: 6.1, level: 1, parts: [], plate: "RIVAL" } },
    { id: "street", name: "Den «Город»", car: { id: "rival-street", name: "Raven GT", trim: "GRAND TOURER", color: "#e56b4a", hp: 310, speed: 254, accel: 5.2, level: 2, parts: [], plate: "RIVAL" } },
    { id: "pro", name: "Alex «Pro»", car: { id: "rival-pro", name: "Astra V8", trim: "PERFORMANCE", color: "#d4b86a", hp: 390, speed: 305, accel: 3.8, level: 4, parts: [], plate: "RIVAL" } }
  ];
  const DEFAULT_RACE_STATS = { total: 0, wins: 0, losses: 0, rewards: 0 };
  const PALETTE = ["#e56b4a", "#67a8d7", "#d4b86a", "#a58bd5", "#e7e8e2"];
  const MODELS = [
    { name: "Raven GT", trim: "GRAND TOURER" },
    { name: "Kairo S", trim: "STREET SPORT" },
    { name: "Nox R", trim: "TRACK EDITION" },
    { name: "Astra V8", trim: "PERFORMANCE" },
    { name: "Monarch X", trim: "SPORT COUPE" }
  ];
  const PARTS = [
    "Турбокомпрессор",
    "Карбоновый диффузор",
    "Гоночные тормоза",
    "Облегчённые диски",
    "Спортивный выхлоп",
    "Аэродинамический обвес"
  ];

  const elements = {
    cars: document.querySelector("#car-grid"),
    creditsCount: document.querySelector("#credits-count"),
    techCoresCount: document.querySelector("#tech-cores-count"),
    carCount: document.querySelector("#car-count"),
    selectionCount: document.querySelector("#selection-count"),
    mergeButton: document.querySelector("#merge-button"),
    buyButton: document.querySelector("#buy-button"),
    emptyState: document.querySelector("#empty-state"),
    toast: document.querySelector("#toast"),
    navButtons: [...document.querySelectorAll("[data-screen]")],
    screens: [...document.querySelectorAll("[data-screen-panel]")],
    raceCar: document.querySelector("#race-car"),
    raceType: document.querySelector("#race-type"),
    raceOpponent: document.querySelector("#race-opponent"),
    raceStake: document.querySelector("#race-stake"),
    stakeLimit: document.querySelector("#stake-limit"),
    raceComparison: document.querySelector("#race-comparison"),
    raceStart: document.querySelector("#race-start"),
    raceTrack: document.querySelector("#race-track"),
    trackPlayer: document.querySelector("#track-player"),
    trackOpponent: document.querySelector("#track-opponent"),
    raceCountdown: document.querySelector("#race-countdown"),
    raceStatus: document.querySelector("#race-status"),
    raceResult: document.querySelector("#race-result"),
    raceTotal: document.querySelector("#race-total"),
    raceWins: document.querySelector("#race-wins"),
    raceLosses: document.querySelector("#race-losses"),
    raceRewards: document.querySelector("#race-rewards"),
    collectionCount: document.querySelector("#collection-count"),
    collectionGrid: document.querySelector("#collection-grid"),
    taskList: document.querySelector("#task-list"),
    profileLevel: document.querySelector("#profile-level"),
    profileXpLabel: document.querySelector("#profile-xp-label"),
    profileXpBar: document.querySelector("#profile-xp-bar"),
    profileRaces: document.querySelector("#profile-races"),
    profileWins: document.querySelector("#profile-wins"),
    profileCars: document.querySelector("#profile-cars")
  };

  let shouldPersistLoadedState = false;
  let state = loadState();
  if (shouldPersistLoadedState) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, coins: state.credits }));
    } catch (error) {
      console.error("Не удалось сохранить миграцию AUTOGEN:", error);
      window.setTimeout(() => showToast("Не удалось сохранить валюты. Проверьте настройки хранилища браузера."), 0);
    }
  }
  let selectedIds = [];
  let toastTimer;
  let selectedRaceCarId = state.cars[0]?.id || "";
  let selectedOpponentId = OPPONENTS[0].id;
  let activeScreen = "garage";
  let raceInProgress = false;
  let raceFinished = false;

  initializeTelegram();
  render();

  elements.cars.addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-car]");
    if (button) toggleSelection(button.dataset.selectCar);
  });
  elements.mergeButton.addEventListener("click", mergeCars);
  elements.buyButton.addEventListener("click", buyCar);
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => setScreen(button.dataset.screen));
  });
  document.querySelectorAll("[data-go-screen]").forEach((button) => {
    button.addEventListener("click", () => setScreen(button.dataset.goScreen));
  });
  elements.raceCar.addEventListener("change", () => {
    selectedRaceCarId = elements.raceCar.value;
    renderRaceComparison();
  });
  elements.raceType.addEventListener("change", renderRaceComparison);
  elements.raceOpponent.addEventListener("change", () => {
    selectedOpponentId = elements.raceOpponent.value;
    renderRaceComparison();
  });
  elements.raceStake.addEventListener("input", updateStakeLimit);
  elements.raceStart.addEventListener("click", startRace);
  elements.raceResult.addEventListener("click", (event) => {
    if (event.target.closest("#race-again")) prepareNextRace();
  });

  function initializeTelegram() {
    const telegram = window.Telegram?.WebApp;
    if (!telegram) return;

    if (typeof telegram.ready === "function") telegram.ready();
    if (typeof telegram.expand === "function") telegram.expand();
    const backgroundColor = telegram.themeParams?.bg_color;
    if (typeof backgroundColor === "string" && /^#[\da-f]{6}$/i.test(backgroundColor)) {
      document.documentElement.style.setProperty("--page", backgroundColor);
    }
  }

  function loadState() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        shouldPersistLoadedState = true;
        return {
          credits: STARTER_CREDITS,
          techCores: STARTER_TECH_CORES,
          cars: [STARTER_CAR],
          raceStats: { ...DEFAULT_RACE_STATS },
          techCoreAchievements: []
        };
      }

      const parsed = JSON.parse(saved);
      const credits = parsed?.credits === undefined ? parsed?.coins : parsed.credits;
      const techCores = parsed?.techCores === undefined ? 0 : parsed.techCores;
      const techCoreAchievements = parsed?.techCoreAchievements === undefined ? [] : parsed.techCoreAchievements;
      if (
        !parsed ||
        !Number.isSafeInteger(credits) ||
        credits < 0 ||
        !Number.isSafeInteger(techCores) ||
        techCores < 0 ||
        !Array.isArray(parsed.cars) ||
        !parsed.cars.every(isValidCar) ||
        !isValidTechCoreAchievements(techCoreAchievements)
      ) {
        throw new Error("Сохранение имеет неверный формат.");
      }

      const raceStats = isValidRaceStats(parsed.raceStats) ? parsed.raceStats : { ...DEFAULT_RACE_STATS };
      shouldPersistLoadedState = parsed.credits === undefined ||
        parsed.techCores === undefined ||
        parsed.techCoreAchievements === undefined ||
        parsed.coins !== credits;
      return { credits, techCores, cars: parsed.cars, raceStats, techCoreAchievements };
    } catch (error) {
      console.error("Не удалось загрузить сохранение AUTOGEN:", error);
      window.setTimeout(() => showToast("Не удалось загрузить сохранение. Начинаем новую игру."), 0);
      return {
        credits: STARTER_CREDITS,
        techCores: 0,
        cars: [STARTER_CAR],
        raceStats: { ...DEFAULT_RACE_STATS },
        techCoreAchievements: []
      };
    }
  }

  function isValidTechCoreAchievements(achievements) {
    return Array.isArray(achievements) &&
      achievements.every((achievement) => TECH_CORE_ACHIEVEMENTS.includes(achievement)) &&
      new Set(achievements).size === achievements.length;
  }

  function isValidRaceStats(stats) {
    return Boolean(
      stats &&
      Number.isSafeInteger(stats.total) && stats.total >= 0 &&
      Number.isSafeInteger(stats.wins) && stats.wins >= 0 &&
      Number.isSafeInteger(stats.losses) && stats.losses >= 0 &&
      Number.isSafeInteger(stats.rewards) && stats.rewards >= 0 &&
      stats.wins + stats.losses === stats.total
    );
  }

  function isValidCar(car) {
    return Boolean(
      car &&
      typeof car.id === "string" &&
      typeof car.name === "string" &&
      typeof car.trim === "string" &&
      typeof car.color === "string" &&
      /^#[\da-f]{6}$/i.test(car.color) &&
      Number.isFinite(car.hp) &&
      Number.isFinite(car.speed) &&
      Number.isFinite(car.accel) &&
      Number.isSafeInteger(car.level) &&
      Array.isArray(car.parts) &&
      car.parts.every((part) => typeof part === "string") &&
      typeof car.plate === "string"
    );
  }

  function saveState(nextState) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...nextState, coins: nextState.credits }));
      state = nextState;
      return true;
    } catch (error) {
      console.error("Не удалось сохранить прогресс AUTOGEN:", error);
      showToast("Не удалось сохранить прогресс. Проверьте настройки хранилища браузера.");
      return false;
    }
  }

  function render() {
    elements.creditsCount.textContent = formatNumber(state.credits);
    elements.techCoresCount.textContent = formatNumber(state.techCores);
    elements.carCount.textContent = String(state.cars.length).padStart(2, "0");
    elements.selectionCount.textContent = `Выбрано ${selectedIds.length} из 2`;
    elements.mergeButton.disabled = selectedIds.length !== 2 || raceInProgress;
    elements.buyButton.disabled = state.credits < SHOWROOM_PRICE_CREDITS || raceInProgress;
    elements.emptyState.hidden = state.cars.length !== 0;
    elements.cars.innerHTML = state.cars.map(renderCar).join("");
    renderRaceSetup();
    renderRaceStatistics();
    renderCollection();
    renderTasks();
    renderProfile();
  }

  function renderCar(car) {
    const selected = selectedIds.includes(car.id);
    const safeId = escapeAttribute(car.id);
    const safeName = escapeHtml(car.name);
    const safeTrim = escapeHtml(car.trim);
    const safePlate = escapeHtml(car.plate);
    const safeParts = car.parts.map(escapeHtml).join(" · ");

    return `
      <article class="car-card${selected ? " is-selected" : ""}">
        <div class="car-art">
          <span class="car-tag">${escapeHtml(car.trim)}</span>
          <button class="select-control" type="button" data-select-car="${safeId}"
            aria-label="${selected ? "Убрать" : "Выбрать"} ${safeName} для объединения"
            aria-pressed="${selected}">${selected ? "✓" : "+"}</button>
          ${renderCarIllustration(car)}
        </div>
        <div class="car-info">
          <div class="car-name-row">
            <div>
              <h3 class="car-name">${safeName}</h3>
              <p class="car-trim">${safeParts || "Заводская комплектация"}</p>
            </div>
            <span class="car-level">УР. ${car.level}</span>
          </div>
          <div class="car-stats">
            <div><span class="stat-value">${formatNumber(car.hp)}</span><span class="stat-label">Л.С.</span></div>
            <div><span class="stat-value">${formatNumber(car.speed)} <small>км/ч</small></span><span class="stat-label">МАКС. СКОРОСТЬ</span></div>
            <div><span class="stat-value">${car.accel.toFixed(1)}<small>с</small></span><span class="stat-label">0–100 КМ/Ч</span></div>
          </div>
          <div class="car-plate"><span>НОМЕР АВТОМОБИЛЯ</span><strong>${safePlate}</strong></div>
        </div>
      </article>`;
  }

  function renderCarIllustration(car) {
    if (typeof car.image === "string" && /^assets\/cars\/[a-z0-9_-]+\.webp$/i.test(car.image)) {
      return `<img class="car-photo" src="${car.image}" alt="${escapeHtml(car.name)}">`;
    }
    const color = car.color;
    const gradientId = `paint-${escapeAttribute(car.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
    return `
      <svg viewBox="0 0 360 150" role="img" aria-label="${escapeHtml(car.name)}, автомобиль">
        <defs>
          <linearGradient id="${gradientId}" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0" stop-color="#fff" stop-opacity=".48"></stop>
            <stop offset=".25" stop-color="${color}"></stop>
            <stop offset="1" stop-color="${color}" stop-opacity=".72"></stop>
          </linearGradient>
          <linearGradient id="${gradientId}-glass" x1="0" y1="0" x2="0" y2="1">
            <stop stop-color="#9caea6"></stop><stop offset="1" stop-color="#303a37"></stop>
          </linearGradient>
        </defs>
        <ellipse cx="180" cy="128" rx="131" ry="8" fill="#050706" opacity=".55"></ellipse>
        <path d="M37 101c5-7 13-12 25-15l29-6 28-29c8-8 17-12 31-13l53-2c13 0 22 4 32 13l31 30 32 8c9 3 14 8 17 17l3 13H29l2-9c1-3 3-5 6-7z" fill="#111614" opacity=".7"></path>
        <path d="M60 92l34-8 28-28c7-7 15-10 27-11l51-2c11 0 19 3 27 11l30 29 32 8c6 2 10 5 12 11H48c2-5 6-8 12-10z" fill="url(#${gradientId})" stroke="#fff" stroke-opacity=".22" stroke-width="1.5"></path>
        <path d="M125 58c7-7 14-10 25-11l22-1v34H96l29-22z" fill="url(#${gradientId}-glass)" stroke="#dce6e0" stroke-opacity=".19"></path>
        <path d="M180 46l20-1c10 0 17 3 25 10l23 24h-68V46z" fill="url(#${gradientId}-glass)" stroke="#dce6e0" stroke-opacity=".19"></path>
        <path d="M49 103h260l12 4 1 9H35l2-8 12-5z" fill="#161c19"></path>
        <path d="M42 102l20-1-2 7H39z" fill="#f3f1d4"></path>
        <path d="M296 100l14 3 6 6h-18z" fill="#f25f49"></path>
        <path d="M104 85h30m23 0h46" stroke="#fff" stroke-opacity=".24" stroke-width="1"></path>
        <path d="M56 96h243" stroke="#fff" stroke-opacity=".16"></path>
        <circle cx="97" cy="111" r="20" fill="#111413" stroke="#55605a" stroke-width="2"></circle>
        <circle cx="97" cy="111" r="11" fill="#29302c" stroke="#9ba39d" stroke-width="2"></circle>
        <circle cx="97" cy="111" r="3" fill="#bbc2bd"></circle>
        <path d="M97 101v20m-10-10h20m-17-7 14 14m0-14-14 14" stroke="#89928b" stroke-width="1"></path>
        <circle cx="265" cy="111" r="20" fill="#111413" stroke="#55605a" stroke-width="2"></circle>
        <circle cx="265" cy="111" r="11" fill="#29302c" stroke="#9ba39d" stroke-width="2"></circle>
        <circle cx="265" cy="111" r="3" fill="#bbc2bd"></circle>
        <path d="M265 101v20m-10-10h20m-17-7 14 14m0-14-14 14" stroke="#89928b" stroke-width="1"></path>
      </svg>`;
  }

  function toggleSelection(id) {
    if (raceInProgress) return;
    if (selectedIds.includes(id)) {
      selectedIds = selectedIds.filter((selectedId) => selectedId !== id);
    } else if (selectedIds.length < 2) {
      selectedIds = [...selectedIds, id];
    } else {
      showToast("Для объединения можно выбрать только две машины.");
      return;
    }
    render();
  }

  function mergeCars() {
    if (raceInProgress || selectedIds.length !== 2) return;

    const [first, second] = selectedIds.map((id) => state.cars.find((car) => car.id === id));
    if (!first || !second || first === second) {
      selectedIds = [];
      render();
      showToast("Не удалось найти выбранные машины. Выберите их ещё раз.");
      return;
    }

    const inheritedParts = [...new Set([...first.parts, ...second.parts])].slice(0, 4);
    const newCar = {
      id: createId(),
      name: `${randomItem(MODELS).name} ${state.cars.length + 1}`,
      trim: "FUSION SERIES",
      color: randomItem(PALETTE),
      hp: Math.round((first.hp + second.hp) / 2 + 24),
      speed: Math.round((first.speed + second.speed) / 2 + 6),
      accel: Math.max(2.8, Number(((first.accel + second.accel) / 2 - 0.2).toFixed(1))),
      level: Math.max(first.level, second.level) + 1,
      parts: inheritedParts.length ? inheritedParts : [randomItem(PARTS)],
      plate: createPlate()
    };

    const nextState = {
      ...state,
      credits: state.credits + 300,
      cars: [...state.cars.filter((car) => !selectedIds.includes(car.id)), newCar]
    };
    if (saveState(nextState)) {
      selectedIds = [];
      render();
      showToast(`Готово! ${newCar.name} создана. Бонус за слияние: 300 CR.`);
    }
  }

  function buyCar() {
    if (raceInProgress) return;
    if (state.credits < SHOWROOM_PRICE_CREDITS) {
      showToast("Недостаточно Credits для покупки автомобиля.");
      return;
    }

    const model = randomItem(MODELS);
    const car = {
      id: createId(),
      name: model.name,
      trim: model.trim,
      color: randomItem(PALETTE),
      hp: randomInt(230, 420),
      speed: randomInt(230, 310),
      accel: Number((randomInt(38, 65) / 10).toFixed(1)),
      level: 1,
      parts: [randomItem(PARTS)],
      plate: createPlate()
    };
    const nextState = { ...state, credits: state.credits - SHOWROOM_PRICE_CREDITS, cars: [...state.cars, car] };
    if (saveState(nextState)) {
      render();
      showToast(`${car.name} добавлена в гараж.`);
    }
  }

  function createId() {
    return globalThis.crypto?.randomUUID?.() || `car-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function createPlate() {
    const sequence = state.cars.reduce((max, car) => {
      const match = car.plate.match(/^AG-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 1) + 1;
    return `AG-${String(sequence).padStart(4, "0")}`;
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("ru-RU").format(value);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 3200);
  }

  function setScreen(screen) {
    if (!elements.screens.some((panel) => panel.dataset.screenPanel === screen)) return;
    activeScreen = screen;
    elements.screens.forEach((panel) => {
      const isActive = panel.dataset.screenPanel === screen;
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });
    elements.navButtons.forEach((button) => {
      const isActive = button.dataset.screen === screen;
      button.classList.toggle("is-active", isActive);
      if (isActive) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  function renderRaceSetup() {
    const cars = state.cars;
    if (!cars.some((car) => car.id === selectedRaceCarId)) {
      selectedRaceCarId = cars[0]?.id || "";
    }
    if (!OPPONENTS.some((opponent) => opponent.id === selectedOpponentId)) {
      selectedOpponentId = OPPONENTS[0].id;
    }

    elements.raceCar.innerHTML = cars.map((car) =>
      `<option value="${escapeAttribute(car.id)}">${escapeHtml(car.name)} · ${car.hp} л.с.</option>`
    ).join("");
    elements.raceCar.value = selectedRaceCarId;
    elements.raceOpponent.innerHTML = OPPONENTS.map((opponent) =>
      `<option value="${opponent.id}">${escapeHtml(opponent.name)} · ${escapeHtml(opponent.car.name)}</option>`
    ).join("");
    elements.raceOpponent.value = selectedOpponentId;
    elements.raceCar.disabled = raceInProgress || cars.length === 0;
    elements.raceType.disabled = raceInProgress;
    elements.raceOpponent.disabled = raceInProgress;
    elements.raceStake.disabled = raceInProgress;
    elements.raceStart.disabled = raceInProgress || raceFinished || cars.length === 0;
    updateStakeLimit();
    renderRaceComparison();
  }

  function updateStakeLimit() {
    const available = Math.min(state.credits, MAX_RACE_STAKE);
    elements.raceStake.max = String(available);
    elements.stakeLimit.textContent = `Доступно для ставки: ${formatNumber(available)} CR · максимум ${formatNumber(MAX_RACE_STAKE)} CR`;
  }

  function renderRaceComparison() {
    const car = state.cars.find((item) => item.id === selectedRaceCarId);
    const opponent = OPPONENTS.find((item) => item.id === selectedOpponentId);
    const raceType = RACE_TYPES[elements.raceType.value] || RACE_TYPES.sprint;
    if (!car || !opponent) {
      elements.raceComparison.innerHTML = `<p class="comparison-empty">Добавь автомобиль, чтобы выйти на старт.</p>`;
      elements.trackPlayer.innerHTML = "";
      elements.trackOpponent.innerHTML = "";
      return;
    }

    elements.trackPlayer.innerHTML = renderCarIllustration(car);
    elements.trackOpponent.innerHTML = renderCarIllustration(opponent.car);
    elements.raceComparison.innerHTML = `
      <div class="comparison-heading"><span>СРАВНЕНИЕ · ${raceType.label.toUpperCase()}</span><span>${raceType.description}</span></div>
      <div class="comparison-row"><span>${escapeHtml(car.name)}</span><strong>${car.hp} л.с. · ${car.speed} км/ч · ${car.accel.toFixed(1)} с</strong></div>
      <div class="comparison-row"><span>${escapeHtml(opponent.car.name)}</span><strong>${opponent.car.hp} л.с. · ${opponent.car.speed} км/ч · ${opponent.car.accel.toFixed(1)} с</strong></div>`;
  }

  function renderRaceStatistics() {
    const stats = state.raceStats;
    elements.raceTotal.textContent = formatNumber(stats.total);
    elements.raceWins.textContent = formatNumber(stats.wins);
    elements.raceLosses.textContent = formatNumber(stats.losses);
    elements.raceRewards.textContent = formatNumber(stats.rewards);
  }

  function renderCollection() {
    elements.collectionCount.textContent = String(state.cars.length).padStart(2, "0");
    elements.collectionGrid.innerHTML = state.cars.map((car) => `
      <article class="collection-card">
        <div class="collection-art">${renderCarIllustration(car)}</div>
        <div class="collection-info">
          <div class="car-name-row"><h2 class="car-name">${escapeHtml(car.name)}</h2><span class="car-level">УР. ${car.level}</span></div>
          <p>${escapeHtml(car.trim)}</p>
          <span>${formatNumber(car.hp)} л.с. <i></i> ${formatNumber(car.speed)} км/ч</span>
        </div>
      </article>`).join("");
  }

  function renderTasks() {
    const stats = state.raceStats;
    const tasks = [
      { title: "Первый старт", detail: "Заверши первую гонку", current: Math.min(stats.total, 1), target: 1 },
      { title: "Путь победителя", detail: "Одержи три победы", current: Math.min(stats.wins, 3), target: 3 },
      { title: "Своя команда", detail: "Собери три автомобиля", current: Math.min(state.cars.length, 3), target: 3 }
    ];
    elements.taskList.innerHTML = tasks.map((task) => {
      const complete = task.current === task.target;
      return `<article class="task-card panel-card${complete ? " is-complete" : ""}">
        <span class="task-marker" aria-hidden="true">${complete ? "✓" : "0" + (tasks.indexOf(task) + 1)}</span>
        <div class="task-copy"><span class="eyebrow">${complete ? "ВЫПОЛНЕНО" : "ЦЕЛЬ"}</span><h2>${task.title}</h2><p>${task.detail}</p></div>
        <div class="task-progress"><strong>${task.current} / ${task.target}</strong><div><span style="width:${Math.round(task.current / task.target * 100)}%"></span></div></div>
        <button class="text-button" type="button" data-go-screen="${task.title === "Своя команда" ? "garage" : "races"}">${task.title === "Своя команда" ? "В гараж" : "К гонкам"} <span aria-hidden="true">↗</span></button>
      </article>`;
    }).join("");
    elements.taskList.querySelectorAll("[data-go-screen]").forEach((button) => {
      button.addEventListener("click", () => setScreen(button.dataset.goScreen));
    });
  }

  function renderProfile() {
    const stats = state.raceStats;
    const xp = stats.total * 35 + stats.wins * 25;
    const xpPerLevel = 300;
    const level = Math.floor(xp / xpPerLevel) + 1;
    const levelXp = xp % xpPerLevel;
    elements.profileLevel.textContent = `УРОВЕНЬ ${level}`;
    elements.profileXpLabel.textContent = `${levelXp} / ${xpPerLevel} XP`;
    elements.profileXpBar.style.width = `${Math.round(levelXp / xpPerLevel * 100)}%`;
    elements.profileRaces.textContent = formatNumber(stats.total);
    elements.profileWins.textContent = formatNumber(stats.wins);
    elements.profileCars.textContent = formatNumber(state.cars.length);
  }

  function startRace() {
    if (raceInProgress || raceFinished) return;
    const playerCar = state.cars.find((car) => car.id === elements.raceCar.value);
    const rival = OPPONENTS.find((opponent) => opponent.id === elements.raceOpponent.value);
    const type = RACE_TYPES[elements.raceType.value];
    const stake = Number(elements.raceStake.value);
    if (!playerCar || !rival || !type) {
      showToast("Выбери автомобиль, тип гонки и соперника.");
      return;
    }
    if (!Number.isSafeInteger(stake) || stake < 0 || stake > MAX_RACE_STAKE || stake > state.credits) {
      showToast("Ставка должна быть целым числом в пределах баланса и лимита 500 CR.");
      return;
    }

    if (stake > 0 && !saveState({ ...state, credits: state.credits - stake })) return;

    raceInProgress = true;
    raceFinished = false;
    elements.raceResult.hidden = true;
    elements.raceTrack.classList.add("is-racing");
    elements.raceCountdown.textContent = "3";
    elements.raceStatus.textContent = "Моторы запущены. Приготовься к старту.";
    render();

    window.setTimeout(() => {
      if (raceInProgress) elements.raceCountdown.textContent = "2";
    }, 650);
    window.setTimeout(() => {
      if (raceInProgress) {
        elements.raceCountdown.textContent = "1";
        elements.raceStatus.textContent = "Старт!";
      }
    }, 1300);
    window.setTimeout(() => {
      if (raceInProgress) finishRace(playerCar, rival.car, type, stake, rival.id);
    }, 2400);
  }

  function finishRace(playerCar, rivalCar, type, stake, opponentId) {
    if (!raceInProgress || raceFinished) return;
    raceFinished = true;
    raceInProgress = false;

    const randomSwing = (Math.random() * 2 - 1) * 36;
    const playerScore = type.power(playerCar);
    const rivalScore = type.power(rivalCar);
    const won = playerScore + randomSwing >= rivalScore;
    const reward = won ? 180 + playerCar.level * 15 : 25;
    const payout = won ? stake * 2 + reward : reward;
    const earnedAchievement = won &&
      opponentId === "pro" &&
      type === RACE_TYPES.circuit &&
      !state.techCoreAchievements.includes("pro-circuit-win");
    const updatedStats = {
      total: state.raceStats.total + 1,
      wins: state.raceStats.wins + (won ? 1 : 0),
      losses: state.raceStats.losses + (won ? 0 : 1),
      rewards: state.raceStats.rewards + reward
    };
    const nextState = {
      ...state,
      credits: state.credits + payout,
      techCores: state.techCores + (earnedAchievement ? 1 : 0),
      techCoreAchievements: earnedAchievement
        ? [...state.techCoreAchievements, "pro-circuit-win"]
        : state.techCoreAchievements,
      raceStats: updatedStats
    };
    const saved = saveState(nextState);

    elements.raceTrack.classList.remove("is-racing");
    elements.raceCountdown.textContent = won ? "ПОБЕДА" : "ФИНИШ";
    elements.raceStatus.textContent = won ? "Финиш! Отличный заезд." : "Финиш! В следующий раз будет лучше.";
    elements.raceResult.className = `race-result ${won ? "is-win" : "is-loss"}`;
    elements.raceResult.innerHTML = `
      <span class="result-label">${won ? "ЗАЕЗД ВЫИГРАН" : "ЗАЕЗД ЗАВЕРШЁН"}</span>
      <strong>${won ? "Победа." : "Поражение."}</strong>
      <p>${won ? `Награда за победу: +${formatNumber(reward)} CR.` : `Награда за участие: +${formatNumber(reward)} CR.`}</p>
      <p>${stake ? `Ставка ${won ? "возвращена в двойном размере" : "потеряна"}: ${formatNumber(stake)} CR.` : "Без ставки — только награда за заезд."}</p>
      ${earnedAchievement ? `<p class="tech-core-reward">Достижение «Покоритель кольца»: +1 TC.</p>` : ""}
      <button class="text-button race-again" id="race-again" type="button">Подготовить новый заезд <span aria-hidden="true">↗</span></button>`;
    elements.raceResult.hidden = false;
    render();
    if (!saved) showToast("Результат показан, но прогресс гонки не удалось сохранить.");
  }

  function prepareNextRace() {
    if (!raceFinished || raceInProgress) return;
    raceFinished = false;
    elements.raceResult.hidden = true;
    elements.raceCountdown.textContent = "ГОТОВ К СТАРТУ";
    elements.raceStatus.textContent = "Настрой заезд и выходи на старт.";
    renderRaceSetup();
  }
})();
