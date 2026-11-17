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
  const SHOWROOM_PRICE = 1200;
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
    coinCount: document.querySelector("#coin-count"),
    carCount: document.querySelector("#car-count"),
    selectionCount: document.querySelector("#selection-count"),
    mergeButton: document.querySelector("#merge-button"),
    buyButton: document.querySelector("#buy-button"),
    emptyState: document.querySelector("#empty-state"),
    toast: document.querySelector("#toast")
  };

  let state = loadState();
  let selectedIds = [];
  let toastTimer;

  initializeTelegram();
  render();

  elements.cars.addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-car]");
    if (button) toggleSelection(button.dataset.selectCar);
  });
  elements.mergeButton.addEventListener("click", mergeCars);
  elements.buyButton.addEventListener("click", buyCar);

  function initializeTelegram() {
    const telegram = window.Telegram?.WebApp;
    if (!telegram) return;

    telegram.ready();
    telegram.expand();
    if (telegram.themeParams?.bg_color) {
      document.documentElement.style.setProperty("--page", telegram.themeParams.bg_color);
    }
  }

  function loadState() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return { coins: 2400, cars: [STARTER_CAR] };

      const parsed = JSON.parse(saved);
      if (
        !parsed ||
        !Number.isSafeInteger(parsed.coins) ||
        parsed.coins < 0 ||
        !Array.isArray(parsed.cars) ||
        !parsed.cars.every(isValidCar)
      ) {
        throw new Error("Сохранение имеет неверный формат.");
      }

      return { coins: parsed.coins, cars: parsed.cars };
    } catch (error) {
      console.error("Не удалось загрузить сохранение AUTOGEN:", error);
      window.setTimeout(() => showToast("Не удалось загрузить сохранение. Начинаем новую игру."), 0);
      return { coins: 2400, cars: [STARTER_CAR] };
    }
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      state = nextState;
      return true;
    } catch (error) {
      console.error("Не удалось сохранить прогресс AUTOGEN:", error);
      showToast("Не удалось сохранить прогресс. Проверьте настройки хранилища браузера.");
      return false;
    }
  }

  function render() {
    elements.coinCount.textContent = formatNumber(state.coins);
    elements.carCount.textContent = String(state.cars.length).padStart(2, "0");
    elements.selectionCount.textContent = `Выбрано ${selectedIds.length} из 2`;
    elements.mergeButton.disabled = selectedIds.length !== 2;
    elements.buyButton.disabled = state.coins < SHOWROOM_PRICE;
    elements.emptyState.hidden = state.cars.length !== 0;
    elements.cars.innerHTML = state.cars.map(renderCar).join("");
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
    if (selectedIds.length !== 2) return;

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
      coins: state.coins + 300,
      cars: [...state.cars.filter((car) => !selectedIds.includes(car.id)), newCar]
    };
    if (saveState(nextState)) {
      selectedIds = [];
      render();
      showToast(`Готово! ${newCar.name} создана. Бонус за слияние: 300 монет.`);
    }
  }

  function buyCar() {
    if (state.coins < SHOWROOM_PRICE) {
      showToast("Недостаточно монет для покупки автомобиля.");
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
    const nextState = { ...state, coins: state.coins - SHOWROOM_PRICE, cars: [...state.cars, car] };
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
})();
