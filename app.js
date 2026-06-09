import { checklistDatabasePath, discordEventsDatabasePath, discordSettingsDatabasePath, firebaseConfig, firebaseEnabled } from "./firebase-config.js";
import { discordEnabled, discordWebhookUrl } from "./discord-config.js";

const storageKey = "flat-cleaning-checklist-v1";
const discordStorageKey = "flat-cleaning-discord-webhook-v1";
const adminModeStorageKey = "flat-cleaning-admin-mode-v1";
const dailyPointValue = 1;
const weeklyPointValue = 5;
const dayNamesShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayNamesLong = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const syncStatus = document.querySelector("#sync-status");
const completionMessages = [
  "Nice, one less thing on the list.",
  "That is another clean little win.",
  "Progress logged. The flat is winning.",
  "Small task done, big difference made.",
  "Clean streak continues.",
  "Future you gets an easier day.",
  "That corner of chaos has been handled.",
  "Another box defeated.",
  "One step closer to reset mode.",
  "Clean points secured.",
  "Household momentum is building.",
  "That task can stop taking up brain space.",
  "Ticked, tracked, and done.",
  "The checklist approves.",
  "A little more calm added to the flat.",
  "Done means done.",
  "That is a tidy little victory.",
  "One more thing off the mental load.",
  "The room just got easier to exist in.",
  "Good reset energy.",
  "A practical win has landed.",
  "Task complete. Points collected.",
  "That is one less thing waiting around.",
  "The flat is a bit lighter now.",
  "Cleanliness score goes up.",
  "The list got shorter.",
  "That is some solid follow-through.",
  "Reset progress saved.",
  "Tiny chore, real impact.",
  "Done and counted."
];

let cloudSaveTimer;
let cloudDataRef;
let discordEventsRef;
let discordSettingsRef;
let setCloudData;
let updateCloudData;
let pushCloudData;
let cloudTimestamp;
let cloudSyncReady = false;
let sharedDiscordWebhookUrl = "";

/*
  Add or remove daily tasks here.
  Quick reset tasks belong here because they help the room feel clear every day.
*/
const dailyTasks = [
  { room: "Living Room", step: 1, name: "Clean desk" },
  { room: "Living Room", step: 2, name: "Clean table" },
  { room: "Living Room", step: 3, name: "Tidy any loose items, like remote controls or books" },
  { room: "Living Room", step: 4, name: "Straighten chairs or cushions if needed" },
  { room: "Kitchen", step: 1, name: "Wash up dishes" },
  { room: "Kitchen", step: 2, name: "Put dishes away" },
  { room: "Kitchen", step: 3, name: "Wipe kitchen counters" },
  { room: "Kitchen", step: 4, name: "Wipe hob" },
  { room: "Kitchen", step: 5, name: "Check food left out" },
  { room: "Kitchen", step: 6, name: "Sweep floor if needed" },
  { room: "Kitchen", step: 7, name: "Empty kitchen bin if full" },
  { room: "Bathroom", step: 1, name: "Check litter trays" },
  { room: "Bathroom", step: 2, name: "Wipe sink if dirty" },
  { room: "Bathroom", step: 3, name: "Hang towels properly" },
  { room: "Bathroom", step: 4, name: "Replace toilet roll if needed" },
  { room: "Bathroom", step: 5, name: "Quick check for rubbish" },
  { room: "Bedroom", step: 1, name: "Make bed" },
  { room: "Bedroom", step: 2, name: "Put dirty clothes in laundry basket" },
  { room: "Bedroom", step: 3, name: "Put clean clothes away" },
  { room: "Bedroom", step: 4, name: "Clear bedside table" }
];

