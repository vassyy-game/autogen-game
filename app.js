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
  const CAR_CATALOG = Array.isArray(window.AUTOGEN_CAR_CATALOG) ? window.AUTOGEN_CAR_CATALOG : [];
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
    showroomPreview: document.querySelector("#showroom-preview"),
    emptyState: document.querySelector("#empty-state"),
    toast: document.querySelector("#toast"),
    navButtons: [...document.querySelectorAll("[data-screen]")],
    screens: [...document.querySelectorAll("[data-screen-panel]")],
    gameCatalog: document.querySelector("#game-catalog"),
    gameContent: document.querySelector("#game-content"),
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
    taskList: document.querySelector("#task-list"),
    profileLevel: document.querySelector("#profile-level"),
    profileXpLabel: document.querySelector("#profile-xp-label"),
    profileXpBar: document.querySelector("#profile-xp-bar"),
    profileRaces: document.querySelector("#profile-races"),
    profileWins: document.querySelector("#profile-wins"),
    profileCars: document.querySelector("#profile-cars"),
    profileCredits: document.querySelector("#profile-credits"),
    profileTechCores: document.querySelector("#profile-tech-cores"),
    profileAchievements: document.querySelector("#profile-achievements")
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
  document.querySelectorAll("[data-open-game]").forEach((button) => {
    button.addEventListener("click", () => openGame(button.dataset.openGame));
  });
  document.querySelectorAll("[data-return-gamehub]").forEach((button) => {
    button.addEventListener("click", showGameHub);
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
  document.addEventListener("error", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.classList.contains("car-photo")) return;
    const fallback = document.createElement("div");
    fallback.className = "photo-fallback";
    fallback.setAttribute("role", "img");
    fallback.setAttribute("aria-label", `${image.alt} — фотография недоступна`);
    fallback.textContent = "ФОТО НЕДОСТУПНО";
    image.replaceWith(fallback);
  }, true);

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

      const hasDuplicateCarIds = new Set(parsed.cars.map((car) => car.id)).size !== parsed.cars.length;
      const cars = hasDuplicateCarIds ? makeCarIdsUnique(parsed.cars) : parsed.cars;
      const raceStats = isValidRaceStats(parsed.raceStats) ? parsed.raceStats : { ...DEFAULT_RACE_STATS };
      shouldPersistLoadedState = parsed.credits === undefined ||
        parsed.techCores === undefined ||
        parsed.techCoreAchievements === undefined ||
        parsed.coins !== credits ||
        hasDuplicateCarIds;
      return { credits, techCores, cars, raceStats, techCoreAchievements };
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
      car.id.length > 0 &&
      typeof car.name === "string" &&
      typeof car.trim === "string" &&
      typeof car.color === "string" &&
      /^#[\da-f]{6}$/i.test(car.color) &&
      Number.isFinite(car.hp) &&
      Number.isFinite(car.speed) &&
      Number.isFinite(car.accel) &&
      Number.isSafeInteger(car.level) &&
      car.level > 0 &&
      Array.isArray(car.parts) &&
      car.parts.every((part) => typeof part === "string") &&
      typeof car.plate === "string"
    );
  }

  function makeCarIdsUnique(cars) {
    const usedIds = new Set();
    return cars.map((car) => {
      if (!usedIds.has(car.id)) {
        usedIds.add(car.id);
        return car;
      }

      let id = createId();
      while (usedIds.has(id)) id = createId();
      usedIds.add(id);
      return { ...car, id };
    });
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
    elements.buyButton.disabled = state.credits < SHOWROOM_PRICE_CREDITS || raceInProgress || CAR_CATALOG.length === 0;
    elements.emptyState.hidden = state.cars.length !== 0;
    elements.cars.innerHTML = state.cars.map(renderCar).join("");
    renderShowroomPreview();
    renderRaceSetup();
    renderRaceStatistics();
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
    const catalogCar = getCatalogCar(car);
    const rarity = getCarRarity(car);

    return `
      <article class="car-card${selected ? " is-selected" : ""}">
        <div class="car-art">
          <span class="car-tag">${escapeHtml(catalogCar?.class || safeTrim)}</span>
          <span class="car-rarity rarity-${rarity.className}">${rarity.label}</span>
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
          <div class="car-meta"><span>${safePlate}</span><strong>◈ ${formatNumber(SHOWROOM_PRICE_CREDITS)} CR</strong></div>
        </div>
      </article>`;
  }

  function renderCarIllustration(car) {
    const catalogCar = getCatalogCar(car);
    const image = catalogCar?.image;
    if (typeof image === "string" && /^assets\/cars\/[a-z0-9_-]+\.webp$/i.test(image)) {
      return `<img class="car-photo" src="${escapeAttribute(image)}" alt="${escapeHtml(car.name)}" loading="lazy">`;
    }
    const accent = /^#[\da-f]{6}$/i.test(car.color) ? car.color : "#c6f36b";
    const initials = car.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
    return `
      <div class="vehicle-visual" style="--vehicle-accent:${accent}" role="img" aria-label="${escapeHtml(car.name)} — фотослот">
        <span class="visual-initials" aria-hidden="true">${escapeHtml(initials)}</span>
        <span class="visual-caption"><strong>ФОТО НЕДОСТУПНО</strong><small>${escapeHtml(car.trim)}</small></span>
        <span class="visual-coordinate" aria-hidden="true">AG / ${escapeHtml(String(car.level).padStart(2, "0"))}</span>
      </div>`;
  }

  function getCarRarity(car) {
    const catalogCar = getCatalogCar(car);
    if (catalogCar) {
      const rarity = catalogCar.rarity;
      const classNames = { Common: "standard", Rare: "rare", Epic: "epic", Legendary: "legendary" };
      const labels = { Common: "ОБЫЧНАЯ", Rare: "РЕДКАЯ", Epic: "ЭПИЧЕСКАЯ", Legendary: "ЛЕГЕНДАРНАЯ" };
      return { label: labels[rarity] || "РЕДКАЯ", className: classNames[rarity] || "rare" };
    }
    if (car.level >= 5) return { label: "ЭПИЧЕСКИЙ", className: "epic" };
    if (car.level >= 3) return { label: "РЕДКИЙ", className: "rare" };
    return { label: "СТАНДАРТ", className: "standard" };
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

    if (CAR_CATALOG.length === 0) {
      showToast("Каталог автомобилей пока недоступен. Попробуйте позже.");
      return;
    }

    const model = randomItem(CAR_CATALOG);
    const car = {
      id: createId(),
      name: model.name,
      catalogId: model.id,
      image: model.image,
      trim: model.class,
      color: randomItem(PALETTE),
      hp: model.hp,
      speed: model.speed,
      accel: model.accel,
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

  function getCatalogCar(car) {
    if (!car) return null;
    return CAR_CATALOG.find((entry) =>
      entry.id === car.catalogId ||
      entry.name === car.name
    ) || null;
  }

  function renderShowroomPreview() {
    if (!elements.showroomPreview) return;
    if (CAR_CATALOG.length === 0) {
      elements.showroomPreview.innerHTML = `<p class="comparison-empty">Нет доступных автомобилей в каталоге.</p>`;
      return;
    }
    const featured = CAR_CATALOG[0];
    elements.showroomPreview.innerHTML = `
        <div class="showroom-preview-image">${renderCarIllustration(featured)}</div>
        <div class="showroom-preview-copy">
          <span class="eyebrow">ФОТО ИЗ КАТАЛОГА · ${escapeHtml(featured.class.toUpperCase())}</span>
          <strong>${escapeHtml(featured.name)}</strong>
          <span>${CAR_CATALOG.length} автомобилей · случайная модель при покупке</span>
        </div>`;
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
    if (screen === "games") showGameHub();
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.scrollTo?.({ top: 0, behavior });
  }

  function openGame(gameId) {
    if (gameId !== "races") return;
    setScreen("games");
    elements.gameCatalog.hidden = true;
    elements.gameContent.hidden = false;
  }

  function showGameHub() {
    elements.gameCatalog.hidden = false;
    elements.gameContent.hidden = true;
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
    const playerScore = raceType.power(car);
    const opponentScore = raceType.power(opponent.car);
    const scoreMax = Math.max(playerScore, opponentScore, 1);
    elements.raceComparison.innerHTML = `
      <div class="comparison-heading"><span>СРАВНЕНИЕ · ${raceType.label.toUpperCase()}</span><span>${raceType.description}</span></div>
      <div class="comparison-row"><span>${escapeHtml(car.name)}</span><strong>${car.hp} л.с. · ${car.speed} км/ч · ${car.accel.toFixed(1)} с</strong></div>
      <div class="comparison-meter"><span style="width:${Math.round(playerScore / scoreMax * 100)}%"></span></div>
      <div class="comparison-row"><span>${escapeHtml(opponent.car.name)}</span><strong>${opponent.car.hp} л.с. · ${opponent.car.speed} км/ч · ${opponent.car.accel.toFixed(1)} с</strong></div>
      <div class="comparison-meter is-opponent"><span style="width:${Math.round(opponentScore / scoreMax * 100)}%"></span></div>`;
  }

  function renderRaceStatistics() {
    const stats = state.raceStats;
    elements.raceTotal.textContent = formatNumber(stats.total);
    elements.raceWins.textContent = formatNumber(stats.wins);
    elements.raceLosses.textContent = formatNumber(stats.losses);
    elements.raceRewards.textContent = formatNumber(stats.rewards);
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
        <button class="text-button" type="button" data-go-screen="${task.title === "Своя команда" ? "garage" : "games"}">${task.title === "Своя команда" ? "В гараж" : "К играм"} <span aria-hidden="true">↗</span></button>
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
    elements.profileCredits.textContent = formatNumber(state.credits);
    elements.profileTechCores.textContent = formatNumber(state.techCores);

    const achievements = [
      { title: "Первый старт", detail: "Завершить первую гонку", unlocked: stats.total >= 1 },
      { title: "Триумфатор", detail: "Одержать три победы", unlocked: stats.wins >= 3 },
      { title: "Покоритель кольца", detail: "Победить Pro в заезде на кольце · +1 TC", unlocked: state.techCoreAchievements.includes("pro-circuit-win") }
    ];
    elements.profileAchievements.innerHTML = achievements.map((achievement) => `
      <article class="achievement${achievement.unlocked ? " is-unlocked" : ""}">
        <span class="achievement-mark" aria-hidden="true">${achievement.unlocked ? "✓" : "—"}</span>
        <div><h3>${achievement.title}</h3><p>${achievement.detail}</p></div>
        <span class="achievement-state">${achievement.unlocked ? "ОТКРЫТО" : "ЗАКРЫТО"}</span>
      </article>`).join("");
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
