import { checklistDatabasePath, discordEventsDatabasePath, discordSettingsDatabasePath, firebaseConfig, firebaseEnabled } from "./firebase-config.js";
import { discordEnabled, discordWebhookUrl } from "./discord-config.js";

const storageKey = "flat-cleaning-checklist-v1";
const discordStorageKey = "flat-cleaning-discord-webhook-v1";
const dailyPointValue = 1;
const weeklyPointValue = 5;
const dayNamesShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayNamesLong = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const syncStatus = document.querySelector("#sync-status");

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

setupDiscordControls();
updateScores();
setupCloudSync();

function readSavedState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || { checked: {}, notes: "" };
  } catch (error) {
    return { checked: {}, notes: "" };
  }
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
    if (checkbox.checked) {
      appState.checked[checkboxId] = true;
      sendDiscordUpdate(`${task.room} - Step ${task.step}: ${task.name}`, `${listTypeLabel(listType)} ${labelText} ticked`);
    } else {
      delete appState.checked[checkboxId];
    }

    saveState();
    updateScores();
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
  document.querySelector("#completed-count").textContent = `${completed} / ${total}`;
  document.querySelector("#progress-fill").style.width = `${progress}%`;
  document.querySelector("#progress-text").textContent = `${progress}% complete`;
}

function renderSavedState() {
  document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = Boolean(appState.checked[checkbox.dataset.id]);
  });

  notes.value = appState.notes || "";
  updateScores();
}

function resetTicks(listType) {
  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));

  checkboxes.forEach((checkbox) => {
    if (listType === "all" || checkbox.dataset.list === listType) {
      checkbox.checked = false;
      delete appState.checked[checkbox.dataset.id];
    }
  });

  saveState();
  updateScores();
  sendDiscordUpdate("Checklist reset", `${listTypeLabel(listType)} ticks were reset`);
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
      saveState({ skipCloud: true });
      renderSavedState();
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

async function sendDiscordUpdate(title, detail) {
  const webhookUrl = getDiscordWebhookUrl();

  if (!webhookUrl) {
    return;
  }

  const payload = makeDiscordPayload(title, detail, false);
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

function makeDiscordPayload(title, detail, includeTimestamp) {
  const totalPoints = document.querySelector("#total-points").textContent;
  const completedCount = document.querySelector("#completed-count").textContent;
  const content = [
    `**${title}**`,
    detail,
    `Points: ${totalPoints}`,
    `Ticks: ${completedCount}`
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
