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
  const DROP_TYPES = [
    { id: "common", name: "Common", label: "Обычная", className: "common" },
    { id: "rare", name: "Rare", label: "Редкая", className: "rare" },
    { id: "epic", name: "Epic", label: "Эпическая", className: "epic" },
    { id: "legendary", name: "Legendary", label: "Легендарная", className: "legendary" }
  ];
  const DROP_PRICES = { common: 250, rare: 500, epic: 1000, legendary: 2000 };
  const DROP_REWARD_TABLES = {
    common: [
      { chance: 80, reward: { type: "credits", amount: 180 } },
      { chance: 20, reward: { type: "tc", amount: 1 } }
    ],
    rare: [
      { chance: 65, reward: { type: "credits", amount: 500 } },
      { chance: 35, reward: { type: "tc", amount: 2 } }
    ],
    epic: [
      { chance: 55, reward: { type: "credits", amount: 1000 } },
      { chance: 45, reward: { type: "car", catalogId: "civic-type-r" } }
    ],
    legendary: [
      { chance: 50, reward: { type: "credits", amount: 2500 } },
      { chance: 50, reward: { type: "car", catalogId: "bmw-m4-gt3" } }
    ]
  };
  const REFERRAL_STAGES = [
    { id: "r1", target: 1, reward: { type: "credits", amount: 300 } },
    { id: "r3", target: 3, reward: { type: "tc", amount: 1 } },
    { id: "r5", target: 5, reward: { type: "drop", drop: "common", amount: 1 } },
    { id: "r10", target: 10, reward: { type: "drop", drop: "rare", amount: 1 } },
    { id: "r25", target: 25, reward: { type: "drop", drop: "epic", amount: 1 } },
    { id: "r50", target: 50, reward: { type: "car", catalogId: "bmw-m3" } }
  ];
  const DROP_REWARD_CARS = {
    epic: "civic-type-r",
    legendary: "bmw-m4-gt3"
  };
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
    profileAchievements: document.querySelector("#profile-achievements"),
    dropInventory: document.querySelector("#drop-inventory"),
    dropList: document.querySelector("#drop-list"),
    dropModal: document.querySelector("#drop-modal"),
    dropModalArt: document.querySelector("#drop-modal-art"),
    dropResult: document.querySelector("#drop-result"),
    dropSkip: document.querySelector("#drop-skip"),
    streakNextStage: document.querySelector("#streak-next-stage"),
    referralCount: document.querySelector("#referral-count"),
    referralLink: document.querySelector("#referral-link"),
    copyReferral: document.querySelector("#copy-referral"),
    referralStages: document.querySelector("#referral-stages"),
    streakCount: document.querySelector("#streak-count"),
    streakSave: document.querySelector("#streak-save"),
    streakCalendar: document.querySelector("#streak-calendar")
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
  elements.dropList.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-drop]");
    if (openButton) {
      openDrop(openButton.dataset.openDrop);
      return;
    }
    const buyButton = event.target.closest("[data-buy-drop]");
    if (buyButton) buyDrop(buyButton.dataset.buyDrop);
  });
  elements.dropSkip.addEventListener("click", skipDropAnimation);
  elements.dropModal.querySelector("[data-close-drop]").addEventListener("click", closeDropModal);
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
          techCoreAchievements: [],
          drops: { common: 0, rare: 0, epic: 0, legendary: 0 },
          achievements: {},
          daily: createInitialDaily(),
          streak: createInitialStreak(),
          referral: { confirmed: 0, claimed: [], pendingCode: null },
          dropOpenPending: null,
          dropReceipt: null
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
      const drops = normalizeDrops(parsed.drops);
      const achievements = isPlainObject(parsed.achievements) ? parsed.achievements : {};
      const daily = normalizeDaily(parsed.daily);
      const hasDailyBaseline = Number.isSafeInteger(parsed.daily?.baseline?.races) &&
        Number.isSafeInteger(parsed.daily?.baseline?.wins) &&
        Number.isSafeInteger(parsed.daily?.baseline?.cars);
      if (!hasDailyBaseline) {
        daily.baseline = { races: raceStats.total, wins: raceStats.wins, cars: cars.length };
      }
      const streak = normalizeStreak(parsed.streak);
      const referral = normalizeReferral(parsed.referral);
      const dropOpenPending = normalizePendingDrop(parsed.dropOpenPending);
      const dropReceipt = normalizeDropReceipt(parsed.dropReceipt);
      shouldPersistLoadedState = parsed.credits === undefined ||
        parsed.techCores === undefined ||
        parsed.techCoreAchievements === undefined ||
        parsed.coins !== credits ||
        parsed.drops === undefined ||
        parsed.achievements === undefined ||
        parsed.daily === undefined ||
        !hasDailyBaseline ||
        parsed.streak === undefined ||
        parsed.referral === undefined ||
        hasDuplicateCarIds;
      return { credits, techCores, cars, raceStats, techCoreAchievements, drops, achievements, daily, streak, referral, dropOpenPending, dropReceipt };
    } catch (error) {
      console.error("Не удалось загрузить сохранение AUTOGEN:", error);
      window.setTimeout(() => showToast("Не удалось загрузить сохранение. Начинаем новую игру."), 0);
      return {
        credits: STARTER_CREDITS,
        techCores: 0,
        cars: [STARTER_CAR],
        raceStats: { ...DEFAULT_RACE_STATS },
        techCoreAchievements: [],
        drops: { common: 0, rare: 0, epic: 0, legendary: 0 },
        achievements: {},
        daily: createInitialDaily(),
        streak: createInitialStreak(),
        referral: { confirmed: 0, claimed: [], pendingCode: null },
        dropOpenPending: null,
        dropReceipt: null
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

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeDrops(value) {
    const result = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (const type of Object.keys(result)) {
      if (Number.isSafeInteger(value?.[type]) && value[type] >= 0) result[type] = value[type];
    }
    return result;
  }

  function getUtcGameDay(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function createInitialDaily() {
    return {
      date: getUtcGameDay(),
      progress: { race: 0, win: 0, car: 0 },
      baseline: { races: 0, wins: 0, cars: 1 },
      claimed: [],
      bonusClaimed: false
    };
  }

  function normalizeDaily(value) {
    const result = createInitialDaily();
    if (!isPlainObject(value) || typeof value.date !== "string") return result;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value.date)) result.date = value.date;
    result.progress = {
      race: Number.isSafeInteger(value.progress?.race) ? Math.max(0, value.progress.race) : 0,
      win: Number.isSafeInteger(value.progress?.win) ? Math.max(0, value.progress.win) : 0,
      car: Number.isSafeInteger(value.progress?.car) ? Math.max(0, value.progress.car) : 0
    };
    result.claimed = Array.isArray(value.claimed)
      ? [...new Set(value.claimed.filter((id) => ["race", "win", "car"].includes(id)))]
      : [];
    result.bonusClaimed = value.bonusClaimed === true;
    result.baseline = {
      races: Number.isSafeInteger(value.baseline?.races) ? Math.max(0, value.baseline.races) : 0,
      wins: Number.isSafeInteger(value.baseline?.wins) ? Math.max(0, value.baseline.wins) : 0,
      cars: Number.isSafeInteger(value.baseline?.cars) ? Math.max(0, value.baseline.cars) : 1
    };
    return result;
  }

  function createInitialStreak() {
    return { count: 0, lastDay: null, missesUsed: 0, claimedDays: [] };
  }

  function normalizeStreak(value) {
    const result = createInitialStreak();
    if (!isPlainObject(value)) return result;
    if (Number.isSafeInteger(value.count) && value.count >= 0) result.count = value.count;
    if (typeof value.lastDay === "string") result.lastDay = value.lastDay;
    if (Number.isSafeInteger(value.missesUsed) && value.missesUsed >= 0) result.missesUsed = value.missesUsed;
    result.claimedDays = Array.isArray(value.claimedDays)
      ? [...new Set(value.claimedDays.filter((day) => Number.isSafeInteger(day) && day > 0))]
      : [];
    return result;
  }

  function normalizeReferral(value) {
    return {
      confirmed: Number.isSafeInteger(value?.confirmed) ? Math.max(0, value.confirmed) : 0,
      claimed: Array.isArray(value?.claimed) ? [...new Set(value.claimed.filter((id) => REFERRAL_STAGES.some((stage) => stage.id === id)))] : [],
      pendingCode: typeof value?.pendingCode === "string" ? value.pendingCode.slice(0, 64) : null
    };
  }

  function normalizePendingDrop(value) {
    if (!isPlainObject(value) || typeof value.token !== "string" ||
        !DROP_TYPES.some((drop) => drop.id === value.type) ||
        !isPlainObject(value.reward)) return null;
    const reward = value.reward;
    const validCredits = reward.type === "credits" && Number.isSafeInteger(reward.amount) && reward.amount > 0;
    const validCores = reward.type === "tc" && Number.isSafeInteger(reward.amount) && reward.amount > 0;
    const validCar = reward.type === "car" &&
      Object.values(DROP_REWARD_CARS).includes(reward.catalogId);
    if (!validCredits && !validCores && !validCar) return null;
    return { token: value.token, type: value.type, reward: { ...reward } };
  }

  function normalizeDropReceipt(value) {
    const pending = normalizePendingDrop(value);
    if (!pending) return null;
    return { ...pending, acknowledged: value.acknowledged === true };
  }

  const ACHIEVEMENTS = [
    ...buildAchievements("collector-cars", "Коллекционер", "Автомобилей в гараже", [1, 3, 5, 10, 15]),
    ...buildAchievements("racer-runs", "Гонщик", "Завершённых заездов", [1, 5, 10, 25, 50]),
    ...buildAchievements("racer-wins", "Гонщик", "Побед в заездах", [1, 3, 10, 25, 50]),
    ...buildAchievements("drop-open", "Охотник за Drops", "Открытых AUTOGEN Drop", [1, 3, 10, 25, 50]),
    ...buildAchievements("social-friends", "Социальный игрок", "Подтверждённых друзей", [1, 3, 5, 10, 25]),
    ...buildAchievements("streak-days", "Постоянный игрок", "Дней ежедневной серии", [3, 7, 14, 30, 60]),
    ...buildAchievements("daily-bonus", "Постоянный игрок", "Полных ежедневных бонусов", [1, 3, 7, 14, 30]),
    ...buildAchievements("pro-circuit", "Редкие достижения", "Побед над соперником Pro на кольце", [1, 3, 5, 10, 20])
  ].map((achievement, index) => ({ ...achievement, id: `${achievement.category}-${index + 1}` }));

  function buildAchievements(category, titlePrefix, description, targets) {
    return targets.map((target, index) => ({
      category,
      title: `${titlePrefix}: этап ${index + 1}`,
      description: `${description}: ${target}`,
      target,
      reward: index === targets.length - 1
        ? { type: "drop", drop: index >= 4 ? "epic" : "rare", amount: 1 }
        : { type: index % 2 ? "tc" : "credits", amount: index % 2 ? 1 : 100 * (index + 1) }
    }));
  }

  function synchronizeGameDay(nextState) {
    const today = getUtcGameDay();
    const reset = nextState.daily.date === today
      ? nextState
      : {
        ...nextState,
        daily: {
          ...createInitialDaily(),
          baseline: {
            races: nextState.raceStats.total,
            wins: nextState.raceStats.wins,
            cars: nextState.cars.length
          }
        }
      };
    return updateDailyProgress(reset);
  }

  function updateDailyProgress(nextState) {
    const progress = {
      race: Math.max(nextState.daily.progress.race, nextState.raceStats.total > (nextState.daily.baseline?.races || 0) ? 1 : 0),
      win: Math.max(nextState.daily.progress.win, nextState.raceStats.wins > (nextState.daily.baseline?.wins || 0) ? 1 : 0),
      car: Math.max(nextState.daily.progress.car, nextState.cars.length > (nextState.daily.baseline?.cars ?? 0) ? 1 : 0)
    };
    return {
      ...nextState,
      daily: { ...nextState.daily, progress }
    };
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
      const currentDayState = synchronizeGameDay(nextState);
      const carWasAdded = nextState.cars.length > state.cars.length;
      const stateWithDailyProgress = carWasAdded
        ? {
          ...currentDayState,
          daily: {
            ...currentDayState.daily,
            progress: { ...currentDayState.daily.progress, car: 1 }
          }
        }
        : currentDayState;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stateWithDailyProgress, coins: stateWithDailyProgress.credits }));
      state = stateWithDailyProgress;
      return true;
    } catch (error) {
      console.error("Не удалось сохранить прогресс AUTOGEN:", error);
      showToast("Не удалось сохранить прогресс. Проверьте настройки хранилища браузера.");
      return false;
    }

  }

  function recoverPendingDrop() {
    const pending = state.dropOpenPending;
    if (!pending) return;
    const recovered = applyReward({
      ...state,
      dropOpenPending: null,
      dropReceipt: { ...pending, acknowledged: false },
      achievements: {
        ...state.achievements,
        dropOpen: (state.achievements.dropOpen || 0) + 1
      }
    }, pending.reward);
    saveState(synchronizeAchievements(recovered));
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
    renderDrops();
    renderStreak();
    renderReferrals();
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
    if (saveState(synchronizeAchievements(nextState))) {
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
    if (saveState(synchronizeAchievements(nextState))) {
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
    const definitions = [
      { id: "race", title: "Первый старт", detail: "Заверши гонку", target: 1, reward: "150 CR" },
      { id: "win", title: "Путь победителя", detail: "Одержи победу", target: 1, reward: "Common Drop" },
      { id: "car", title: "Своя команда", detail: "Увеличь гараж на один автомобиль", target: 1, reward: "1 TC" }
    ];
    elements.taskList.innerHTML = definitions.map((task) => {
      const current = Math.min(state.daily.progress[task.id] || 0, task.target);
      const complete = current >= task.target;
      const claimed = state.daily.claimed.includes(task.id);
      return `<article class="task-card panel-card${complete ? " is-complete" : ""}">
        <span class="task-marker" aria-hidden="true">${complete ? "✓" : "0" + (definitions.indexOf(task) + 1)}</span>
        <div class="task-copy"><span class="eyebrow">${complete ? "ВЫПОЛНЕНО" : "ЦЕЛЬ"}</span><h2>${task.title}</h2><p>${task.detail}</p></div>
        <div class="task-progress"><strong>${current} / ${task.target}</strong><div><span style="width:${Math.round(current / task.target * 100)}%"></span></div><small>${task.reward}</small></div>
        <button class="text-button" type="button" ${complete && !claimed ? `data-claim-daily="${task.id}"` : `data-go-screen="${task.id === "car" ? "garage" : "games"}"`}>${claimed ? "Получено" : complete ? "Получить" : task.id === "car" ? "В гараж" : "К играм"} <span aria-hidden="true">↗</span></button>
      </article>`;
    }).join("");
    const allComplete = state.daily.claimed.length === 3;
    elements.taskList.insertAdjacentHTML("beforeend", `<article class="task-card panel-card daily-bonus"><div class="task-copy"><span class="eyebrow">ОБЩИЙ БОНУС</span><h2>Три задания</h2><p>${allComplete ? "Все ежедневные награды получены." : "Получите награды за все три задания."}</p></div><button class="button button-secondary" type="button" data-claim-daily-bonus ${allComplete && !state.daily.bonusClaimed ? "" : "disabled"}>${state.daily.bonusClaimed ? "Получено" : "Получить бонус · Rare Drop"}</button></article>`);
    elements.taskList.querySelectorAll("[data-go-screen]").forEach((button) => {
      button.addEventListener("click", () => setScreen(button.dataset.goScreen));
    });
    elements.taskList.querySelectorAll("[data-claim-daily]").forEach((button) => button.addEventListener("click", () => claimDaily(button.dataset.claimDaily)));
    elements.taskList.querySelector("[data-claim-daily-bonus]")?.addEventListener("click", claimDailyBonus);
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

    const progressValues = {
      "collector-cars": state.cars.length,
      "racer-runs": state.raceStats.total,
      "racer-wins": state.raceStats.wins,
      "drop-open": state.achievements.dropOpen || 0,
      "social-friends": 0,
      "streak-days": state.streak.count,
      "daily-bonus": state.achievements.dailyBonus || 0,
      "pro-circuit": state.achievements.proCircuit || 0
    };
    elements.profileAchievements.innerHTML = ACHIEVEMENTS.map((achievement) => {
      const current = Math.min(progressValues[achievement.category] || 0, achievement.target);
      const referralUnavailable = achievement.category === "social-friends";
      const earned = !referralUnavailable &&
        state.achievements[achievement.id]?.claimed === true;
      return `<article class="achievement${earned ? " is-unlocked" : ""}">
        <span class="achievement-mark" aria-hidden="true">${earned ? "✓" : "—"}</span>
        <div><h3>${achievement.title}</h3><p>${achievement.description}</p><small>${current} / ${achievement.target}</small></div>
        <span class="achievement-state">${referralUnavailable ? "ОЖИДАЕТ СЕРВЕР" : earned ? "НАГРАДА ПОЛУЧЕНА" : current >= achievement.target ? "ВЫПОЛНЕНО" : "В ПРОЦЕССЕ"}</span>
      </article>`;
    }).join("");
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
    const proCircuitWin = won &&
      opponentId === "pro" &&
      type === RACE_TYPES.circuit;
    const earnedAchievement = proCircuitWin && !state.techCoreAchievements.includes("pro-circuit-win");
    const firstCompletedRace = state.raceStats.total === 0;
    const updatedStats = {
      total: state.raceStats.total + 1,
      wins: state.raceStats.wins + (won ? 1 : 0),
      losses: state.raceStats.losses + (won ? 0 : 1),
      rewards: state.raceStats.rewards + reward
    };
    const nextAchievements = {
      ...state.achievements,
      proCircuit: (state.achievements.proCircuit || 0) + (proCircuitWin ? 1 : 0)
    };
    const nextState = {
      ...state,
      credits: state.credits + payout,
      techCores: state.techCores + (earnedAchievement ? 1 : 0),
      techCoreAchievements: earnedAchievement
        ? [...state.techCoreAchievements, "pro-circuit-win"]
        : state.techCoreAchievements,
      raceStats: updatedStats,
      achievements: nextAchievements,
      drops: firstCompletedRace
        ? { ...state.drops, common: state.drops.common + 1 }
        : state.drops
    };
    const saved = saveState(synchronizeAchievements(nextState));

    elements.raceTrack.classList.remove("is-racing");
    elements.raceCountdown.textContent = won ? "ПОБЕДА" : "ФИНИШ";
    elements.raceStatus.textContent = won ? "Финиш! Отличный заезд." : "Финиш! В следующий раз будет лучше.";
    elements.raceResult.className = `race-result ${won ? "is-win" : "is-loss"}`;
    elements.raceResult.innerHTML = `
      <span class="result-label">${won ? "ЗАЕЗД ВЫИГРАН" : "ЗАЕЗД ЗАВЕРШЁН"}</span>
      <strong>${won ? "Победа." : "Поражение."}</strong>
      <p>${won ? `Награда за победу: +${formatNumber(reward)} CR.` : `Награда за участие: +${formatNumber(reward)} CR.`}</p>
      <p>${stake ? `Ставка ${won ? "возвращена в двойном размере" : "потеряна"}: ${formatNumber(stake)} CR.` : "Без ставки — только награда за заезд."}</p>
      ${saved && firstCompletedRace ? "<p>Первый завершённый заезд: +1 Common Drop.</p>" : ""}
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

  function claimDaily(id) {
    state = synchronizeGameDay(state);
    if (!["race", "win", "car"].includes(id) ||
        state.daily.claimed.includes(id) ||
        (state.daily.progress[id] || 0) < 1) return;
    const next = { ...state, daily: { ...state.daily, claimed: [...state.daily.claimed, id] } };
    if (id === "race") next.credits += 150;
    if (id === "win") next.drops = { ...next.drops, common: next.drops.common + 1 };
    if (id === "car") next.techCores += 1;
    if (saveState(synchronizeAchievements(next))) {
      render();
      showToast("Ежедневная награда получена.");
    }
  }

  function claimDailyBonus() {
    const dailyTaskIds = ["race", "win", "car"];
    if (state.daily.bonusClaimed ||
        !dailyTaskIds.every((id) => state.daily.claimed.includes(id) && state.daily.progress[id] >= 1)) return;
    const next = {
      ...state,
      daily: { ...state.daily, bonusClaimed: true },
      drops: { ...state.drops, rare: state.drops.rare + 1 },
      achievements: {
        ...state.achievements,
        dailyBonus: (state.achievements.dailyBonus || 0) + 1
      }
    };
    if (saveState(synchronizeAchievements(next))) {
      render();
      showToast("Бонус выполненных заданий: Rare Drop.");
    }
  }

  function renderReferrals() {
    elements.referralCount.textContent = "0";
    elements.referralLink.textContent = "Подтверждение друзей пока недоступно";
    elements.referralStages.innerHTML = REFERRAL_STAGES.map((stage) => {
      return `<article class="referral-stage">
        <strong>${stage.target}</strong><div><span>ДРУЗЕЙ</span><small>${rewardLabel(stage.reward)}</small></div>
        <button class="text-button" type="button" disabled>Сервер не подключён</button>
      </article>`;
    }).join("");
  }

  function rewardLabel(reward) {
    if (reward.type === "credits") return `${reward.amount} CR`;
    if (reward.type === "tc") return `${reward.amount} TC`;
    if (reward.type === "drop") return `${DROP_TYPES.find((drop) => drop.id === reward.drop)?.label || reward.drop} Drop`;
    if (reward.type === "car") return CAR_CATALOG.find((car) => car.id === reward.catalogId)?.name || "Автомобиль";
  }

  function applyReward(nextState, reward) {
    if (reward.type === "credits") return { ...nextState, credits: nextState.credits + reward.amount };
    if (reward.type === "tc") return { ...nextState, techCores: nextState.techCores + reward.amount };
    if (reward.type === "drop") return { ...nextState, drops: { ...nextState.drops, [reward.drop]: nextState.drops[reward.drop] + (reward.amount || 1) } };
    if (reward.type === "car") {
      const model = CAR_CATALOG.find((car) => car.id === reward.catalogId);
      return model ? { ...nextState, cars: [...nextState.cars, catalogCarToGameCar(model)] } : nextState;
    }
    return nextState;
  }

  function catalogCarToGameCar(model) {
    return {
      id: createId(),
      catalogId: model.id,
      name: model.name,
      trim: model.class,
      color: randomItem(PALETTE),
      hp: model.hp,
      speed: model.speed,
      accel: model.accel,
      level: 1,
      parts: [randomItem(PARTS)],
      plate: createPlate()
    };
  }

  let pendingDropOpen = null;
  let dropAnimationTimer = null;
  let dropPurchaseLocked = false;

  function renderDrops() {
    const total = Object.values(state.drops).reduce((sum, amount) => sum + amount, 0);
    elements.dropInventory.textContent = `${total} КАПСУЛ`;
    elements.dropList.innerHTML = DROP_TYPES.map((drop) => `
      <article class="drop-card drop-${drop.className}">
        <div class="drop-capsule" aria-hidden="true"><span></span><i></i></div>
        <div><strong>${drop.label}</strong><span>${state.drops[drop.id]} шт.</span></div>
        <div class="drop-actions">
          <button class="text-button" type="button" data-open-drop="${drop.id}" ${state.drops[drop.id] > 0 ? "" : "disabled"}>Открыть</button>
          <button class="text-button" type="button" data-buy-drop="${drop.id}" ${state.credits >= DROP_PRICES[drop.id] && !raceInProgress && !dropPurchaseLocked ? "" : "disabled"}>Купить · ${formatNumber(DROP_PRICES[drop.id])} CR</button>
        </div>
      </article>`).join("");
  }

  function buyDrop(dropId) {
    if (raceInProgress || dropPurchaseLocked || !Object.prototype.hasOwnProperty.call(DROP_PRICES, dropId)) return;
    const price = DROP_PRICES[dropId];
    if (state.credits < price) {
      showToast("Недостаточно Credits для покупки капсулы.");
      return;
    }

    dropPurchaseLocked = true;
    const nextState = {
      ...state,
      credits: state.credits - price,
      drops: { ...state.drops, [dropId]: state.drops[dropId] + 1 }
    };
    if (!saveState(nextState)) {
      dropPurchaseLocked = false;
      renderDrops();
      return;
    }

    render();
    showToast(`${DROP_TYPES.find((drop) => drop.id === dropId).label} Drop куплен.`);
    window.setTimeout(() => {
      dropPurchaseLocked = false;
      renderDrops();
    }, 350);
  }

  function openDrop(dropId) {
    if (!DROP_TYPES.some((drop) => drop.id === dropId) || state.drops[dropId] < 1 || pendingDropOpen) return;
    const type = DROP_TYPES.find((drop) => drop.id === dropId);
    const token = createId();
    const reward = determineDropReward(dropId);
    const awarded = applyReward({
      ...state,
      drops: { ...state.drops, [dropId]: state.drops[dropId] - 1 },
      dropOpenPending: null,
      dropReceipt: { token, type: dropId, reward, acknowledged: false },
      achievements: {
        ...state.achievements,
        dropOpen: (state.achievements.dropOpen || 0) + 1
      }
    }, reward);
    if (!saveState(synchronizeAchievements(awarded))) return;
    pendingDropOpen = { token, capsule: type, reward };
    showDropModal(type, reward);
  }

  function determineDropReward(dropId) {
    const table = DROP_REWARD_TABLES[dropId];
    if (!table || table.reduce((sum, entry) => sum + entry.chance, 0) !== 100) {
      throw new Error(`Таблица наград AUTOGEN Drop «${dropId}» должна составлять 100%.`);
    }
    const roll = Math.random() * 100;
    let threshold = 0;
    for (const entry of table) {
      threshold += entry.chance;
      if (roll < threshold) return { ...entry.reward };
    }
    throw new Error(`Не удалось определить награду AUTOGEN Drop «${dropId}».`);
  }

  function showDropModal(capsule, reward) {
    elements.dropModal.hidden = false;
    elements.dropModalArt.className = `drop-modal-art drop-${capsule.className}`;
    elements.dropModalArt.innerHTML = `<div class="drop-capsule is-large" aria-hidden="true"><span></span><i></i></div><h2 id="drop-modal-title">${capsule.label} Drop</h2>`;
    elements.dropResult.innerHTML = "";
    elements.dropSkip.hidden = false;
    window.clearTimeout(dropAnimationTimer);
    dropAnimationTimer = window.setTimeout(() => revealDropReward(reward), 1800);
  }

  function skipDropAnimation() {
    if (!pendingDropOpen) return;
    window.clearTimeout(dropAnimationTimer);
    revealDropReward(pendingDropOpen.reward);
  }

  function revealDropReward(reward) {
    if (!pendingDropOpen) return;
    const receipt = state.dropReceipt;
    pendingDropOpen = null;
    elements.dropSkip.hidden = true;
    if (receipt && receipt.acknowledged === false) {
      saveState({ ...state, dropReceipt: { ...receipt, acknowledged: true } });
    }
    const model = reward.type === "car" ? CAR_CATALOG.find((car) => car.id === reward.catalogId) : null;
    const item = model
      ? `<img class="drop-reward-car" src="${escapeAttribute(model.image)}" alt="${escapeHtml(model.name)}">`
      : "";
    elements.dropResult.innerHTML = `<span>НАГРАДА ВЫДАНА</span>${item}<strong>${rewardLabel(reward)}</strong><button class="button button-primary" type="button" data-close-drop-confirm>Готово</button>`;
    elements.dropResult.querySelector("[data-close-drop-confirm]").addEventListener("click", closeDropModal);
    render();
  }

  function closeDropModal() {
    if (pendingDropOpen) return;
    elements.dropModal.hidden = true;
    window.clearTimeout(dropAnimationTimer);
    pendingDropOpen = null;
  }

  function claimStreakReward() {
    const today = getUtcGameDay();
    const firstLogin = !state.streak.lastDay;
    if (!firstLogin && state.streak.lastDay === today) {
      renderStreak();
      return;
    }
    const previous = firstLogin ? null : new Date(`${state.streak.lastDay}T00:00:00Z`);
    const current = new Date(`${today}T00:00:00Z`);
    const gap = firstLogin ? 0 : Math.round((current - previous) / 86400000);
    let missesUsed = state.streak.missesUsed;
    let count = firstLogin ? 1 : state.streak.count;
    if (!firstLogin && gap === 1) {
      count += 1;
    } else if (!firstLogin && gap === 2 && missesUsed < 1) {
      count += 1;
      missesUsed += 1;
    } else if (!firstLogin) {
      count = 1;
      missesUsed = 0;
    }
    const next = {
      ...state,
      streak: {
        count,
        lastDay: today,
        missesUsed,
        claimedDays: [...new Set([...state.streak.claimedDays, count])]
      }
    };
    if (!next.streak.claimedDays.includes(count)) next.streak.claimedDays.push(count);
    const rewardDay = count;
    if (count === 30) {
      const model = CAR_CATALOG.find((car) => car.id === "bmw-m3" && car.rarity === "Rare");
      if (model) next.cars = [...next.cars, catalogCarToGameCar(model)];
    } else if (count > 30) {
      if (count % 5 === 0) {
        next.drops = {
          ...next.drops,
          common: next.drops.common + 1,
          epic: next.drops.epic + (count % 10 === 0 ? 1 : 0)
        };
      } else {
        next.credits += 250;
      }
    } else if (rewardDay === 1) {
      next.credits += 100;
    } else if (rewardDay <= 7) {
      next.credits += 100 + rewardDay * 25;
    } else if (rewardDay < 30) {
      next.drops = { ...next.drops, rare: next.drops.rare + (rewardDay % 7 === 0 ? 1 : 0) };
      next.credits += 250;
    }
    if (saveState(synchronizeAchievements(next))) render();
  }

  function renderStreak() {
    elements.streakCount.textContent = String(state.streak.count);
    elements.streakSave.textContent = state.streak.missesUsed < 1 ? "Пропуск доступен: 1" : "Пропуск использован";
    const nextStage = state.streak.count < 30 ? 30 : (Math.floor(state.streak.count / 5) + 1) * 5;
    const nextReward = getStreakRewardDescription(nextStage);
    elements.streakNextStage.textContent = `Следующий этап: день ${nextStage} — ${nextReward} · серия ${state.streak.count}/${nextStage}`;
    const visibleDays = Math.max(40, Math.ceil((state.streak.count + 1) / 10) * 10);
    elements.streakCalendar.innerHTML = Array.from({ length: visibleDays }, (_, index) => {
      const day = index + 1;
      const active = day <= state.streak.count;
      const milestone = day > 30 && day % 5 === 0;
      const reward = getStreakRewardDescription(day);
      return `<span class="${active ? "is-active" : ""} ${day === 30 ? "is-rare" : ""} ${milestone ? "is-milestone" : ""}"${reward ? ` title="День ${day}: ${reward}"` : ""}>${day}</span>`;
    }).join("");
  }

  function getStreakRewardDescription(day) {
    if (day === 30) return "BMW M3";
    if (day <= 30) return "";
    if (day % 5 !== 0) return "250 CR";
    return day % 10 === 0 ? "Common + Epic Drop" : "Common Drop";
  }

  function synchronizeAchievements(nextState) {
    const values = {
      "collector-cars": nextState.cars.length,
      "racer-runs": nextState.raceStats.total,
      "racer-wins": nextState.raceStats.wins,
      "drop-open": nextState.achievements.dropOpen || 0,
      "social-friends": 0,
      "streak-days": nextState.streak.count,
      "daily-bonus": nextState.achievements.dailyBonus || 0,
      "pro-circuit": nextState.achievements.proCircuit || 0
    };
    let updated = { ...nextState, achievements: { ...nextState.achievements } };
    for (const achievement of ACHIEVEMENTS) {
      const prefix = achievement.category;
      const current = values[prefix] || 0;
      if (current < achievement.target) continue;
      const key = achievement.id;
      if (updated.achievements[key]?.claimed === true) continue;
      updated = applyReward(updated, achievement.reward);
      updated.achievements[key] = { progress: current, claimed: true };
    }
    return updated;
  }

  state = synchronizeGameDay(state);
  recoverPendingDrop();
  claimStreakReward();
  const initialProgress = synchronizeAchievements(state);
  if (JSON.stringify(initialProgress) !== JSON.stringify(state)) saveState(initialProgress);
  else state = initialProgress;
  initializeTelegram();
  render();
  if (state.dropReceipt && !state.dropReceipt.acknowledged) {
    const capsule = DROP_TYPES.find((drop) => drop.id === state.dropReceipt.type);
    if (capsule) {
      pendingDropOpen = { token: state.dropReceipt.token, capsule, reward: state.dropReceipt.reward };
      showDropModal(capsule, state.dropReceipt.reward);
    }
  }
})();
