/* =========================================================
   食刻 · 本周餐桌
   Weekly food table · tray · profiles · weight log
   ========================================================= */

(function () {
  "use strict";

  const KJ_PER_KCAL = 4.184;
  const KCAL_PER_KJ = 1 / KJ_PER_KCAL;
  const STORAGE_KEY = "shike-calorie-ledger-v3";
  const LEGACY_V2_KEY = "shike-calorie-ledger-v2";
  const LEGACY_V1_KEY = "shike-calorie-ledger-v1";
  const DONUT_CIRCUMFERENCE = 2 * Math.PI * 72;

  const FORMULAS = {
    mifflin: { label: "Mifflin-St Jeor", short: "Mifflin" },
    katch: { label: "Katch-McArdle", short: "Katch" },
    harris: { label: "Harris-Benedict", short: "Harris" },
  };

  const BUILTIN_STATUSES = [
    { id: "rest", name: "静养休息", factor: 1.2, color: "#dfc28c", custom: false },
    { id: "daily", name: "日常状态", factor: 1.375, color: "#e8aa45", custom: false },
    { id: "active", name: "活跃状态", factor: 1.55, color: "#e28a31", custom: false },
    { id: "training", name: "训练日", factor: 1.725, color: "#cd7027", custom: false },
    { id: "intense", name: "高负荷日", factor: 1.9, color: "#ae5521", custom: false },
  ];

  const STATUS_COLORS = ["#e8b258", "#ec9c3c", "#df8531", "#cd7027", "#b85e24", "#9f5428", "#d6a169", "#c58b52"];
  const USER_COLORS = ["#e8aa45", "#d8833c", "#b9824a", "#c99d5b", "#ad6b3d", "#d6b277"];

  const BASIS_META = {
    "100g": { label: "每 100g", nutrition: "每 100 g", unit: "g" },
    "100ml": { label: "每 100ml", nutrition: "每 100 ml", unit: "ml" },
    serving: { label: "每份", nutrition: "每份", unit: "g" },
  };

  const CATEGORY_STYLES = {
    staple: { bg: "#f5e4bd", accent: "#d5a743" },
    protein: { bg: "#f3d9b5", accent: "#ce8235" },
    fruit: { bg: "#f7d9bd", accent: "#df8b4b" },
    vegetable: { bg: "#f0e5c4", accent: "#b5a14a" },
    dairy: { bg: "#f8ebd2", accent: "#d9a75d" },
    snack: { bg: "#f4dfc2", accent: "#c88c4c" },
    drink: { bg: "#f8e9c9", accent: "#d9ad56" },
    custom: { bg: "#f1e5d2", accent: "#bda276" },
  };

  const PRESETS = [
    { id: "rice", name: "米饭", emoji: "🍚", category: "staple", basis: "100g", energyKj: 486, protein: 2.6, fat: 0.3, carbs: 25.9, servingSize: 150 },
    { id: "oats", name: "燕麦片", emoji: "🥣", category: "staple", basis: "100g", energyKj: 1535, protein: 15, fat: 6.7, carbs: 61.6, servingSize: 40 },
    { id: "sweet-potato", name: "蒸红薯", emoji: "🍠", category: "staple", basis: "100g", energyKj: 360, protein: 1.6, fat: 0.1, carbs: 20.1, servingSize: 150 },
    { id: "bread", name: "全麦面包", emoji: "🍞", category: "staple", basis: "100g", energyKj: 1109, protein: 9, fat: 4.2, carbs: 49, servingSize: 35 },
    { id: "egg", name: "鸡蛋", emoji: "🥚", category: "protein", basis: "100g", energyKj: 598, protein: 12.6, fat: 9.5, carbs: 1.1, servingSize: 50 },
    { id: "chicken", name: "鸡胸肉", emoji: "🍗", category: "protein", basis: "100g", energyKj: 690, protein: 31, fat: 3.6, carbs: 0, servingSize: 120 },
    { id: "salmon", name: "三文鱼", emoji: "🐟", category: "protein", basis: "100g", energyKj: 870, protein: 20, fat: 13, carbs: 0, servingSize: 120 },
    { id: "tofu", name: "北豆腐", emoji: "🫘", category: "protein", basis: "100g", energyKj: 318, protein: 8, fat: 4.8, carbs: 1.9, servingSize: 100 },
    { id: "milk", name: "牛奶", emoji: "🥛", category: "dairy", basis: "100ml", energyKj: 226, protein: 3, fat: 3.2, carbs: 3.4, servingSize: 250 },
    { id: "yogurt", name: "希腊酸奶", emoji: "🥣", category: "dairy", basis: "100g", energyKj: 406, protein: 9, fat: 5, carbs: 3.6, servingSize: 100 },
    { id: "whey", name: "乳清蛋白粉", emoji: "🥤", category: "protein", basis: "serving", energyKj: 502, protein: 24, fat: 1.5, carbs: 3, servingSize: 30 },
    { id: "banana", name: "香蕉", emoji: "🍌", category: "fruit", basis: "100g", energyKj: 389, protein: 1.4, fat: 0.2, carbs: 22, servingSize: 120 },
    { id: "apple", name: "苹果", emoji: "🍎", category: "fruit", basis: "100g", energyKj: 218, protein: 0.3, fat: 0.2, carbs: 14, servingSize: 180 },
    { id: "blueberry", name: "蓝莓", emoji: "🫐", category: "fruit", basis: "100g", energyKj: 238, protein: 0.7, fat: 0.3, carbs: 14.5, servingSize: 100 },
    { id: "avocado", name: "牛油果", emoji: "🥑", category: "fruit", basis: "100g", energyKj: 669, protein: 2, fat: 14.7, carbs: 8.5, servingSize: 100 },
    { id: "nuts", name: "混合坚果", emoji: "🥜", category: "snack", basis: "100g", energyKj: 2540, protein: 20, fat: 54, carbs: 21, servingSize: 25 },
    { id: "broccoli", name: "西兰花", emoji: "🥦", category: "vegetable", basis: "100g", energyKj: 142, protein: 2.8, fat: 0.4, carbs: 6.6, servingSize: 100 },
    { id: "olive-oil", name: "橄榄油", emoji: "🫒", category: "snack", basis: "100g", energyKj: 3699, protein: 0, fat: 100, carbs: 0, servingSize: 10 },
    { id: "cola", name: "可乐", emoji: "🥤", category: "drink", basis: "100ml", energyKj: 180, protein: 0, fat: 0, carbs: 10.6, servingSize: 330 },
    { id: "coffee", name: "黑咖啡", emoji: "☕", category: "drink", basis: "100ml", energyKj: 8, protein: 0.1, fat: 0, carbs: 0, servingSize: 240 },
  ];

  const STARTER_IDS = ["rice", "egg", "chicken", "milk", "yogurt", "banana"];
  const WEEKDAY_SHORT = ["一", "二", "三", "四", "五", "六", "日"];
  const WEEKDAY_LONG = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

  const numberFormatter = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
  const decimalFormatter = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const quantityFormatter = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });

  let state;
  let ui;
  let viewDate;
  let storageAvailable = true;
  let storageWarningShown = false;
  let dragState = null;
  let toastTimer = null;
  let confirmResolver = null;

  const el = {};

  /* =========================================================
     Boot
     ========================================================= */

  function init() {
    cacheElements();
    detectStorage();
    state = loadState();
    viewDate = todayKey();
    ui = {
      editingTrayId: null,
      statusEditingId: null,
      statusColor: STATUS_COLORS[1],
      statusFormOpen: false,
      toastTimer: null,
    };

    renderPresetStrip();
    bindEvents();
    syncProfileForm();
    el.weightDate.value = todayKey();
    updateWeekUI();
    renderAll();
    saveState();

    if (!storageAvailable) {
      window.setTimeout(function () {
        showToast("浏览器本地存储不可用，刷新后记录可能丢失");
      }, 700);
    }
  }

  function cacheElements() {
    const ids = [
      "profileButton", "userAvatar", "userName", "prevWeek", "nextWeek", "weekDisplay", "weekRange",
      "datePicker", "todayWeekBtn", "shareWeekBtn", "macroDonut", "donutProtein", "donutFat", "donutCarbs",
      "donutKcal", "donutPeriodLabel", "macroLegend", "macroBars", "overviewDayLabel", "weekIntake", "weekTdee", "weekBalance", "weekBalanceNote", "weekBalanceCard",
      "dayEntries", "tableWeekRange", "addStatusBtn", "clearStatusBtn", "dayColumns", "weekTotals", "trayCount",
      "addTrayBtn", "trayList", "compareChart", "compareStats", "profileDialog", "closeProfile", "drawerUserName",
      "drawerScroll", "userList", "newUserBtn", "currentWeightLabel", "profileForm", "ageInput", "heightInput",
      "bodyFatInput", "formulaSelect", "proteinMinInput", "fatMinInput", "profileBmr", "profileTdee", "profileBmi", "weightForm", "weightDate",
      "weightValue", "weightBodyFat", "weightMuscle", "weightCount", "weightChart", "weightList", "statusSection",
      "newStatusBtn", "statusList",
      "statusForm", "statusName", "statusFactor", "statusColorPicker", "statusError", "statusCancelEdit",
      "statusSaveBtn", "userDialog", "userForm", "closeUserDialog", "cancelUserDialog", "newUserName",
      "newUserAge", "newUserHeight", "newUserWeight", "userError", "foodDialog", "foodForm", "foodDialogTitle",
      "closeFoodDialog", "presetStrip", "foodName", "basisSegment", "unitSegment", "nutritionBasis", "foodEnergy",
      "energySuffix", "energyConverted", "foodProtein", "foodFat", "foodCarbs", "foodServingSize",
      "servingSizeLabel", "servingSizeSuffix", "foodServings", "formServingStepper", "amountReadout", "previewKcal", "previewKj",
      "previewAmount", "previewProtein", "previewFat", "previewCarbs", "previewFormula", "deleteFoodCard",
      "foodError", "cancelFoodDialog", "saveFoodCard", "confirmDialog", "confirmClose", "confirmTitle",
      "confirmMessage", "confirmCancel", "confirmOk", "toast", "toastText",
    ];
    ids.forEach(function (id) { el[id] = document.getElementById(id); });
  }

  function bindEvents() {
    el.profileButton.addEventListener("click", function () { openProfile(false); });
    el.closeProfile.addEventListener("click", closeProfile);
    el.profileDialog.addEventListener("click", function (event) {
      if (event.target === el.profileDialog) closeProfile();
    });
    el.profileDialog.addEventListener("close", syncBodyDialogState);

    el.prevWeek.addEventListener("click", function () { shiftWeek(-1); });
    el.nextWeek.addEventListener("click", function () { shiftWeek(1); });
    el.todayWeekBtn.addEventListener("click", function () { setWeekDate(todayKey()); });
    el.weekDisplay.addEventListener("click", openNativeDatePicker);
    el.datePicker.addEventListener("change", function () {
      if (el.datePicker.value) setWeekDate(el.datePicker.value);
    });
    el.datePicker.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openNativeDatePicker();
      }
    });
    el.shareWeekBtn.addEventListener("click", copyWeekSummary);

    el.addStatusBtn.addEventListener("click", function () { openProfile(true); });
    el.clearStatusBtn.addEventListener("click", clearWeekStatuses);
    el.addTrayBtn.addEventListener("click", function () { openFoodDialog(); });
    el.dayColumns.addEventListener("change", handleDayStatusChange);
    el.dayColumns.addEventListener("click", handleDayClick);
    el.trayList.addEventListener("click", handleTrayClick);
    el.trayList.addEventListener("pointerdown", handleDragStart);

    el.profileForm.addEventListener("input", handleProfileInput);
    el.profileForm.addEventListener("change", handleProfileChange);
    el.newUserBtn.addEventListener("click", openUserDialog);
    el.closeUserDialog.addEventListener("click", closeUserDialog);
    el.cancelUserDialog.addEventListener("click", closeUserDialog);
    el.userDialog.addEventListener("close", syncBodyDialogState);
    el.userForm.addEventListener("submit", handleUserSubmit);
    el.userList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-user-id]");
      if (!button) return;
      switchUser(button.dataset.userId);
    });
    el.weightForm.addEventListener("submit", handleWeightSubmit);
    el.weightList.addEventListener("click", handleWeightListClick);

    el.newStatusBtn.addEventListener("click", function () { showStatusForm(); });
    el.statusCancelEdit.addEventListener("click", hideStatusForm);
    el.statusForm.addEventListener("submit", handleStatusSubmit);
    el.statusColorPicker.addEventListener("click", handleStatusColorClick);
    el.statusList.addEventListener("click", handleStatusListClick);

    el.foodForm.addEventListener("submit", handleFoodSubmit);
    el.closeFoodDialog.addEventListener("click", closeFoodDialog);
    el.cancelFoodDialog.addEventListener("click", closeFoodDialog);
    el.foodDialog.addEventListener("cancel", function (event) {
      event.preventDefault();
    });
    el.foodDialog.addEventListener("close", syncBodyDialogState);
    el.confirmOk.addEventListener("click", function () { settleConfirm(true); });
    el.confirmCancel.addEventListener("click", function () { settleConfirm(false); });
    el.confirmClose.addEventListener("click", function () { settleConfirm(false); });
    el.confirmDialog.addEventListener("cancel", function (event) {
      event.preventDefault();
      settleConfirm(false);
    });
    el.confirmDialog.addEventListener("click", function (event) {
      if (event.target === el.confirmDialog) settleConfirm(false);
    });
    el.confirmDialog.addEventListener("close", function () {
      if (confirmResolver) settleConfirm(false);
      syncBodyDialogState();
    });
    el.presetStrip.addEventListener("click", handlePresetClick);
    el.basisSegment.addEventListener("click", handleBasisClick);
    el.unitSegment.addEventListener("click", handleUnitClick);
    el.formServingStepper.addEventListener("click", handleFormServingStep);
    el.foodForm.addEventListener("input", handleFoodInput);
    el.deleteFoodCard.addEventListener("click", deleteEditingCard);
  }

  /* =========================================================
     Storage
     ========================================================= */

  function detectStorage() {
    try {
      const key = "__shike_storage_test_v3__";
      window.localStorage.setItem(key, "1");
      window.localStorage.removeItem(key);
      storageAvailable = true;
    } catch (error) {
      storageAvailable = false;
    }
  }

  function saveState() {
    if (!storageAvailable) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      storageAvailable = false;
      if (!storageWarningShown) {
        storageWarningShown = true;
        showToast("本地存储空间不足，修改可能无法保留");
      }
    }
  }

  function createDefaultState() {
    const user = createUser("小夏", {
      sex: "female",
      age: 25,
      height: 165,
      weight: 55,
      bodyFat: "",
      formula: "mifflin",
    }, 0);
    return {
      version: 3,
      activeUserId: user.id,
      customStatuses: [],
      removedBuiltinStatusIds: [],
      users: [user],
    };
  }

  function createUser(name, data, index) {
    const userId = uid("u");
    const initialWeight = roundTo(clamp(Number(data.weight) || 55, 20, 400), 1);
    return {
      id: userId,
      name: String(name || "使用人").trim().slice(0, 16),
      color: USER_COLORS[index % USER_COLORS.length],
      profile: {
        sex: data.sex === "male" ? "male" : "female",
        age: cleanNumberString(data.age, "25"),
        height: cleanNumberString(data.height, "165"),
        bodyFat: cleanNumberString(data.bodyFat, ""),
        formula: Object.prototype.hasOwnProperty.call(FORMULAS, data.formula) ? data.formula : "mifflin",
        proteinMin: cleanNumberString(data.proteinMin, "60"),
        fatMin: cleanNumberString(data.fatMin, "45"),
      },
      weightRecords: [{
        id: uid("w"),
        weight: initialWeight,
        bodyFat: null,
        muscle: null,
        date: todayKey(),
        createdAt: Date.now(),
      }],
      tray: makeStarterTray(),
      days: {},
    };
  }

  function makeStarterTray() {
    return STARTER_IDS.map(function (presetId) {
      const preset = PRESETS.find(function (item) { return item.id === presetId; });
      if (!preset) return null;
      return makeCardFromPreset(preset, 1);
    }).filter(Boolean);
  }

  function makeCardFromPreset(preset, servings) {
    return {
      id: uid("c"),
      name: preset.name,
      emoji: preset.emoji,
      category: preset.category,
      basis: preset.basis,
      energyKj: preset.energyKj,
      protein: preset.protein,
      fat: preset.fat,
      carbs: preset.carbs,
      servingSize: preset.servingSize,
      servings: servings || 1,
      createdAt: Date.now(),
    };
  }

  function loadState() {
    let parsed = null;
    try {
      const rawNew = window.localStorage.getItem(STORAGE_KEY);
      if (rawNew) {
        parsed = JSON.parse(rawNew);
      } else {
        const rawV2 = window.localStorage.getItem(LEGACY_V2_KEY);
        const rawV1 = window.localStorage.getItem(LEGACY_V1_KEY);
        const raw = rawV2 || rawV1;
        if (raw) parsed = migrateLegacy(JSON.parse(raw));
      }
    } catch (error) {
      parsed = null;
    }

    if (!parsed || typeof parsed !== "object") return createDefaultState();

    const builtinIds = new Set(BUILTIN_STATUSES.map(function (status) { return status.id; }));
    const base = {
      version: 3,
      activeUserId: typeof parsed.activeUserId === "string" ? parsed.activeUserId : null,
      customStatuses: Array.isArray(parsed.customStatuses) ? parsed.customStatuses.map(normalizeStatus).filter(Boolean).slice(0, 20) : [],
      removedBuiltinStatusIds: Array.isArray(parsed.removedBuiltinStatusIds)
        ? parsed.removedBuiltinStatusIds.filter(function (id) { return builtinIds.has(id); }).slice(0, BUILTIN_STATUSES.length)
        : [],
      users: Array.isArray(parsed.users) ? parsed.users.map(normalizeUser).filter(Boolean) : [],
    };

    if (!base.users.length) return createDefaultState();
    if (!base.activeUserId || !base.users.some(function (user) { return user.id === base.activeUserId; })) {
      base.activeUserId = base.users[0].id;
    }
    return base;
  }

  function migrateLegacy(old) {
    const oldProfile = old.profile || {};
    const oldWeight = Number(oldProfile.weight);
    const user = createUser("我", {
      sex: oldProfile.sex,
      age: oldProfile.age,
      height: oldProfile.height,
      weight: Number.isFinite(oldWeight) && oldWeight > 0 ? oldWeight : 55,
      bodyFat: oldProfile.bodyFat,
      formula: oldProfile.formula,
    }, 0);

    user.days = {};
    if (old.days && typeof old.days === "object") {
      Object.keys(old.days).forEach(function (dateKey) {
        if (!isDateKey(dateKey)) return;
        const oldDay = old.days[dateKey];
        if (!oldDay || !Array.isArray(oldDay.items)) return;
        const entries = oldDay.items.map(normalizeEntry).filter(Boolean);
        if (entries.length || oldDay.statusId) {
          user.days[dateKey] = {
            statusId: typeof oldDay.statusId === "string" ? oldDay.statusId : "daily",
            entries: entries,
          };
        }
      });
    }

    return {
      version: 3,
      activeUserId: user.id,
      customStatuses: Array.isArray(old.customStatuses) ? old.customStatuses.map(normalizeStatus).filter(Boolean).slice(0, 20) : [],
      removedBuiltinStatusIds: [],
      users: [user],
    };
  }

  function normalizeUser(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = safeId(raw.id) ? raw.id : uid("u");
    const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 16) : "使用人";
    const profile = raw.profile && typeof raw.profile === "object" ? raw.profile : {};
    const weights = Array.isArray(raw.weightRecords) ? raw.weightRecords.map(normalizeWeight).filter(Boolean) : [];
    if (!weights.length) {
      weights.push({ id: uid("w"), weight: 55, date: todayKey(), createdAt: Date.now() });
    }
    const tray = Array.isArray(raw.tray) ? raw.tray.map(normalizeCard).filter(Boolean) : [];
    const days = {};
    if (raw.days && typeof raw.days === "object") {
      Object.keys(raw.days).forEach(function (dateKey) {
        if (!isDateKey(dateKey)) return;
        const day = raw.days[dateKey];
        if (!day || typeof day !== "object") return;
        const entries = Array.isArray(day.entries) ? day.entries.map(normalizeEntry).filter(Boolean) : [];
        const statusId = typeof day.statusId === "string" ? day.statusId : "daily";
        if (entries.length || Object.prototype.hasOwnProperty.call(day, "statusId")) {
          days[dateKey] = { statusId: statusId, entries: entries };
        }
      });
    }
    const normalizedProfile = {
      sex: profile.sex === "male" ? "male" : "female",
      age: cleanNumberString(profile.age, "25"),
      height: cleanNumberString(profile.height, "165"),
      bodyFat: cleanNumberString(profile.bodyFat, ""),
      formula: Object.prototype.hasOwnProperty.call(FORMULAS, profile.formula) ? profile.formula : "mifflin",
      proteinMin: cleanNumberString(profile.proteinMin, "60"),
      fatMin: cleanNumberString(profile.fatMin, "45"),
    };
    const latestFatRecord = latestBodyFatRecord(weights);
    if (!normalizedProfile.bodyFat && latestFatRecord) normalizedProfile.bodyFat = String(latestFatRecord.bodyFat);
    return {
      id: id,
      name: name,
      color: /^#[0-9a-fA-F]{6}$/.test(raw.color) ? raw.color : USER_COLORS[0],
      profile: normalizedProfile,
      weightRecords: weights,
      tray: tray,
      days: days,
    };
  }

  function latestBodyFatRecord(records) {
    return records.slice()
      .filter(function (record) { return record.bodyFat !== null && record.bodyFat !== undefined; })
      .sort(function (a, b) { return b.createdAt - a.createdAt; })[0] || null;
  }

  function normalizeCard(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 40) : "";
    if (!name) return null;
    return {
      id: safeId(raw.id) ? raw.id : uid("c"),
      name: name,
      emoji: typeof raw.emoji === "string" && raw.emoji ? raw.emoji.slice(0, 8) : "🍽️",
      category: Object.prototype.hasOwnProperty.call(CATEGORY_STYLES, raw.category) ? raw.category : "custom",
      basis: Object.prototype.hasOwnProperty.call(BASIS_META, raw.basis) ? raw.basis : "100g",
      energyKj: nonNegative(raw.energyKj, 0),
      protein: nonNegative(raw.protein, 0),
      fat: nonNegative(raw.fat, 0),
      carbs: nonNegative(raw.carbs, 0),
      servingSize: nonNegative(raw.servingSize, 0),
      servings: clamp(nonNegative(raw.servings, 1), 0.1, 99),
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
    };
  }

  function normalizeEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    const card = normalizeCard(raw);
    if (!card) return null;
    return card;
  }

  function normalizeWeight(raw) {
    if (!raw || typeof raw !== "object") return null;
    const weight = Number(raw.weight);
    if (!Number.isFinite(weight) || weight < 20 || weight > 400) return null;
    const date = isDateKey(raw.date) ? raw.date : todayKey();
    const bodyFat = Number(raw.bodyFat);
    const muscle = Number(raw.muscle);
    return {
      id: safeId(raw.id) ? raw.id : uid("w"),
      weight: roundTo(weight, 1),
      bodyFat: Number.isFinite(bodyFat) && bodyFat > 0 && bodyFat <= 70 ? roundTo(bodyFat, 1) : null,
      muscle: Number.isFinite(muscle) && muscle > 0 && muscle <= 150 ? roundTo(muscle, 1) : null,
      date: date,
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
    };
  }

  function normalizeStatus(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 16) : "";
    const factor = Number(raw.factor);
    if (!name || !Number.isFinite(factor) || factor < 0.8 || factor > 3) return null;
    return {
      id: safeId(raw.id) ? raw.id : uid("s"),
      name: name,
      factor: roundTo(factor, 3),
      color: /^#[0-9a-fA-F]{6}$/.test(raw.color) ? raw.color : STATUS_COLORS[1],
      custom: true,
    };
  }

  /* =========================================================
     Helpers
     ========================================================= */

  function activeUser() {
    return state.users.find(function (user) { return user.id === state.activeUserId; }) || state.users[0];
  }

  function getAllStatuses() {
    const removed = state.removedBuiltinStatusIds || [];
    return BUILTIN_STATUSES.filter(function (status) {
      return removed.indexOf(status.id) === -1;
    }).concat(state.customStatuses);
  }

  function getDefaultStatusId() {
    const statuses = getAllStatuses();
    const daily = statuses.find(function (status) { return status.id === "daily"; });
    return daily ? daily.id : (statuses[0] ? statuses[0].id : "daily");
  }

  function getStatus(id) {
    const statuses = getAllStatuses();
    return statuses.find(function (status) { return status.id === id; }) ||
      statuses.find(function (status) { return status.id === getDefaultStatusId(); }) ||
      { id: "daily", name: "日常状态", factor: 1.375, color: "#e8aa45", custom: false };
  }

  function getCurrentWeightRecord(user) {
    return user.weightRecords.slice().sort(function (a, b) { return b.createdAt - a.createdAt; })[0] || null;
  }

  function getCurrentWeight(user) {
    const latest = getCurrentWeightRecord(user);
    return latest ? latest.weight : 55;
  }

  function calculateProfile(user) {
    const profile = user.profile;
    const weight = getCurrentWeight(user);
    const sex = profile.sex === "male" ? "male" : "female";
    const age = Number(profile.age);
    const height = Number(profile.height);
    const bodyFat = Number(profile.bodyFat);
    const fieldsValid =
      Number.isFinite(age) && age >= 14 && age <= 100 &&
      Number.isFinite(height) && height >= 100 && height <= 250 &&
      Number.isFinite(weight) && weight >= 20 && weight <= 400;

    let bmr = null;
    let fallback = false;
    let formulaUsed = "";

    if (fieldsValid) {
      const mifflin = 10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161);
      const harris = sex === "male"
        ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
        : 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;

      if (profile.formula === "katch") {
        if (Number.isFinite(bodyFat) && bodyFat >= 3 && bodyFat <= 70) {
          bmr = 370 + 21.6 * (weight * (1 - bodyFat / 100));
          formulaUsed = FORMULAS.katch.label;
        } else {
          bmr = mifflin;
          formulaUsed = FORMULAS.mifflin.label;
          fallback = true;
        }
      } else if (profile.formula === "harris") {
        bmr = harris;
        formulaUsed = FORMULAS.harris.label;
      } else {
        bmr = mifflin;
        formulaUsed = FORMULAS.mifflin.label;
      }
    }

    if (bmr !== null && (!Number.isFinite(bmr) || bmr <= 0)) bmr = null;
    const bmi = fieldsValid ? weight / Math.pow(height / 100, 2) : null;

    return {
      bmr: bmr,
      bmi: bmi,
      weight: weight,
      fieldsValid: fieldsValid,
      fallback: fallback,
      formulaUsed: formulaUsed,
    };
  }

  function getDailyMinimums(user) {
    const proteinRaw = user.profile.proteinMin;
    const fatRaw = user.profile.fatMin;
    const protein = proteinRaw === "" || proteinRaw === null || proteinRaw === undefined ? 60 : Number(proteinRaw);
    const fat = fatRaw === "" || fatRaw === null || fatRaw === undefined ? 45 : Number(fatRaw);
    return {
      protein: Number.isFinite(protein) && protein >= 0 ? protein : 60,
      fat: Number.isFinite(fat) && fat >= 0 ? fat : 45,
    };
  }

  function dayTargetMarkup(key, label, actual, target) {
    const unset = !Number.isFinite(target) || target <= 0;
    const pct = unset ? 0 : clamp((actual / target) * 100, 0, 100);
    const excess = unset ? 0 : (actual / target - 1) * 100;
    const met = !unset && actual >= target - 0.05;
    const warning = key === "fat" && excess > 5 && excess <= 10;
    const over = key === "fat" && excess > 10;
    const excessTitle = warning || over ? ' title="超出每日最低脂肪 ' + fmtDecimal(excess) + '%"' : "";
    return '<div class="day-target ' + key + (met ? " is-met" : "") + (warning ? " is-warning" : "") + (over ? " is-over" : "") + (unset ? " is-unset" : "") + '"' + excessTitle + '>' +
      '<div class="day-target-head"><span>' + label + '</span><strong>' +
        (unset ? "未设" : fmtDecimal(actual) + " / " + fmtQty(target) + "g" + (met ? " ✓" : "")) +
      '</strong></div>' +
      '<span class="day-target-track"><i style="width:' + pct + '%"></i></span>' +
    '</div>';
  }

  function calcNutrition(item) {
    const servings = clamp(nonNegative(item.servings, 0), 0, 99);
    const servingSize = nonNegative(item.servingSize, 0);
    const factor = item.basis === "serving" ? servings : (servings * servingSize) / 100;
    const kj = nonNegative(item.energyKj, 0) * factor;
    return {
      factor: factor,
      kj: kj,
      kcal: kj * KCAL_PER_KJ,
      protein: nonNegative(item.protein, 0) * factor,
      fat: nonNegative(item.fat, 0) * factor,
      carbs: nonNegative(item.carbs, 0) * factor,
      amount: servings * servingSize,
    };
  }

  function sumNutrition(items) {
    return items.reduce(function (totals, item) {
      const result = calcNutrition(item);
      totals.kcal += result.kcal;
      totals.kj += result.kj;
      totals.protein += result.protein;
      totals.fat += result.fat;
      totals.carbs += result.carbs;
      return totals;
    }, { kcal: 0, kj: 0, protein: 0, fat: 0, carbs: 0 });
  }

  function calculateDay(dateKey) {
    const user = activeUser();
    const profile = calculateProfile(user);
    const day = user.days[dateKey] || null;
    const entries = day && Array.isArray(day.entries) ? day.entries : [];
    const status = getStatus(day && day.statusId ? day.statusId : getDefaultStatusId());
    const totals = sumNutrition(entries);
    const tdee = profile.bmr !== null ? profile.bmr * status.factor : null;
    const logged = entries.length > 0;
    return {
      dateKey: dateKey,
      date: parseDateKey(dateKey),
      user: user,
      profile: profile,
      day: day,
      entries: entries,
      status: status,
      totals: totals,
      tdee: tdee,
      logged: logged,
      balance: logged && tdee !== null ? totals.kcal - tdee : null,
    };
  }

  function getWeekSummaries(anchorDate) {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, function (_, index) {
      return calculateDay(dateToKey(addDays(start, index)));
    });
  }

  function summarizeDays(days) {
    const loggedDays = days.filter(function (day) { return day.logged; });
    const totals = loggedDays.reduce(function (acc, day) {
      acc.kcal += day.totals.kcal;
      acc.protein += day.totals.protein;
      acc.fat += day.totals.fat;
      acc.carbs += day.totals.carbs;
      acc.tdee += day.tdee || 0;
      return acc;
    }, { kcal: 0, protein: 0, fat: 0, carbs: 0, tdee: 0 });
    return {
      days: days,
      loggedDays: loggedDays,
      count: loggedDays.length,
      totals: totals,
      averageIntake: loggedDays.length ? totals.kcal / loggedDays.length : null,
      averageTdee: loggedDays.length ? totals.tdee / loggedDays.length : null,
      balance: loggedDays.length ? totals.kcal - totals.tdee : null,
    };
  }

  function findTrayCard(id) {
    return activeUser().tray.find(function (card) { return card.id === id; }) || null;
  }

  function findEntry(dateKey, id) {
    const user = activeUser();
    const day = user.days[dateKey];
    if (!day) return null;
    return day.entries.find(function (entry) { return entry.id === id; }) || null;
  }

  function ensureDay(dateKey) {
    const user = activeUser();
    if (!user.days[dateKey]) user.days[dateKey] = { statusId: getDefaultStatusId(), entries: [] };
    if (!Array.isArray(user.days[dateKey].entries)) user.days[dateKey].entries = [];
    return user.days[dateKey];
  }

  function makeEntryFromCard(card, servings) {
    return {
      id: uid("e"),
      name: card.name,
      emoji: card.emoji,
      category: card.category,
      basis: card.basis,
      energyKj: card.energyKj,
      protein: card.protein,
      fat: card.fat,
      carbs: card.carbs,
      servingSize: card.servingSize,
      servings: servings || card.servings || 1,
      createdAt: Date.now(),
    };
  }

  function uid(prefix) {
    return (prefix || "x") + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function safeId(value) {
    return typeof value === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(value);
  }

  function cleanNumberString(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return fallback;
    return String(value);
  }

  function nonNegative(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function roundTo(value, digits) {
    const power = Math.pow(10, digits);
    return Math.round((value + Number.EPSILON) * power) / power;
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function dateToKey(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  function todayKey() {
    return dateToKey(new Date());
  }

  function parseDateKey(key) {
    const parts = String(key).split("-").map(Number);
    if (parts.length !== 3 || parts.some(function (part) { return !Number.isFinite(part); })) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function isDateKey(key) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(key)) && dateToKey(parseDateKey(key)) === key;
  }

  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  function startOfWeek(date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const offset = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - offset);
    return copy;
  }

  function isCurrentWeek(date) {
    return dateToKey(startOfWeek(date)) === dateToKey(startOfWeek(new Date()));
  }

  function formatShortDate(key) {
    const date = parseDateKey(key);
    return (date.getMonth() + 1) + "月" + date.getDate() + "日";
  }

  function formatRange(start, end) {
    return (start.getMonth() + 1) + "月" + start.getDate() + "日 — " + (end.getMonth() + 1) + "月" + end.getDate() + "日";
  }

  function formatWeightDate(record) {
    const date = parseDateKey(record.date);
    const created = new Date(record.createdAt);
    return (date.getMonth() + 1) + "/" + date.getDate() + " " + pad2(created.getHours()) + ":" + pad2(created.getMinutes());
  }

  function fmtInt(value) {
    return Number.isFinite(value) ? numberFormatter.format(Math.round(value)) : "—";
  }

  function fmtDecimal(value) {
    return Number.isFinite(value) ? decimalFormatter.format(value) : "—";
  }

  function fmtQty(value) {
    return Number.isFinite(value) ? quantityFormatter.format(value) : "—";
  }

  function fmtSigned(value) {
    if (!Number.isFinite(value)) return "—";
    const rounded = Math.round(value);
    if (rounded === 0) return "0";
    return (rounded > 0 ? "+" : "−") + numberFormatter.format(Math.abs(rounded));
  }

  function fmtPercent(value) {
    if (!Number.isFinite(value) || value <= 0) return "0%";
    if (value < 1) return "<1%";
    return Math.round(value) + "%";
  }

  function formatEditableNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? String(roundTo(number, 2)) : "0";
  }

  function hexToRgba(hex, alpha) {
    const clean = String(hex).replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "rgba(232, 170, 69, " + alpha + ")";
    return "rgba(" + parseInt(clean.slice(0, 2), 16) + ", " + parseInt(clean.slice(2, 4), 16) + ", " + parseInt(clean.slice(4, 6), 16) + ", " + alpha + ")";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  /* =========================================================
     Week UI
     ========================================================= */

  function shiftWeek(delta) {
    setWeekDate(dateToKey(addDays(parseDateKey(viewDate), delta * 7)));
  }

  function setWeekDate(key) {
    if (!isDateKey(key)) return;
    viewDate = key;
    updateWeekUI();
    renderAll();
  }

  function updateWeekUI() {
    const start = startOfWeek(parseDateKey(viewDate));
    const end = addDays(start, 6);
    const range = formatRange(start, end);
    el.weekRange.textContent = range;
    el.tableWeekRange.textContent = range;
    el.datePicker.value = viewDate;
    el.todayWeekBtn.hidden = isCurrentWeek(parseDateKey(viewDate));
    document.title = "食刻 · " + range;
  }

  function openNativeDatePicker() {
    if (typeof el.datePicker.showPicker === "function") {
      try {
        el.datePicker.showPicker();
      } catch (error) {
        el.datePicker.focus();
      }
    } else {
      el.datePicker.focus();
      el.datePicker.click();
    }
  }

  /* =========================================================
     Rendering
     ========================================================= */

  function renderAll() {
    const user = activeUser();
    el.userAvatar.textContent = user.name.slice(0, 1);
    el.userAvatar.style.background = user.color;
    el.userName.textContent = user.name;

    renderOverview();
    renderTable();
    renderTray();
    renderCompare();
    if (el.profileDialog.open) {
      el.drawerUserName.textContent = user.name;
      renderUserList();
      renderWeightSection();
      renderStatusSection();
      renderProfileResults();
    }
  }

  function renderOverview() {
    const day = calculateDay(viewDate);
    const totals = day.totals;
    const weekday = WEEKDAY_LONG[(day.date.getDay() + 6) % 7];
    const isToday = day.dateKey === todayKey();
    const proteinCal = totals.protein * 4;
    const fatCal = totals.fat * 9;
    const carbsCal = totals.carbs * 4;
    const macroCal = proteinCal + fatCal + carbsCal;
    const pPct = macroCal > 0 ? proteinCal / macroCal : 0;
    const fPct = macroCal > 0 ? fatCal / macroCal : 0;
    const cPct = macroCal > 0 ? carbsCal / macroCal : 0;

    el.overviewDayLabel.textContent = weekday + " · " + formatShortDate(viewDate);
    el.donutPeriodLabel.textContent = isToday ? "今日" : weekday;
    el.weekIntake.textContent = fmtInt(totals.kcal);
    el.weekTdee.textContent = day.tdee !== null ? fmtInt(day.tdee) : "—";
    el.dayEntries.textContent = day.entries.length;
    el.donutKcal.textContent = fmtInt(totals.kcal);

    el.weekBalanceCard.classList.remove("is-deficit", "is-surplus", "is-even");
    if (day.balance === null) {
      el.weekBalance.textContent = "—";
      el.weekBalanceNote.textContent = "记录后计算";
    } else {
      const rounded = Math.round(day.balance);
      el.weekBalance.textContent = fmtSigned(day.balance);
      el.weekBalanceNote.textContent = "千卡 · " + (rounded < 0 ? "缺口" : rounded > 0 ? "盈余" : "持平");
      el.weekBalanceCard.classList.add(rounded < 0 ? "is-deficit" : rounded > 0 ? "is-surplus" : "is-even");
    }

    el.donutProtein.style.strokeDasharray = (pPct * DONUT_CIRCUMFERENCE) + " " + DONUT_CIRCUMFERENCE;
    el.donutProtein.style.strokeDashoffset = "0";
    el.donutFat.style.strokeDasharray = (fPct * DONUT_CIRCUMFERENCE) + " " + DONUT_CIRCUMFERENCE;
    el.donutFat.style.strokeDashoffset = String(-pPct * DONUT_CIRCUMFERENCE);
    el.donutCarbs.style.strokeDasharray = (cPct * DONUT_CIRCUMFERENCE) + " " + DONUT_CIRCUMFERENCE;
    el.donutCarbs.style.strokeDashoffset = String(-(pPct + fPct) * DONUT_CIRCUMFERENCE);
    el.macroDonut.setAttribute("aria-label", "当日蛋白质 " + fmtPercent(pPct * 100) + "，脂肪 " + fmtPercent(fPct * 100) + "，碳水 " + fmtPercent(cPct * 100));

    const rows = [
      { key: "protein", label: "蛋白质", pct: pPct * 100, grams: totals.protein },
      { key: "fat", label: "脂肪", pct: fPct * 100, grams: totals.fat },
      { key: "carbs", label: "碳水", pct: cPct * 100, grams: totals.carbs },
    ];
    el.macroLegend.innerHTML = rows.map(function (row) {
      return '<div class="macro-legend-item ' + row.key + '">' +
        '<i></i><span>' + row.label + '</span><strong>' + fmtPercent(row.pct) + '</strong>' +
        '<small>' + fmtDecimal(row.grams) + ' g</small>' +
      '</div>';
    }).join("");

    el.macroBars.innerHTML = rows.map(function (row) {
      const width = clamp(row.pct, 0, 100);
      return '<div class="macro-bar-row ' + row.key + '">' +
        '<span class="macro-bar-label">' + row.label + '</span>' +
        '<span class="macro-bar-track" aria-hidden="true"><i class="macro-bar-fill" style="width:' + width + '%"></i></span>' +
        '<strong class="macro-bar-value">' + fmtPercent(row.pct) + '</strong>' +
        '<small class="macro-bar-grams">' + fmtDecimal(row.grams) + ' g</small>' +
      '</div>';
    }).join("");
  }

  function renderTable() {
    const days = getWeekSummaries(parseDateKey(viewDate));
    el.dayColumns.innerHTML = days.map(function (day) {
      return dayColumnMarkup(day);
    }).join("");
    const stats = summarizeDays(days);
    el.weekTotals.innerHTML = weekTotalsMarkup(stats);
  }

  function dayColumnMarkup(day) {
    const weekday = WEEKDAY_LONG[(day.date.getDay() + 6) % 7];
    const isToday = day.dateKey === todayKey();
    const isOverview = day.dateKey === viewDate;
    const statusId = getStatus(day.status ? day.status.id : getDefaultStatusId()).id;
    const entries = day.entries;
    const entriesMarkup = entries.map(function (entry) {
      return dayEntryMarkup(entry, day.dateKey);
    }).join("");
    const emptyMarkup = entries.length
      ? '<div class="day-empty day-empty--small" title="从托盘拖入食物">＋</div>'
      : '<div class="day-empty" title="从托盘拖入食物">＋</div>';
    const minimums = getDailyMinimums(day.user);
    const intake = day.logged ? fmtInt(day.totals.kcal) : "—";
    const tdee = day.tdee !== null ? fmtInt(day.tdee) : "—";
    const balance = day.balance !== null ? fmtSigned(day.balance) : "—";
    const balanceClass = day.balance === null ? "" : day.balance <= 0 ? "is-deficit" : "is-surplus";

    return '<section class="day-column' + (isToday ? " is-today" : "") + (isOverview ? " is-overview" : "") + '" data-day-column="' + day.dateKey + '" style="--status-color:' + escapeHtml(day.status.color) + ';--day-tint:' + hexToRgba(day.status.color, 0.15) + ';">' +
      '<header class="day-head">' +
        '<button type="button" class="day-title" data-select-day="' + day.dateKey + '" title="查看当日概览"><span>' + weekday + '</span><strong>' + day.date.getDate() + '</strong></button>' +
        '<div class="day-status-row">' +
          '<label class="day-status-wrap">' +
            '<select class="day-status" data-day-status="' + day.dateKey + '" aria-label="' + weekday + '状态">' +
              statusOptionsMarkup(statusId) +
            '</select>' +
            '<svg class="icon"><use href="#i-chevron-down"></use></svg>' +
          '</label>' +
          '<button type="button" class="day-status-clear" data-day-status-clear="' + day.dateKey + '" title="清除状态" aria-label="清除' + weekday + '状态">×</button>' +
        '</div>' +
        '<span class="day-tdee">TDEE ' + tdee + '</span>' +
      '</header>' +
      '<div class="day-dropzone" data-day-drop="' + day.dateKey + '">' +
        entriesMarkup + emptyMarkup +
      '</div>' +
      '<footer class="day-summary">' +
        '<div class="day-targets">' +
          dayTargetMarkup("protein", "蛋白", day.totals.protein, minimums.protein) +
          dayTargetMarkup("fat", "脂肪", day.totals.fat, minimums.fat) +
        '</div>' +
        '<div class="day-summary-row"><span>摄入</span><strong>' + intake + '</strong></div>' +
        '<div class="day-summary-row"><span>TDEE</span><strong>' + tdee + '</strong></div>' +
        '<div class="day-summary-row is-balance ' + balanceClass + '"><span>热量盈余</span><strong>' + balance + '</strong></div>' +
      '</footer>' +
    '</section>';
  }

  function statusOptionsMarkup(selectedId) {
    return getAllStatuses().map(function (status) {
      return '<option value="' + escapeHtml(status.id) + '"' + (status.id === selectedId ? " selected" : "") + '>' + escapeHtml(status.name) + '</option>';
    }).join("");
  }

  function dayEntryMarkup(entry, dateKey) {
    const totals = calcNutrition(entry);
    const category = CATEGORY_STYLES[entry.category] || CATEGORY_STYLES.custom;
    const name = escapeHtml(entry.name);
    const amountText = entry.basis === "serving"
      ? (totals.amount > 0 ? fmtQty(totals.amount) + " g" : "按份")
      : fmtQty(totals.amount) + (entry.basis === "100ml" ? " ml" : " g");
    return '<article class="day-food" data-entry-card="' + escapeHtml(entry.id) + '" data-date="' + dateKey + '" style="--entry-accent:' + category.accent + ';">' +
      '<div class="day-food-top">' +
        '<div class="day-food-name"><span>' + escapeHtml(entry.emoji) + '</span><strong title="' + name + '">' + name + '</strong></div>' +
        '<button type="button" class="day-food-delete" data-entry-delete aria-label="删除 ' + name + '">×</button>' +
      '</div>' +
      '<div class="day-food-energy"><strong>' + fmtInt(totals.kcal) + '</strong><span>千卡</span></div>' +
      '<div class="day-food-meta">' + fmtQty(entry.servings) + ' 份 · ' + amountText + '</div>' +
      '<div class="day-food-bottom">' +
        '<div class="entry-stepper">' +
          '<button type="button" data-entry-dec aria-label="减少份数">−</button>' +
          '<span>' + fmtQty(entry.servings) + ' 份</span>' +
          '<button type="button" data-entry-inc aria-label="增加份数">+</button>' +
        '</div>' +
        '<span class="day-food-macros">P ' + fmtDecimal(totals.protein) + ' · F ' + fmtDecimal(totals.fat) + '</span>' +
      '</div>' +
    '</article>';
  }

  function weekTotalsMarkup(stats) {
    const totals = stats.totals;
    const balance = stats.balance;
    return '<span class="week-totals-label">本周</span>' +
      '<strong>' + fmtInt(totals.kcal) + '<small> 千卡</small></strong>' +
      '<span>TDEE <b>' + (stats.count ? fmtInt(totals.tdee) : "—") + '</b></span>' +
      '<span>蛋白质 <b>' + fmtDecimal(totals.protein) + 'g</b></span>' +
      '<span>脂肪 <b>' + fmtDecimal(totals.fat) + 'g</b></span>' +
      '<span class="total-balance ' + (balance === null ? "" : balance <= 0 ? "is-deficit" : "is-surplus") + '">' +
        (balance === null ? "—" : "热量盈余 " + fmtSigned(balance)) +
      '</span>';
  }

  function renderTray() {
    const user = activeUser();
    el.trayCount.textContent = user.tray.length + " 张";
    if (!user.tray.length) {
      el.trayList.innerHTML = '<button type="button" class="tray-add-empty" data-tray-add>＋ 添加食物卡片</button>';
      return;
    }
    el.trayList.innerHTML = user.tray.map(function (card) {
      const totals = calcNutrition(card);
      const category = CATEGORY_STYLES[card.category] || CATEGORY_STYLES.custom;
      const name = escapeHtml(card.name);
      const unit = BASIS_META[card.basis].unit;
      const perServing = card.basis === "serving"
        ? (card.servingSize > 0 ? "每份 " + fmtQty(card.servingSize) + " g" : "按份")
        : "每 " + (card.basis === "100ml" ? "100 ml" : "100 g");
      return '<article class="tray-card" data-tray-card="' + escapeHtml(card.id) + '" style="--card-accent:' + category.accent + ';" title="拖到日期列">' +
        '<div class="tray-card-top">' +
          '<button type="button" class="drag-handle" data-drag-handle aria-label="拖动 ' + name + '" title="拖到日期列">' +
            '<svg class="icon"><use href="#i-grip"></use></svg>' +
          '</button>' +
          '<span class="tray-emoji">' + escapeHtml(card.emoji) + '</span>' +
          '<div class="tray-name"><strong title="' + name + '">' + name + '</strong><small>' + perServing + '</small></div>' +
        '</div>' +
        '<div class="tray-card-main">' +
          '<div class="tray-energy"><strong>' + fmtInt(totals.kcal) + '</strong><span>千卡</span></div>' +
          '<span class="tray-macros">P ' + fmtDecimal(totals.protein) + ' · F ' + fmtDecimal(totals.fat) + '</span>' +
        '</div>' +
        '<div class="tray-card-bottom">' +
          '<div class="tray-serving">' +
            '<button type="button" data-tray-dec aria-label="减少份数">−</button>' +
            '<span>' + fmtQty(card.servings) + ' 份</span>' +
            '<button type="button" data-tray-inc aria-label="增加份数">+</button>' +
          '</div>' +
          '<div class="tray-actions">' +
            '<button type="button" class="mini-action" data-tray-edit aria-label="编辑 ' + name + '" title="编辑"><svg class="icon"><use href="#i-edit"></use></svg></button>' +
            '<button type="button" class="mini-action mini-action--danger" data-tray-delete aria-label="删除 ' + name + '" title="删除"><svg class="icon"><use href="#i-trash"></use></svg></button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join("");
  }

  function renderCompare() {
    const currentDays = getWeekSummaries(parseDateKey(viewDate));
    const lastDays = getWeekSummaries(addDays(startOfWeek(parseDateKey(viewDate)), -7));
    const currentStats = summarizeDays(currentDays);
    const lastStats = summarizeDays(lastDays);
    const currentValues = currentDays.map(function (day) { return day.logged ? day.totals.kcal : 0; });
    const lastValues = lastDays.map(function (day) { return day.logged ? day.totals.kcal : 0; });
    const maxValue = Math.max(1, Math.max.apply(null, currentValues.concat(lastValues)));

    el.compareChart.innerHTML = currentDays.map(function (day, index) {
      const currentHeight = clamp((currentValues[index] / maxValue) * 100, 1, 100);
      const lastHeight = clamp((lastValues[index] / maxValue) * 100, 1, 100);
      return '<div class="compare-day" title="' + WEEKDAY_LONG[(day.date.getDay() + 6) % 7] + '：本周 ' + fmtInt(currentValues[index]) + ' 千卡，上周 ' + fmtInt(lastValues[index]) + ' 千卡">' +
        '<div class="compare-bars">' +
          '<span class="compare-bar last" style="height:' + lastHeight + '%"></span>' +
          '<span class="compare-bar now" style="height:' + currentHeight + '%"></span>' +
        '</div>' +
        '<span>' + WEEKDAY_SHORT[(day.date.getDay() + 6) % 7] + '</span>' +
      '</div>';
    }).join("");

    const delta = currentStats.averageIntake !== null && lastStats.averageIntake
      ? ((currentStats.averageIntake - lastStats.averageIntake) / lastStats.averageIntake) * 100
      : null;
    const deltaClass = delta === null ? "is-even" : delta > 0 ? "is-up" : delta < 0 ? "is-down" : "is-even";
    const deltaText = delta === null ? "—" : (delta > 0 ? "+" : "") + Math.round(delta) + "%";

    el.compareStats.innerHTML = '<div class="compare-legend"><span><i class="last"></i>上周</span><span><i class="now"></i>本周</span></div>' +
      '<div class="compare-stat-row"><span>日均摄入</span><strong>' + (currentStats.averageIntake !== null ? fmtInt(currentStats.averageIntake) : "—") + ' / ' + (lastStats.averageIntake !== null ? fmtInt(lastStats.averageIntake) : "—") + '</strong><span class="delta ' + deltaClass + '">' + deltaText + '</span></div>' +
      '<div class="compare-stat-row"><span>记录天数</span><strong>' + currentStats.count + ' / ' + lastStats.count + '</strong></div>' +
      '<div class="compare-stat-row"><span>热量差额</span><strong>' + (currentStats.balance !== null ? fmtSigned(currentStats.balance) : "—") + ' / ' + (lastStats.balance !== null ? fmtSigned(lastStats.balance) : "—") + '</strong></div>';
  }

  /* =========================================================
     Table interactions
     ========================================================= */

  function handleDayStatusChange(event) {
    const select = event.target.closest("[data-day-status]");
    if (!select) return;
    const day = ensureDay(select.dataset.dayStatus);
    day.statusId = getStatus(select.value).id;
    saveState();
    renderOverview();
    renderTable();
    renderCompare();
  }

  async function clearWeekStatuses() {
    const days = getWeekSummaries(parseDateKey(viewDate));
    const defaultId = getDefaultStatusId();
    const hasCustom = days.some(function (day) { return day.day && day.status && day.status.id !== defaultId; });
    if (!hasCustom) {
      showToast("本周没有可清除的状态");
      return;
    }
    const confirmed = await askConfirm("把本周所有日期恢复为默认状态？", {
      title: "清除本周状态",
      confirmText: "清除",
    });
    if (!confirmed) return;
    days.forEach(function (day) {
      const userDay = activeUser().days[day.dateKey];
      if (userDay) userDay.statusId = defaultId;
    });
    saveState();
    renderAll();
    showToast("已清除本周状态");
  }

  async function handleDayClick(event) {
    const selectDay = event.target.closest("[data-select-day]");
    if (selectDay) {
      setWeekDate(selectDay.dataset.selectDay);
      return;
    }

    const clearStatus = event.target.closest("[data-day-status-clear]");
    if (clearStatus) {
      const day = activeUser().days[clearStatus.dataset.dayStatusClear];
      if (!day) return;
      day.statusId = getDefaultStatusId();
      saveState();
      renderAll();
      showToast("已清除状态");
      return;
    }

    const deleteButton = event.target.closest("[data-entry-delete]");
    const incButton = event.target.closest("[data-entry-inc]");
    const decButton = event.target.closest("[data-entry-dec]");
    const card = event.target.closest("[data-entry-card]");
    if (card) {
      const dateKey = card.dataset.date;
      const entryId = card.dataset.entryCard;
      const entry = findEntry(dateKey, entryId);
      if (!entry) return;
      if (deleteButton) {
        const confirmed = await askConfirm("从这一天移除「" + entry.name + "」？", {
          title: "移除食物",
          confirmText: "移除",
        });
        if (!confirmed) return;
        const current = findEntry(dateKey, entryId);
        if (!current) return;
        const day = activeUser().days[dateKey];
        if (!day) return;
        day.entries = day.entries.filter(function (item) { return item.id !== entryId; });
        if (!day.entries.length && getStatus(day.statusId).id === getDefaultStatusId()) delete activeUser().days[dateKey];
        saveState();
        renderAll();
        showToast("已移除「" + entry.name + "」");
        return;
      }
      if (incButton || decButton) {
        entry.servings = roundTo(clamp(Number(entry.servings) + (incButton ? 0.5 : -0.5), 0.1, 99), 2);
        saveState();
        renderAll();
        return;
      }
    }
  }

  function addCardToDay(cardId, dateKey, targetEntryId, after) {
    const card = findTrayCard(cardId);
    if (!card) return;
    const day = ensureDay(dateKey);
    const entry = makeEntryFromCard(card, card.servings);
    let insertIndex = day.entries.length;
    if (targetEntryId) {
      const targetIndex = day.entries.findIndex(function (item) { return item.id === targetEntryId; });
      if (targetIndex !== -1) insertIndex = after ? targetIndex + 1 : targetIndex;
    }
    day.entries.splice(insertIndex, 0, entry);
    saveState();
    renderAll();
    showToast("已加入 " + (dateKey === todayKey() ? "今天" : formatShortDate(dateKey)));
  }

  /* =========================================================
     Tray interactions
     ========================================================= */

  async function handleTrayClick(event) {
    const addEmpty = event.target.closest("[data-tray-add]");
    if (addEmpty) {
      openFoodDialog();
      return;
    }
    const cardEl = event.target.closest("[data-tray-card]");
    if (!cardEl) return;
    const card = findTrayCard(cardEl.dataset.trayCard);
    if (!card) return;

    const edit = event.target.closest("[data-tray-edit]");
    const remove = event.target.closest("[data-tray-delete]");
    const inc = event.target.closest("[data-tray-inc]");
    const dec = event.target.closest("[data-tray-dec]");
    if (edit) {
      openFoodDialog(card.id);
      return;
    }
    if (remove) {
      const confirmed = await askConfirm("删除托盘中的「" + card.name + "」？已经放入日期的记录不会删除。", {
        title: "删除食物卡片",
      });
      if (!confirmed) return;
      const current = findTrayCard(card.id);
      if (!current) return;
      const user = activeUser();
      user.tray = user.tray.filter(function (item) { return item.id !== card.id; });
      saveState();
      renderTray();
      showToast("已删除「" + card.name + "」");
      return;
    }
    if (inc || dec) {
      card.servings = roundTo(clamp(Number(card.servings) + (inc ? 0.5 : -0.5), 0.1, 99), 2);
      saveState();
      renderTray();
    }
  }

  /* =========================================================
     Drag from tray
     ========================================================= */

  function handleDragStart(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const cardEl = event.target.closest("[data-tray-card]");
    if (!cardEl) return;
    const handle = event.target.closest("[data-drag-handle]");
    if (event.target.closest("button:not([data-drag-handle]), input, select, textarea")) return;
    if (event.pointerType !== "mouse" && !handle) return;
    const card = findTrayCard(cardEl.dataset.trayCard);
    if (!card) return;
    event.preventDefault();

    dragState = {
      pointerId: event.pointerId,
      cardId: card.id,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      active: false,
      sourceEl: cardEl,
      ghost: null,
      drop: null,
      autoScrollFrame: null,
    };
    document.addEventListener("pointermove", handleDragMove, { passive: false });
    document.addEventListener("pointerup", handleDragEnd);
    document.addEventListener("pointercancel", handleDragCancel);
  }

  function handleDragMove(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    dragState.lastX = event.clientX;
    dragState.lastY = event.clientY;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (!dragState.active && Math.sqrt(dx * dx + dy * dy) < 5) return;
    event.preventDefault();
    if (!dragState.active) activateDrag();
    dragState.ghost.style.transform = "translate3d(" + (event.clientX + 14) + "px, " + (event.clientY + 14) + "px, 0)";
    updateDropHighlight(event.clientX, event.clientY);
  }

  function activateDrag() {
    dragState.active = true;
    document.body.classList.add("is-dragging");
    dragState.sourceEl.classList.add("is-drag-source");
    const card = findTrayCard(dragState.cardId);
    if (!card) return;
    const category = CATEGORY_STYLES[card.category] || CATEGORY_STYLES.custom;
    const totals = calcNutrition(card);
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.style.setProperty("--ghost-accent", category.accent);
    ghost.innerHTML = '<span>' + escapeHtml(card.emoji) + '</span>' +
      '<div><strong>' + escapeHtml(card.name) + '</strong><small>' + fmtQty(card.servings) + ' 份 · ' + fmtInt(totals.kcal) + ' 千卡</small></div>';
    document.body.appendChild(ghost);
    dragState.ghost = ghost;
    ghost.style.transform = "translate3d(" + (dragState.lastX + 14) + "px, " + (dragState.lastY + 14) + "px, 0)";
    startAutoScroll();
  }

  function startAutoScroll() {
    if (!dragState || dragState.autoScrollFrame) return;
    const step = function () {
      if (!dragState) return;
      const x = dragState.lastX;
      const y = dragState.lastY;
      const edge = 70;
      let scrolled = false;
      let dy = 0;
      if (y < edge) dy = -Math.ceil((edge - y) / 4);
      else if (y > window.innerHeight - edge) dy = Math.ceil((y - (window.innerHeight - edge)) / 4);
      if (dy) {
        window.scrollBy(0, dy);
        scrolled = true;
      }

      const table = document.querySelector(".week-table-scroll");
      if (table) {
        const rect = table.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          let dx = 0;
          if (x < rect.left + edge) dx = -Math.ceil((rect.left + edge - x) / 4);
          else if (x > rect.right - edge) dx = Math.ceil((x - (rect.right - edge)) / 4);
          if (dx) {
            table.scrollLeft += dx;
            scrolled = true;
          }
        }
      }

      if (scrolled) updateDropHighlight(x, y);
      dragState.autoScrollFrame = window.requestAnimationFrame(step);
    };
    dragState.autoScrollFrame = window.requestAnimationFrame(step);
  }

  function findDropTarget(x, y) {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;
    const entryEl = element.closest("[data-entry-card]");
    const zone = element.closest("[data-day-drop]");
    if (!entryEl && !zone) return null;
    const dateKey = entryEl ? entryEl.dataset.date : zone.dataset.dayDrop;
    let before = false;
    if (entryEl) {
      const rect = entryEl.getBoundingClientRect();
      before = y < rect.top + rect.height / 2;
    }
    return {
      dateKey: dateKey,
      targetEntryId: entryEl ? entryEl.dataset.entryCard : null,
      before: before,
      zone: zone,
      entryEl: entryEl,
    };
  }

  function updateDropHighlight(x, y) {
    clearDropHighlight();
    const drop = findDropTarget(x, y);
    dragState.drop = drop;
    if (!drop) return;
    if (drop.zone) drop.zone.classList.add("is-drop-target");
    if (drop.entryEl) drop.entryEl.classList.add(drop.before ? "is-drop-before" : "is-drop-after");
  }

  function clearDropHighlight() {
    document.querySelectorAll(".is-drop-target, .is-drop-before, .is-drop-after").forEach(function (node) {
      node.classList.remove("is-drop-target", "is-drop-before", "is-drop-after");
    });
  }

  function handleDragEnd(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const stateAtEnd = dragState;
    const drop = stateAtEnd.active ? findDropTarget(event.clientX, event.clientY) : null;
    cleanupDrag();
    if (stateAtEnd.active && drop) {
      addCardToDay(stateAtEnd.cardId, drop.dateKey, drop.targetEntryId, !drop.before);
    }
  }

  function handleDragCancel(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    cleanupDrag();
  }

  function cleanupDrag() {
    if (!dragState) return;
    if (dragState.autoScrollFrame) window.cancelAnimationFrame(dragState.autoScrollFrame);
    if (dragState.ghost) dragState.ghost.remove();
    if (dragState.sourceEl) dragState.sourceEl.classList.remove("is-drag-source");
    document.body.classList.remove("is-dragging");
    clearDropHighlight();
    document.removeEventListener("pointermove", handleDragMove);
    document.removeEventListener("pointerup", handleDragEnd);
    document.removeEventListener("pointercancel", handleDragCancel);
    dragState = null;
  }

  /* =========================================================
     Profile drawer
     ========================================================= */

  function openProfile(focusStatus) {
    syncProfileForm();
    renderUserList();
    renderWeightSection();
    renderStatusSection();
    renderProfileResults();
    el.profileDialog.showModal();
    syncBodyDialogState();
    el.drawerScroll.scrollTop = 0;
    if (focusStatus) {
      window.setTimeout(function () {
        el.statusSection.scrollIntoView({ block: "start", behavior: "smooth" });
        showStatusForm();
        el.statusName.focus();
      }, 80);
    }
  }

  function closeProfile() {
    if (el.profileDialog.open) el.profileDialog.close();
  }

  function syncProfileForm() {
    const user = activeUser();
    const sexRadio = document.querySelector('input[name="profileSex"][value="' + user.profile.sex + '"]');
    if (sexRadio) sexRadio.checked = true;
    el.ageInput.value = user.profile.age;
    el.heightInput.value = user.profile.height;
    el.bodyFatInput.value = user.profile.bodyFat;
    el.formulaSelect.value = user.profile.formula;
    el.proteinMinInput.value = user.profile.proteinMin;
    el.fatMinInput.value = user.profile.fatMin;
    el.drawerUserName.textContent = user.name;
    el.currentWeightLabel.textContent = fmtDecimal(getCurrentWeight(user)) + " kg";
    if (!el.weightDate.value) el.weightDate.value = todayKey();
  }

  function renderProfileResults() {
    const user = activeUser();
    const profile = calculateProfile(user);
    el.currentWeightLabel.textContent = fmtDecimal(profile.weight) + " kg";
    el.profileBmr.textContent = profile.bmr !== null ? fmtInt(profile.bmr) : "—";
    el.profileBmi.textContent = profile.bmi !== null ? fmtDecimal(profile.bmi) : "—";
    const status = getStatus((user.days[todayKey()] && user.days[todayKey()].statusId) || getDefaultStatusId());
    el.profileTdee.textContent = profile.bmr !== null ? fmtInt(profile.bmr * status.factor) : "—";
  }

  function handleProfileInput(event) {
    const fieldMap = {
      ageInput: "age",
      heightInput: "height",
      bodyFatInput: "bodyFat",
      proteinMinInput: "proteinMin",
      fatMinInput: "fatMin",
    };
    const field = fieldMap[event.target.id];
    if (!field) return;
    activeUser().profile[field] = event.target.value;
    saveState();
    renderProfileResults();
    renderOverview();
    renderTable();
    renderCompare();
  }

  function handleProfileChange(event) {
    if (event.target.name === "profileSex") {
      activeUser().profile.sex = event.target.value === "male" ? "male" : "female";
    } else if (event.target.id === "formulaSelect") {
      activeUser().profile.formula = Object.prototype.hasOwnProperty.call(FORMULAS, event.target.value) ? event.target.value : "mifflin";
    } else {
      return;
    }
    saveState();
    renderProfileResults();
    renderOverview();
    renderTable();
    renderCompare();
  }

  function renderUserList() {
    el.userList.innerHTML = state.users.map(function (user) {
      return '<button type="button" class="user-chip' + (user.id === state.activeUserId ? " is-active" : "") + '" data-user-id="' + escapeHtml(user.id) + '">' +
        '<span class="user-chip-avatar" style="background:' + escapeHtml(user.color) + '">' + escapeHtml(user.name.slice(0, 1)) + '</span>' +
        escapeHtml(user.name) +
      '</button>';
    }).join("");
  }

  function switchUser(id) {
    if (!state.users.some(function (user) { return user.id === id; })) return;
    state.activeUserId = id;
    saveState();
    syncProfileForm();
    renderUserList();
    renderWeightSection();
    renderStatusSection();
    renderProfileResults();
    renderAll();
    showToast("已切换到「" + activeUser().name + "」");
  }

  function openUserDialog() {
    el.newUserName.value = "";
    el.newUserAge.value = "25";
    el.newUserHeight.value = "165";
    el.newUserWeight.value = "55";
    el.userError.textContent = "";
    const female = document.querySelector('input[name="newUserSex"][value="female"]');
    if (female) female.checked = true;
    el.userDialog.showModal();
    syncBodyDialogState();
    window.setTimeout(function () { el.newUserName.focus(); }, 60);
  }

  function closeUserDialog() {
    if (el.userDialog.open) el.userDialog.close();
  }

  function handleUserSubmit(event) {
    event.preventDefault();
    const name = el.newUserName.value.trim();
    const sexInput = document.querySelector('input[name="newUserSex"]:checked');
    const age = Number(el.newUserAge.value);
    const height = Number(el.newUserHeight.value);
    const weight = Number(el.newUserWeight.value);
    if (!name) {
      el.userError.textContent = "请输入名字。";
      el.newUserName.focus();
      return;
    }
    if (!Number.isFinite(age) || age < 14 || age > 100 || !Number.isFinite(height) || height < 100 || height > 250 || !Number.isFinite(weight) || weight < 20 || weight > 400) {
      el.userError.textContent = "请检查年龄、身高和体重。";
      return;
    }
    const user = createUser(name, {
      sex: sexInput ? sexInput.value : "female",
      age: age,
      height: height,
      weight: weight,
      bodyFat: "",
      formula: "mifflin",
    }, state.users.length);
    state.users.push(user);
    state.activeUserId = user.id;
    saveState();
    closeUserDialog();
    syncProfileForm();
    renderUserList();
    renderWeightSection();
    renderStatusSection();
    renderProfileResults();
    renderAll();
    showToast("已创建「" + user.name + "」");
  }

  /* =========================================================
     Weight
     ========================================================= */

  function renderWeightSection() {
    const user = activeUser();
    const records = user.weightRecords.slice();
    el.weightCount.textContent = records.length + " 条";
    el.currentWeightLabel.textContent = fmtDecimal(getCurrentWeight(user)) + " kg";
    renderWeightChart(records);
    const sorted = records.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    if (!sorted.length) {
      el.weightList.innerHTML = '<div class="weight-empty">还没有体重记录</div>';
      return;
    }
    el.weightList.innerHTML = sorted.map(function (record) {
      return '<div class="weight-row">' +
        '<span class="weight-date">' + formatWeightDate(record) + '</span>' +
        '<div class="weight-values">' +
          '<strong>' + fmtDecimal(record.weight) + ' kg</strong>' +
          '<span>脂 ' + (record.bodyFat !== null && record.bodyFat !== undefined ? fmtDecimal(record.bodyFat) + '%' : '—') + '</span>' +
          '<span>肌 ' + (record.muscle !== null && record.muscle !== undefined ? fmtDecimal(record.muscle) + 'kg' : '—') + '</span>' +
        '</div>' +
        '<button type="button" class="mini-action mini-action--danger" data-weight-delete="' + escapeHtml(record.id) + '" aria-label="删除这条身体记录"><svg class="icon"><use href="#i-trash"></use></svg></button>' +
      '</div>';
    }).join("");
  }

  function renderWeightChart(records) {
    if (!records.length) {
      el.weightChart.innerHTML = '<div class="weight-empty">—</div>';
      return;
    }
    const sorted = records.slice().sort(function (a, b) { return a.createdAt - b.createdAt; });
    const series = [
      { key: "weight", label: "体重", valueKey: "weight", unit: "kg", color: "#df8130", className: "weight-line" },
      { key: "bodyFat", label: "体脂率", valueKey: "bodyFat", unit: "%", color: "#d99a34", className: "fat-line" },
      { key: "muscle", label: "骨骼肌", valueKey: "muscle", unit: "kg", color: "#a8784c", className: "muscle-line" },
    ];

    el.weightChart.innerHTML = series.map(function (metric) {
      const latest = records.slice().sort(function (a, b) { return b.createdAt - a.createdAt; }).find(function (record) {
        return record[metric.valueKey] !== null && record[metric.valueKey] !== undefined;
      });
      return '<div class="metric-chart-row ' + metric.className + '">' +
        '<div class="metric-chart-head"><span><i></i>' + metric.label + '</span><strong>' +
          (latest ? fmtDecimal(latest[metric.valueKey]) + (metric.unit === "%" ? "%" : " " + metric.unit) : "—") +
        '</strong></div>' +
        '<div class="metric-spark">' + metricSparkline(sorted, metric.valueKey, metric.color) + '</div>' +
      '</div>';
    }).join("");
  }

  function metricSparkline(records, key, color) {
    const available = records.map(function (record) {
      const value = record[key];
      return Number.isFinite(value) ? value : null;
    });
    const values = available.filter(function (value) { return value !== null; });
    if (!values.length) return '<div class="metric-empty">—</div>';
    let min = Math.min.apply(null, values);
    let max = Math.max.apply(null, values);
    if (max - min < 0.1) {
      min -= 0.5;
      max += 0.5;
    }
    const range = max - min;
    const width = 240;
    const height = 30;
    const points = [];
    available.forEach(function (value, index) {
      if (value === null) return;
      const x = records.length === 1 ? width / 2 : 8 + (index / (records.length - 1)) * (width - 16);
      const y = height - 5 - ((value - min) / range) * (height - 10);
      points.push({ x: x, y: y, value: value });
    });
    const polyline = points.map(function (point) { return point.x.toFixed(1) + "," + point.y.toFixed(1); }).join(" ");
    return '<svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" role="img" aria-label="趋势">' +
      (points.length > 1 ? '<polyline points="' + polyline + '" fill="none" stroke="' + color + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' : "") +
      points.map(function (point) {
        return '<circle cx="' + point.x + '" cy="' + point.y + '" r="2.2" fill="#fffaf0" stroke="' + color + '" stroke-width="1.4" vector-effect="non-scaling-stroke"><title>' + fmtDecimal(point.value) + '</title></circle>';
      }).join("") +
    '</svg>';
  }

  function handleWeightSubmit(event) {
    event.preventDefault();
    const value = Number(el.weightValue.value);
    const bodyFatRaw = el.weightBodyFat.value.trim();
    const muscleRaw = el.weightMuscle.value.trim();
    const bodyFat = bodyFatRaw === "" ? null : Number(bodyFatRaw);
    const muscle = muscleRaw === "" ? null : Number(muscleRaw);
    const date = isDateKey(el.weightDate.value) ? el.weightDate.value : todayKey();
    if (!Number.isFinite(value) || value < 20 || value > 400) {
      showToast("请输入 20–400 kg 的体重");
      el.weightValue.focus();
      return;
    }
    if (bodyFat !== null && (!Number.isFinite(bodyFat) || bodyFat < 1 || bodyFat > 70)) {
      showToast("体脂率需在 1–70% 之间");
      el.weightBodyFat.focus();
      return;
    }
    if (muscle !== null && (!Number.isFinite(muscle) || muscle < 1 || muscle > 150)) {
      showToast("骨骼肌量需在 1–150 kg 之间");
      el.weightMuscle.focus();
      return;
    }
    const user = activeUser();
    user.weightRecords.push({
      id: uid("w"),
      weight: roundTo(value, 1),
      bodyFat: bodyFat === null ? null : roundTo(bodyFat, 1),
      muscle: muscle === null ? null : roundTo(muscle, 1),
      date: date,
      createdAt: Date.now(),
    });
    if (bodyFat !== null) {
      user.profile.bodyFat = String(roundTo(bodyFat, 1));
      el.bodyFatInput.value = user.profile.bodyFat;
    }
    saveState();
    el.weightValue.value = "";
    el.weightBodyFat.value = "";
    el.weightMuscle.value = "";
    renderWeightSection();
    renderProfileResults();
    renderOverview();
    renderTable();
    renderCompare();
    showToast("已记录身体数据");
  }

  async function handleWeightListClick(event) {
    const button = event.target.closest("[data-weight-delete]");
    if (!button) return;
    const recordId = button.dataset.weightDelete;
    const user = activeUser();
    const record = user.weightRecords.find(function (item) { return item.id === recordId; });
    if (!record) return;
    const confirmed = await askConfirm("删除 " + formatWeightDate(record) + " 的身体记录？", {
      title: "删除身体记录",
    });
    if (!confirmed) return;
    const currentUser = activeUser();
    const currentRecord = currentUser.weightRecords.find(function (item) { return item.id === recordId; });
    if (!currentRecord) return;
    currentUser.weightRecords = currentUser.weightRecords.filter(function (item) { return item.id !== recordId; });
    if (currentRecord.bodyFat !== null && currentRecord.bodyFat !== undefined) {
      const latestFat = latestBodyFatRecord(currentUser.weightRecords);
      currentUser.profile.bodyFat = latestFat ? String(latestFat.bodyFat) : "";
      el.bodyFatInput.value = currentUser.profile.bodyFat;
    }
    saveState();
    renderWeightSection();
    renderProfileResults();
    renderOverview();
    renderTable();
    renderCompare();
    showToast("已删除身体记录");
  }

  /* =========================================================
     Status management (inside profile drawer)
     ========================================================= */

  function renderStatusSection() {
    const statuses = getAllStatuses();
    el.statusList.innerHTML = statuses.map(function (status) {
      return '<div class="status-row">' +
        '<i style="background:' + escapeHtml(status.color) + '"></i>' +
        '<div class="status-row-copy"><strong>' + escapeHtml(status.name) + '</strong><span>×' + status.factor + '</span></div>' +
        '<div class="status-row-actions">' +
          (status.custom
            ? '<button type="button" class="mini-action" data-status-edit="' + escapeHtml(status.id) + '" aria-label="编辑状态" title="编辑"><svg class="icon"><use href="#i-edit"></use></svg></button>'
            : '<span class="status-built-in">预设</span>') +
          '<button type="button" class="mini-action mini-action--danger" data-status-delete="' + escapeHtml(status.id) + '" aria-label="删除状态" title="' + (statuses.length <= 1 ? '至少保留一个状态' : '删除') + '"><svg class="icon"><use href="#i-trash"></use></svg></button>' +
        '</div>' +
      '</div>';
    }).join("");
    el.statusForm.hidden = !ui.statusFormOpen;
    renderStatusColorPicker();
  }

  function showStatusForm(statusId) {
    ui.statusFormOpen = true;
    ui.statusEditingId = statusId || null;
    if (statusId) {
      const status = state.customStatuses.find(function (item) { return item.id === statusId; });
      if (!status) return;
      el.statusName.value = status.name;
      el.statusFactor.value = status.factor;
      ui.statusColor = status.color;
    } else {
      el.statusName.value = "";
      el.statusFactor.value = "1.375";
      ui.statusColor = STATUS_COLORS[1];
    }
    el.statusError.textContent = "";
    el.statusForm.hidden = false;
    renderStatusColorPicker();
    window.setTimeout(function () {
      el.statusSection.scrollIntoView({ block: "start", behavior: "smooth" });
      el.statusName.focus();
    }, 30);
  }

  function hideStatusForm() {
    ui.statusFormOpen = false;
    ui.statusEditingId = null;
    el.statusForm.hidden = true;
    el.statusError.textContent = "";
  }

  function renderStatusColorPicker() {
    el.statusColorPicker.innerHTML = STATUS_COLORS.map(function (color) {
      return '<button type="button" class="status-swatch' + (color === ui.statusColor ? " is-selected" : "") + '" data-status-color="' + color + '" style="--swatch:' + color + '" aria-label="颜色 ' + color + '" aria-pressed="' + (color === ui.statusColor ? "true" : "false") + '"></button>';
    }).join("");
  }

  function handleStatusColorClick(event) {
    const button = event.target.closest("[data-status-color]");
    if (!button) return;
    ui.statusColor = button.dataset.statusColor;
    renderStatusColorPicker();
  }

  function handleStatusSubmit(event) {
    event.preventDefault();
    const name = el.statusName.value.trim();
    const factor = Number(el.statusFactor.value);
    if (!name) {
      el.statusError.textContent = "请输入状态名称。";
      el.statusName.focus();
      return;
    }
    if (!Number.isFinite(factor) || factor < 0.8 || factor > 3) {
      el.statusError.textContent = "倍率需在 0.8–3.0 之间。";
      el.statusFactor.focus();
      return;
    }
    if (!ui.statusEditingId && state.customStatuses.length >= 20) {
      el.statusError.textContent = "最多保存 20 个自定义状态。";
      return;
    }

    if (ui.statusEditingId) {
      const status = state.customStatuses.find(function (item) { return item.id === ui.statusEditingId; });
      if (!status) return;
      status.name = name.slice(0, 16);
      status.factor = roundTo(factor, 3);
      status.color = ui.statusColor;
    } else {
      state.customStatuses.push({
        id: uid("s"),
        name: name.slice(0, 16),
        factor: roundTo(factor, 3),
        color: ui.statusColor,
        custom: true,
      });
    }
    saveState();
    hideStatusForm();
    renderStatusSection();
    renderTable();
    showToast("状态已保存");
  }

  async function handleStatusListClick(event) {
    const edit = event.target.closest("[data-status-edit]");
    const remove = event.target.closest("[data-status-delete]");
    if (edit) {
      showStatusForm(edit.dataset.statusEdit);
      return;
    }
    if (!remove) return;
    const statusId = remove.dataset.statusDelete;
    const statuses = getAllStatuses();
    const status = statuses.find(function (item) { return item.id === statusId; });
    if (!status) return;
    if (statuses.length <= 1) {
      showToast("至少保留一个状态");
      return;
    }
    const confirmed = await askConfirm("删除状态「" + status.name + "」？使用它的日期会恢复为默认状态。", {
      title: "删除状态",
    });
    if (!confirmed) return;

    const currentStatus = getAllStatuses().find(function (item) { return item.id === statusId; });
    if (!currentStatus) return;
    if (currentStatus.custom) {
      state.customStatuses = state.customStatuses.filter(function (item) { return item.id !== statusId; });
    } else {
      state.removedBuiltinStatusIds = state.removedBuiltinStatusIds || [];
      if (state.removedBuiltinStatusIds.indexOf(statusId) === -1) state.removedBuiltinStatusIds.push(statusId);
    }

    const remainingIds = new Set(getAllStatuses().map(function (item) { return item.id; }));
    const defaultId = getDefaultStatusId();
    state.users.forEach(function (user) {
      Object.keys(user.days).forEach(function (dateKey) {
        const userDay = user.days[dateKey];
        if (userDay.statusId === statusId || !remainingIds.has(userDay.statusId)) userDay.statusId = defaultId;
      });
    });
    if (ui.statusEditingId === statusId) hideStatusForm();
    saveState();
    renderStatusSection();
    renderTable();
    renderOverview();
    renderCompare();
    renderProfileResults();
    showToast("已删除状态「" + status.name + "」");
  }

  /* =========================================================
     Food card dialog
     ========================================================= */

  function openFoodDialog(cardId, presetId) {
    ui.editingTrayId = cardId || null;
    ui.foodBasis = "100g";
    ui.foodUnit = "kj";
    ui.foodEmoji = "🍽️";
    ui.foodCategory = "custom";
    ui.foodPresetId = null;
    el.foodError.textContent = "";
    el.deleteFoodCard.hidden = !cardId;
    el.foodDialogTitle.textContent = cardId ? "编辑食物卡片" : "添加食物卡片";
    el.saveFoodCard.textContent = cardId ? "保存" : "放入托盘";

    const card = cardId ? findTrayCard(cardId) : null;
    if (card) {
      ui.foodBasis = card.basis;
      ui.foodUnit = "kj";
      ui.foodEmoji = card.emoji;
      ui.foodCategory = card.category;
      populateFoodForm({
        name: card.name,
        basis: card.basis,
        unit: "kj",
        energyKj: card.energyKj,
        protein: card.protein,
        fat: card.fat,
        carbs: card.carbs,
        servingSize: card.servingSize,
        servings: card.servings,
      });
    } else {
      populateFoodForm({
        name: "",
        basis: "100g",
        unit: "kj",
        energyKj: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        servingSize: 100,
        servings: 1,
      });
      if (presetId) {
        const preset = PRESETS.find(function (item) { return item.id === presetId; });
        if (preset) fillPreset(preset);
      }
    }
    updatePresetSelection();
    el.foodDialog.showModal();
    syncBodyDialogState();
    window.setTimeout(function () { el.foodName.focus(); el.foodName.select(); }, 50);
  }

  function closeFoodDialog() {
    if (el.foodDialog.open) el.foodDialog.close();
  }

  function populateFoodForm(data) {
    el.foodName.value = data.name || "";
    ui.foodBasis = data.basis || "100g";
    ui.foodUnit = data.unit || "kj";
    el.foodEnergy.value = formatEditableNumber(ui.foodUnit === "kj" ? (data.energyKj || 0) : (data.energyKj || 0) / KJ_PER_KCAL);
    el.foodProtein.value = formatEditableNumber(data.protein || 0);
    el.foodFat.value = formatEditableNumber(data.fat || 0);
    el.foodCarbs.value = formatEditableNumber(data.carbs || 0);
    el.foodServingSize.value = data.servingSize > 0 ? formatEditableNumber(data.servingSize) : "";
    el.foodServings.value = formatEditableNumber(data.servings || 1);
    paintDraftControls();
    updateFoodPreview();
  }

  function paintDraftControls() {
    Array.prototype.forEach.call(el.basisSegment.querySelectorAll("[data-basis]"), function (button) {
      button.setAttribute("aria-pressed", button.dataset.basis === ui.foodBasis ? "true" : "false");
    });
    Array.prototype.forEach.call(el.unitSegment.querySelectorAll("[data-unit]"), function (button) {
      button.setAttribute("aria-pressed", button.dataset.unit === ui.foodUnit ? "true" : "false");
    });
    const basis = BASIS_META[ui.foodBasis] || BASIS_META["100g"];
    el.nutritionBasis.textContent = basis.nutrition;
    el.energySuffix.textContent = ui.foodUnit === "kj" ? "千焦" : "千卡";
    el.servingSizeSuffix.textContent = basis.unit;
    el.servingSizeLabel.textContent = ui.foodBasis === "serving" ? "每份重量（选填）" : "每份重量";
  }

  function handleBasisClick(event) {
    const button = event.target.closest("[data-basis]");
    if (!button) return;
    if (!BASIS_META[button.dataset.basis] || ui.foodBasis === button.dataset.basis) return;
    ui.foodBasis = button.dataset.basis;
    if (ui.foodBasis !== "serving" && !(Number(el.foodServingSize.value) > 0)) el.foodServingSize.value = "100";
    paintDraftControls();
    updateFoodPreview();
  }

  function handleUnitClick(event) {
    const button = event.target.closest("[data-unit]");
    if (!button) return;
    const next = button.dataset.unit;
    if (next !== "kj" && next !== "kcal") return;
    if (ui.foodUnit === next) return;
    const current = Number(el.foodEnergy.value);
    if (Number.isFinite(current)) {
      el.foodEnergy.value = formatEditableNumber(next === "kcal" ? current * KCAL_PER_KJ : current * KJ_PER_KCAL);
    }
    ui.foodUnit = next;
    paintDraftControls();
    updateFoodPreview();
  }

  function handleFormServingStep(event) {
    const button = event.target.closest("[data-step]");
    if (!button) return;
    const current = Number(el.foodServings.value);
    const base = Number.isFinite(current) && current > 0 ? current : 1;
    el.foodServings.value = formatEditableNumber(clamp(base + Number(button.dataset.step), 0.1, 99));
    updateFoodPreview();
  }

  function handleFoodInput(event) {
    if (event.target === el.foodName) {
      el.foodError.textContent = "";
      return;
    }
    el.foodError.textContent = "";
    updateFoodPreview();
  }

  function readFoodNumber(input) {
    if (input.value === "") return 0;
    const value = Number(input.value);
    return Number.isFinite(value) ? value : NaN;
  }

  function updateFoodPreview() {
    const energy = readFoodNumber(el.foodEnergy);
    const protein = readFoodNumber(el.foodProtein);
    const fat = readFoodNumber(el.foodFat);
    const carbs = readFoodNumber(el.foodCarbs);
    const servings = Math.max(0, readFoodNumber(el.foodServings) || 0);
    const servingSize = Math.max(0, readFoodNumber(el.foodServingSize) || 0);
    const hasNaN = [energy, protein, fat, carbs, servings, servingSize].some(Number.isNaN);
    const safeEnergy = Number.isFinite(energy) ? Math.max(0, energy) : 0;
    const energyKj = ui.foodUnit === "kj" ? safeEnergy : safeEnergy * KJ_PER_KCAL;
    const factor = ui.foodBasis === "serving" ? servings : (servings * servingSize) / 100;
    const kcal = energyKj * factor * KCAL_PER_KJ;
    const kj = energyKj * factor;
    const amount = servings * servingSize;
    const unit = BASIS_META[ui.foodBasis].unit;

    el.previewKcal.textContent = hasNaN ? "—" : fmtInt(kcal);
    el.previewKj.textContent = hasNaN ? "≈ — 千焦" : "≈ " + fmtInt(kj) + " 千焦";
    el.previewProtein.textContent = hasNaN ? "—" : fmtDecimal(Math.max(0, protein) * factor) + " g";
    el.previewFat.textContent = hasNaN ? "—" : fmtDecimal(Math.max(0, fat) * factor) + " g";
    el.previewCarbs.textContent = hasNaN ? "—" : fmtDecimal(Math.max(0, carbs) * factor) + " g";
    el.previewAmount.textContent = ui.foodBasis === "serving"
      ? (amount > 0 ? fmtQty(amount) + " " + unit + " · " + fmtQty(servings) + " 份" : fmtQty(servings) + " 份")
      : fmtQty(servings) + " 份 × " + fmtQty(servingSize) + unit + " = " + fmtQty(amount) + " " + unit;
    el.previewFormula.textContent = ui.foodBasis === "serving"
      ? "每份标签 × " + fmtQty(servings) + " 份"
      : "每 100" + unit + " × " + fmtQty(amount) + unit + " ÷ 100";
    el.amountReadout.textContent = ui.foodBasis === "serving" && amount <= 0
      ? fmtQty(servings) + " 份"
      : fmtQty(amount) + " " + unit;
    el.energyConverted.textContent = ui.foodUnit === "kj"
      ? "≈ " + fmtInt(safeEnergy * KCAL_PER_KJ) + " 千卡"
      : "≈ " + fmtInt(safeEnergy * KJ_PER_KCAL) + " 千焦";
  }

  function handlePresetClick(event) {
    const button = event.target.closest("[data-preset-id]");
    if (!button) return;
    const preset = PRESETS.find(function (item) { return item.id === button.dataset.presetId; });
    if (!preset) return;
    ui.foodPresetId = preset.id;
    fillPreset(preset);
    updatePresetSelection();
  }

  function fillPreset(preset) {
    ui.foodEmoji = preset.emoji;
    ui.foodCategory = preset.category;
    populateFoodForm({
      name: preset.name,
      basis: preset.basis,
      unit: "kj",
      energyKj: preset.energyKj,
      protein: preset.protein,
      fat: preset.fat,
      carbs: preset.carbs,
      servingSize: preset.servingSize,
      servings: 1,
    });
  }

  function updatePresetSelection() {
    Array.prototype.forEach.call(el.presetStrip.querySelectorAll("[data-preset-id]"), function (button) {
      button.classList.toggle("is-selected", button.dataset.presetId === ui.foodPresetId);
    });
  }

  function validateFood() {
    const name = el.foodName.value.trim();
    if (!name) return { error: "请输入食物名称。", focus: el.foodName };
    const energy = readFoodNumber(el.foodEnergy);
    const protein = readFoodNumber(el.foodProtein);
    const fat = readFoodNumber(el.foodFat);
    const carbs = readFoodNumber(el.foodCarbs);
    const servings = readFoodNumber(el.foodServings);
    const servingSize = readFoodNumber(el.foodServingSize);
    const checks = [
      ["能量", energy, el.foodEnergy],
      ["蛋白质", protein, el.foodProtein],
      ["脂肪", fat, el.foodFat],
      ["碳水", carbs, el.foodCarbs],
    ];
    for (let i = 0; i < checks.length; i += 1) {
      if (Number.isNaN(checks[i][1]) || checks[i][1] < 0) return { error: checks[i][0] + "需要是 0 或更大的数字。", focus: checks[i][2] };
    }
    if (Number.isNaN(servings) || servings <= 0) return { error: "份数需要大于 0。", focus: el.foodServings };
    if (Number.isNaN(servingSize) || servingSize < 0) return { error: "每份重量需要是 0 或更大的数字。", focus: el.foodServingSize };
    if (ui.foodBasis !== "serving" && servingSize <= 0) return { error: "按 100g / 100ml 记录时，请填写每份重量。", focus: el.foodServingSize };
    const energyKj = ui.foodUnit === "kj" ? energy : energy * KJ_PER_KCAL;
    return {
      value: {
        id: ui.editingTrayId || uid("c"),
        name: name.slice(0, 40),
        emoji: ui.foodEmoji || "🍽️",
        category: ui.foodCategory || "custom",
        basis: ui.foodBasis,
        energyKj: roundTo(energyKj, 3),
        protein: roundTo(protein, 3),
        fat: roundTo(fat, 3),
        carbs: roundTo(carbs, 3),
        servingSize: roundTo(servingSize, 3),
        servings: roundTo(servings, 2),
        createdAt: Date.now(),
      },
    };
  }

  function handleFoodSubmit(event) {
    event.preventDefault();
    const validation = validateFood();
    if (validation.error) {
      el.foodError.textContent = validation.error;
      if (validation.focus) validation.focus.focus();
      return;
    }
    const card = validation.value;
    const user = activeUser();
    if (ui.editingTrayId) {
      const index = user.tray.findIndex(function (item) { return item.id === ui.editingTrayId; });
      if (index === -1) return;
      card.createdAt = user.tray[index].createdAt;
      user.tray[index] = card;
    } else {
      user.tray.push(card);
    }
    saveState();
    closeFoodDialog();
    renderTray();
    showToast(ui.editingTrayId ? "卡片已保存" : "已放入托盘");
  }

  async function deleteEditingCard() {
    if (!ui.editingTrayId) return;
    const cardId = ui.editingTrayId;
    const card = findTrayCard(cardId);
    if (!card) return;
    const confirmed = await askConfirm("删除托盘中的「" + card.name + "」？已经放入日期的记录不会删除。", {
      title: "删除食物卡片",
    });
    if (!confirmed) return;
    const current = findTrayCard(cardId);
    if (!current) return;
    activeUser().tray = activeUser().tray.filter(function (item) { return item.id !== cardId; });
    saveState();
    closeFoodDialog();
    renderTray();
    showToast("已删除卡片");
  }

  /* =========================================================
     Presets / UI helpers
     ========================================================= */

  function renderPresetStrip() {
    el.presetStrip.innerHTML = PRESETS.map(function (preset) {
      const basis = preset.basis === "serving" ? "份" : preset.basis === "100ml" ? "100ml" : "100g";
      return '<button type="button" class="preset-card" data-preset-id="' + preset.id + '">' +
        '<span class="preset-emoji">' + preset.emoji + '</span>' +
        '<span class="preset-copy"><strong>' + escapeHtml(preset.name) + '</strong><small>' + fmtInt(preset.energyKj * KCAL_PER_KJ) + ' 千卡 / ' + basis + '</small></span>' +
      '</button>';
    }).join("");
  }

  function askConfirm(message, options) {
    const opts = options || {};
    if (confirmResolver) {
      const previous = confirmResolver;
      confirmResolver = null;
      previous(false);
    }
    return new Promise(function (resolve) {
      confirmResolver = resolve;
      el.confirmTitle.textContent = opts.title || "确认删除";
      el.confirmMessage.textContent = message;
      el.confirmOk.textContent = opts.confirmText || "删除";
      if (!el.confirmDialog.open) el.confirmDialog.showModal();
      syncBodyDialogState();
      window.setTimeout(function () { el.confirmCancel.focus(); }, 30);
    });
  }

  function settleConfirm(value) {
    const resolve = confirmResolver;
    if (!resolve) {
      if (el.confirmDialog.open) el.confirmDialog.close();
      return;
    }
    confirmResolver = null;
    if (el.confirmDialog.open) el.confirmDialog.close();
    resolve(value);
    syncBodyDialogState();
  }

  function syncBodyDialogState() {
    const open = el.profileDialog.open || el.userDialog.open || el.foodDialog.open || el.confirmDialog.open;
    document.body.classList.toggle("dialog-open", open);
  }

  function showToast(message) {
    el.toastText.textContent = message;
    el.toast.classList.add("is-visible");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.toast.classList.remove("is-visible");
    }, 2400);
  }

  /* =========================================================
     Summary copy
     ========================================================= */

  function buildWeekSummary() {
    const days = getWeekSummaries(parseDateKey(viewDate));
    const stats = summarizeDays(days);
    const start = startOfWeek(parseDateKey(viewDate));
    const end = addDays(start, 6);
    const lines = [
      "食刻 · " + formatRange(start, end),
      "已摄入 " + fmtInt(stats.totals.kcal) + " 千卡 / TDEE " + (stats.count ? fmtInt(stats.totals.tdee) : "—") + " 千卡",
      "热量差额：" + (stats.balance !== null ? fmtSigned(stats.balance) + " 千卡" : "—"),
      "蛋白质 " + fmtDecimal(stats.totals.protein) + "g · 脂肪 " + fmtDecimal(stats.totals.fat) + "g · 碳水 " + fmtDecimal(stats.totals.carbs) + "g",
      "",
    ];
    days.forEach(function (day) {
      if (!day.logged) return;
      lines.push(WEEKDAY_LONG[(day.date.getDay() + 6) % 7] + " · " + fmtInt(day.totals.kcal) + " / " + fmtInt(day.tdee) + " 千卡 · " + fmtSigned(day.balance));
      day.entries.forEach(function (entry) {
        lines.push("- " + entry.name + " · " + fmtQty(entry.servings) + " 份 · " + fmtInt(calcNutrition(entry).kcal) + " 千卡");
      });
    });
    return lines.join("\n");
  }

  async function copyWeekSummary() {
    const text = buildWeekSummary();
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (error) {
        copied = false;
      }
    }
    if (!copied) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        copied = document.execCommand("copy");
      } catch (error) {
        copied = false;
      }
      textarea.remove();
    }
    if (copied) {
      showToast("本周摘要已复制");
    } else {
      window.prompt("请手动复制本周摘要：", text);
      showToast("已打开摘要文本");
    }
  }

  /* =========================================================
     Go
     ========================================================= */

  init();
})();