/*
  Add or remove weekly tasks here.
  Deeper cleaning and jobs that depend on how full something is belong here.
*/
const weeklyTasks = [
  { room: "Living Room", step: 1, name: "Wipe down desk" },
  { room: "Living Room", step: 2, name: "Wipe down TV and stand" },
  { room: "Living Room", step: 3, name: "Empty Roomba's bin" },
  { room: "Living Room", step: 4, name: "Empty any small bins if needed" },
  { room: "Living Room", step: 5, name: "Dust or wipe frequently used surfaces, like a coffee table or media unit" },
  { room: "Kitchen", step: 1, name: "Clean microwave" },
  { room: "Kitchen", step: 2, name: "Clean sink thoroughly" },
  { room: "Kitchen", step: 3, name: "Wipe cupboard doors" },
  { room: "Kitchen", step: 4, name: "Wipe fridge handles and exterior" },
  { room: "Kitchen", step: 5, name: "Mop floor" },
  { room: "Kitchen", step: 6, name: "Empty and clean bin" },
  { room: "Kitchen", step: 7, name: "Check fridge for old food" },
  { room: "Bathroom", step: 1, name: "Empty litter trays fully" },
  { room: "Bathroom", step: 2, name: "Clean toilet" },
  { room: "Bathroom", step: 3, name: "Clean sink" },
  { room: "Bathroom", step: 4, name: "Clean bath or shower" },
  { room: "Bathroom", step: 5, name: "Clean mirror" },
  { room: "Bathroom", step: 6, name: "Empty bathroom bin" },
  { room: "Bathroom", step: 7, name: "Mop floor" },
  { room: "Bathroom", step: 8, name: "Refill toiletries if needed" },
  { room: "Bedroom", step: 1, name: "Change bedding" },
  { room: "Bedroom", step: 2, name: "Dust surfaces" },
  { room: "Bedroom", step: 3, name: "Vacuum floor" },
  { room: "Bedroom", step: 4, name: "Empty bedroom bin" }
];

const appState = readSavedState();
const dailyTaskContainer = document.querySelector("#daily-tasks");
const weeklyTaskContainer = document.querySelector("#weekly-tasks");
const notes = document.querySelector("#notes");
const discordWebhookInput = document.querySelector("#discord-webhook");
const discordStatus = document.querySelector("#discord-status");
const adminToggle = document.querySelector("#admin-toggle");
const rewardForm = document.querySelector("#reward-form");
const rewardNameInput = document.querySelector("#reward-name");
const rewardCostInput = document.querySelector("#reward-cost");
const rewardList = document.querySelector("#reward-list");

dailyTasks.forEach((task) => {
  dailyTaskContainer.append(makeTaskCard(task, makeDailyGrid(task)));
});

weeklyTasks.forEach((task) => {
  weeklyTaskContainer.append(makeTaskCard(task, makeWeeklyGrid(task)));
});

notes.value = appState.notes || "";
notes.addEventListener("input", () => {
  appState.notes = notes.value;
  saveState();
});

document.querySelectorAll("[data-reset]").forEach((button) => {
  button.addEventListener("click", () => resetTicks(button.dataset.reset));
});

adminToggle.addEventListener("click", () => {
  setAdminMode(!document.body.classList.contains("admin-mode"));
});

rewardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addReward(rewardNameInput.value, rewardCostInput.value);
});

setupDiscordControls();
setAdminMode(localStorage.getItem(adminModeStorageKey) === "true");
updateScores();
renderRewards();
runMonthEndAutoReset();
setupCloudSync();

function readSavedState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(storageKey)));
  } catch (error) {
    return normalizeState();
  }
}

function normalizeState(state = {}) {
  return {
    checked: state.checked || {},
    notes: state.notes || "",
    autoResetKey: state.autoResetKey || "",
    rewards: Array.isArray(state.rewards) ? state.rewards : []
  };
}

function saveState(options = {}) {
  localStorage.setItem(storageKey, JSON.stringify(appState));

  if (!options.skipCloud) {
    scheduleCloudSave();
  }
}

function makeCheckboxLabel(dayName, checkboxId, listType, task, labelText) {
  const label = document.createElement("label");
  const span = document.createElement("span");
  const checkbox = document.createElement("input");

  span.textContent = dayName;
  checkbox.type = "checkbox";
  checkbox.dataset.id = checkboxId;
  checkbox.dataset.list = listType;
  checkbox.checked = Boolean(appState.checked[checkboxId]);

  checkbox.addEventListener("change", () => {
    let discordUpdate = null;

    if (checkbox.checked) {
      appState.checked[checkboxId] = true;
      discordUpdate = {
        title: `${task.room} - Step ${task.step}: ${task.name}`,
        detail: `${listTypeLabel(listType)} ${labelText} ticked`
      };
    } else {
      delete appState.checked[checkboxId];
    }

    saveState();
    updateScores();

    if (discordUpdate) {
      sendDiscordUpdate(discordUpdate.title, discordUpdate.detail);
    }
  });

  label.append(span, checkbox);
  return label;
}

function makeTaskCard(task, grid) {
  const article = document.createElement("article");
  const heading = document.createElement("h3");

  article.className = "task";
  heading.textContent = `${task.room} \u2014 Step ${task.step}: ${task.name}`;
  article.append(heading, grid);

  return article;
}

function makeDailyGrid(task) {
  const grid = document.createElement("div");
  const taskKey = makeTaskKey(task);

  grid.className = "month-grid";
  grid.setAttribute("aria-label", `28 daily checkboxes for ${task.name}`);

  for (let week = 1; week <= 4; week += 1) {
    const row = document.createElement("div");
    const weekLabel = document.createElement("span");

    row.className = "week-row";
    weekLabel.className = "week-label";
    weekLabel.textContent = `Week ${week}`;

    row.append(weekLabel);
    dayNamesShort.forEach((day, dayIndex) => {
      const checkboxId = `daily-${taskKey}-week-${week}-day-${dayIndex + 1}`;
          row.append(makeCheckboxLabel(day, checkboxId, "daily", task, `Week ${week} ${day}`));
    });
    grid.append(row);
  }

  return grid;
}

function makeWeeklyGrid(task) {
  const grid = document.createElement("div");
  const taskKey = makeTaskKey(task);

  grid.className = "day-grid";
  grid.setAttribute("aria-label", `Weekly checkboxes for ${task.name}`);
  dayNamesLong.forEach((day, dayIndex) => {
    const checkboxId = `weekly-${taskKey}-day-${dayIndex + 1}`;
    grid.append(makeCheckboxLabel(day, checkboxId, "weekly", task, day));
  });

  return grid;
}

function makeTaskKey(task) {
  return `${task.room}-${task.step}-${task.name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function updateScores() {
  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
  const dailyChecked = checkboxes.filter((checkbox) => checkbox.dataset.list === "daily" && checkbox.checked).length;
  const weeklyChecked = checkboxes.filter((checkbox) => checkbox.dataset.list === "weekly" && checkbox.checked).length;
  const completed = dailyChecked + weeklyChecked;
  const total = checkboxes.length;
  const dailyPoints = dailyChecked * dailyPointValue;
  const weeklyPoints = weeklyChecked * weeklyPointValue;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.querySelector("#daily-points").textContent = dailyPoints;
  document.querySelector("#weekly-points").textContent = weeklyPoints;
  document.querySelector("#total-points").textContent = dailyPoints + weeklyPoints;
  document.querySelector("#available-points").textContent = getAvailablePoints(dailyPoints + weeklyPoints);
  document.querySelector("#completed-count").textContent = `${completed} / ${total}`;
  document.querySelector("#progress-fill").style.width = `${progress}%`;
  document.querySelector("#progress-text").textContent = `${progress}% complete`;
  renderRewards();
}

function renderSavedState() {
  document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = Boolean(appState.checked[checkbox.dataset.id]);
  });

  notes.value = appState.notes || "";
  updateScores();
  renderRewards();
}

function resetTicks(listType, options = {}) {
  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));

  checkboxes.forEach((checkbox) => {
    if (listType === "all" || checkbox.dataset.list === listType) {
      checkbox.checked = false;
      delete appState.checked[checkbox.dataset.id];
    }
  });

  if (options.autoResetKey) {
    appState.autoResetKey = options.autoResetKey;
  }

  saveState();
  updateScores();
  sendDiscordUpdate(options.title || "Checklist reset", options.detail || `${listTypeLabel(listType)} ticks were reset`, {
    message: "Time to do it all again."
  });
}

function listTypeLabel(listType) {
  if (listType === "daily") {
    return "Daily";
  }

  if (listType === "weekly") {
    return "Weekly";
  }

  return "All";
}

function updateSyncStatus(message, mode = "local") {
  syncStatus.textContent = message;
  syncStatus.dataset.mode = mode;
}

function setAdminMode(isEnabled) {
  document.body.classList.toggle("admin-mode", isEnabled);
  adminToggle.setAttribute("aria-pressed", String(isEnabled));
  adminToggle.title = isEnabled ? "Admin controls on" : "Admin controls off";
  localStorage.setItem(adminModeStorageKey, String(isEnabled));
}

async function setupCloudSync() {
  if (!firebaseEnabled || !firebaseConfig.projectId) {
    updateSyncStatus("Saving on this device. Add Firebase config for cross-device sync.", "local");
    return;
  }

  updateSyncStatus("Connecting global sync...", "pending");

  try {
    const firebaseApp = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const firebaseDatabase = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js");
    const firebaseAppInstance = firebaseApp.initializeApp(firebaseConfig);
    const database = firebaseDatabase.getDatabase(firebaseAppInstance);

    cloudDataRef = firebaseDatabase.ref(database, checklistDatabasePath);
    discordEventsRef = firebaseDatabase.ref(database, discordEventsDatabasePath);
    discordSettingsRef = firebaseDatabase.ref(database, discordSettingsDatabasePath);
    setCloudData = firebaseDatabase.set;
    updateCloudData = firebaseDatabase.update;
    pushCloudData = firebaseDatabase.push;
    cloudTimestamp = firebaseDatabase.serverTimestamp;
    cloudSyncReady = true;

    firebaseDatabase.onValue(cloudDataRef, (snapshot) => {
      if (!snapshot.exists()) {
        scheduleCloudSave();
        updateSyncStatus("Global sync ready", "synced");
        return;
      }

      const remoteState = snapshot.val();
      appState.checked = remoteState.checked || {};
      appState.notes = remoteState.notes || "";
      appState.autoResetKey = remoteState.autoResetKey || "";
      appState.rewards = Array.isArray(remoteState.rewards) ? remoteState.rewards : [];
      saveState({ skipCloud: true });
      renderSavedState();
      runMonthEndAutoReset();
      updateSyncStatus("Global sync ready", "synced");
    }, (error) => {
      cloudSyncReady = false;
      if (error.code === "PERMISSION_DENIED") {
        updateSyncStatus("Firebase rules are blocking sync. Saving on this device.", "local");
      } else {
        updateSyncStatus("Global sync unavailable. Saving on this device.", "local");
      }
    });

    firebaseDatabase.onValue(discordSettingsRef, (snapshot) => {
      const settings = snapshot.val() || {};
      sharedDiscordWebhookUrl = settings.webhookUrl || "";

      if (sharedDiscordWebhookUrl && !discordWebhookInput.value) {
        discordWebhookInput.value = sharedDiscordWebhookUrl;
      }

      updateDiscordStatus();
    }, () => {
      updateDiscordStatus("Discord settings could not sync");
    });
  } catch (error) {
    cloudSyncReady = false;
    updateSyncStatus("Global sync unavailable. Saving on this device.", "local");
  }
}

function scheduleCloudSave() {
  if (!cloudSyncReady || !cloudDataRef || !setCloudData) {
    return;
  }

  window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(async () => {
    updateSyncStatus("Saving globally...", "pending");

    try {
      await setCloudData(cloudDataRef, {
        checked: appState.checked,
        notes: appState.notes || "",
        autoResetKey: appState.autoResetKey || "",
        rewards: appState.rewards || [],
        updatedAt: cloudTimestamp()
      });
      updateSyncStatus("Global sync ready", "synced");
    } catch (error) {
      updateSyncStatus("Global save failed. Saving on this device.", "local");
    }
  }, 350);
}

function setupDiscordControls() {
  const savedWebhook = localStorage.getItem(discordStorageKey) || "";

  discordWebhookInput.value = savedWebhook;
  updateDiscordStatus();

  document.querySelector("#save-discord-webhook").addEventListener("click", () => {
    saveDiscordWebhook(discordWebhookInput.value.trim());
  });

  document.querySelector("#clear-discord-webhook").addEventListener("click", () => {
    saveDiscordWebhook("");
  });
}

function getDiscordWebhookUrl() {
  return sharedDiscordWebhookUrl || localStorage.getItem(discordStorageKey) || (discordEnabled ? discordWebhookUrl : "");
}

function updateDiscordStatus(message) {
  const webhookUrl = getDiscordWebhookUrl();
  discordStatus.textContent = message || (webhookUrl ? "Discord updates are on for this device" : "Discord updates are off");
  discordStatus.dataset.mode = webhookUrl ? "synced" : "local";
}

async function sendDiscordUpdate(title, detail, options = {}) {
  const webhookUrl = getDiscordWebhookUrl();

  if (!webhookUrl) {
    return;
  }

  const payload = makeDiscordPayload(title, detail, false, options);
  const content = payload.content;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    updateDiscordStatus("Sent to Discord");
  } catch (error) {
    updateDiscordStatus("Discord update failed");
  }
}

async function saveDiscordWebhook(webhookUrl) {
  localStorage.setItem(discordStorageKey, webhookUrl);
  sharedDiscordWebhookUrl = webhookUrl;
  discordWebhookInput.value = webhookUrl;

  if (cloudSyncReady && discordSettingsRef && updateCloudData) {
    try {
      await updateCloudData(discordSettingsRef, {
        webhookUrl,
        updatedAt: cloudTimestamp ? cloudTimestamp() : Date.now()
      });
      updateDiscordStatus(webhookUrl ? "Discord webhook saved to Firebase" : "Discord webhook cleared from Firebase");
      return;
    } catch (error) {
      updateDiscordStatus("Could not save Discord webhook to Firebase");
    }
  }

  updateDiscordStatus(webhookUrl ? "Discord updates are on for this device" : "Discord updates are off");
}

function makeDiscordPayload(title, detail, includeTimestamp, options = {}) {
  const totalPoints = document.querySelector("#total-points").textContent;
  const completedCount = document.querySelector("#completed-count").textContent;
  const progressText = document.querySelector("#progress-text").textContent;
  const closingMessage = options.message || getRandomCompletionMessage();
  const content = [
    "**Cleaning progress update**",
    `Done: ${title}`,
    `When: ${detail}`,
    `Score now: ${totalPoints} points`,
    `Progress: ${completedCount} ticks, ${progressText}`,
    closingMessage
  ].join("\n");

  return {
    title,
    detail,
    totalPoints,
    completedCount,
    content,
    createdAt: includeTimestamp && cloudTimestamp ? cloudTimestamp() : Date.now()
  };
}

function getRandomCompletionMessage() {
  const index = Math.floor(Math.random() * completionMessages.length);
  return completionMessages[index];
}

function addReward(name, cost) {
  const trimmedName = name.trim();
  const parsedCost = Number.parseInt(cost, 10);

  if (!trimmedName || !Number.isFinite(parsedCost) || parsedCost < 1) {
    return;
  }

  appState.rewards.push({
    id: makeRewardId(),
    name: trimmedName,
    cost: parsedCost,
    redeemed: false
  });

  rewardNameInput.value = "";
  rewardCostInput.value = "";
  saveState();
  updateScores();
}

function makeRewardId() {
  return `reward-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function removeReward(rewardId) {
  appState.rewards = appState.rewards.filter((reward) => reward.id !== rewardId);
  saveState();
  updateScores();
}

function toggleRewardRedeemed(rewardId) {
  const reward = appState.rewards.find((item) => item.id === rewardId);

  if (!reward) {
    return;
  }

  reward.redeemed = !reward.redeemed;
  saveState();
  updateScores();
}

function getRedeemedPoints() {
  return appState.rewards
    .filter((reward) => reward.redeemed)
    .reduce((total, reward) => total + Number(reward.cost || 0), 0);
}

function getAvailablePoints(totalPoints = Number.parseInt(document.querySelector("#total-points").textContent, 10) || 0) {
  return Math.max(totalPoints - getRedeemedPoints(), 0);
}

function renderRewards() {
  const rewards = appState.rewards || [];
  const availablePoints = getAvailablePoints();
  const redeemedPoints = getRedeemedPoints();

  document.querySelector("#spent-points").textContent = redeemedPoints;
  document.querySelector("#reward-count").textContent = rewards.length;
  rewardList.replaceChildren();

  if (rewards.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-shop";
    empty.textContent = "No rewards yet. Add something worth working toward.";
    rewardList.append(empty);
    return;
  }

  rewards.forEach((reward) => {
    const item = document.createElement("article");
    const title = document.createElement("h3");
    const meta = document.createElement("p");
    const controls = document.createElement("div");
    const redeemButton = document.createElement("button");
    const removeButton = document.createElement("button");

    item.className = `reward-item${reward.redeemed ? " reward-redeemed" : ""}`;
    title.textContent = reward.name;
    meta.textContent = `${reward.cost} points${reward.redeemed ? " - redeemed" : ""}`;
    controls.className = "reward-actions admin-only";
    redeemButton.type = "button";
    redeemButton.textContent = reward.redeemed ? "Mark not redeemed" : "Mark redeemed";
    redeemButton.disabled = !reward.redeemed && Number(reward.cost) > availablePoints;
    redeemButton.addEventListener("click", () => toggleRewardRedeemed(reward.id));
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => removeReward(reward.id));

    controls.append(redeemButton, removeButton);
    item.append(title, meta, controls);
    rewardList.append(item);
  });
}

function runMonthEndAutoReset() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isLastDayOfMonth = tomorrow.getDate() === 1;
  const autoResetKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  if (!isLastDayOfMonth || appState.autoResetKey === autoResetKey) {
    return;
  }

  resetTicks("all", {
    autoResetKey,
    title: "Month-end checklist reset",
    detail: "The last day of the month auto reset ran",
    message: "Time to do it all again."
  });
}
