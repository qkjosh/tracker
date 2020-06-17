// Data
const tracker = {
  dayEntries: {
    '2020-06-15': 120000
  },
  state: {
    isTracking: false,
    currentlyTracking: 0
  },
  timeEntries: [{
      id: 0,
      projectId: 0,
      note: 'Test note',
      interval: {
        duration: 120000,
        start: '2020-06-15T23:38:00.000Z',
        end: '2020-06-15T23:40:00.000Z',
      }
    }
  ],
  timeEntriesAutoNumber: 1
}

const projects = {
  0: {
    name: 'Test Project #1',
    duration: 120000,
    color: '#1E48A5'
  }
}

const site = {
  name: 'Tracker Demo',
  gmt: 'GMT-0500'
}

const ui = {
  menu: {
    tracker: document.getElementById('menu-tracker'),
    reports: document.getElementById('menu-reports'),
    projects: document.getElementById('menu-projects'),
  },
  tracker: {
    input: document.getElementById('tracker-input'),
    projectDropdown: document.getElementById('tracker-project-dropdown'),
    projectLabel: document.getElementById('tracker-project-label'),
    timer: document.getElementById('tracker-timer'),
    button: document.getElementById('tracker-button'),
    display: document.getElementById('tracker-display')
  }
}

// Attach Listeners
document.addEventListener('DOMContentLoaded', () => {
  buildTrackerDisplay();
});

ui.tracker.button.addEventListener('click', () => {
  if (tracker.state.isTracking === true) {
    ui.tracker.button.textContent = 'Start';
    ui.tracker.button.classList.remove('button--stop');
    ui.tracker.button.classList.add('button--start');
    stopTracking();
  } else {
    ui.tracker.button.textContent = 'Stop';
    ui.tracker.button.classList.remove('button--start');
    ui.tracker.button.classList.add('button--stop');
    createTimeEntry();
  }
});

// Core Methods
function createTimeEntry() {
  const newEntry = {
    id: tracker.timeEntriesAutoNumber,
    projectId: 0, // TEMP
    note: ui.tracker.input.value,
    interval: {
      duration: null,
      start: new Date().toISOString(),
      end: null
    }
  };

  // Create and track new time entry
  tracker.timeEntries.push(newEntry);
  tracker.timeEntriesAutoNumber++;
  startTracking(newEntry.id);
}

function startTracking(timeEntryId) {
  if (timeEntryId == null)
    timeEntryId = tracker.state.currentlyTracking;

  tracker.state.currentlyTracking = timeEntryId;
  tracker.state.isTracking = true;

  trackerUpdateLoop(findTimeEntry(timeEntryId));
}

function stopTracking(timeEntryId) {
  if (timeEntryId == null)
    timeEntryId = tracker.state.currentlyTracking;

  tracker.state.isTracking = false;
  let currentEntry = findTimeEntry(timeEntryId);
  currentEntry.interval.end = new Date().toISOString();
  currentEntry.interval.duration = new Date(currentEntry.interval.end) - new Date(currentEntry.interval.start);

  stopTrackerUpdateLoop();
  addTimeEntryDisplay(currentEntry);
}


// Tracker Display
function buildTrackerDisplay() {
  const fragment = new DocumentFragment();
  for (const [key, value] of Object.entries(tracker.dayEntries)) {
    fragment.appendChild(createDayEntryElement(key, value));
  }
  ui.tracker.display.appendChild(fragment);
}

function addTimeEntryDisplay(timeEntry) {
  const dateKey = new Date(timeEntry.interval.start).toLocaleDateString('en-ca');
  if (tracker.dayEntries[dateKey] == null) {
    // Create a new Day Entry block
    tracker.dayEntries[dateKey] = timeEntry.interval.duration;
    ui.tracker.display.appendChild(createDayEntryElement(dateKey, timeEntry.interval.duration));
  } else {
    const dayEntry = document.querySelector(`[data-date="${dateKey}"]`);
    const dayEntryTimer = dayEntry.querySelector('.day-entry__timer');
    const dayEntryTimeEntries =  dayEntry.querySelector('.day-entry__entries');

    // Update the total time for the day
    tracker.dayEntries[dateKey] += timeEntry.interval.duration;
    dayEntryTimer.textContent = `Total: ${formatTimeTimer(tracker.dayEntries[dateKey])}`;
    dayEntryTimeEntries.appendChild(createTimeEntryElement(timeEntry));
  }
}

function createDayEntryElement(dateKey, duration) {
  // Assume that dayEntries are stored using the date after applying the GMT offset
  let date = new Date(`${dateKey} ${site.gmt}`);
      
  // A templating engine would make this easier
  const block = document.createElement('div');
  const header = document.createElement('div');
  const entries = document.createElement('div');
  const dateText = document.createElement('div');
  const totalText = document.createElement('div');

  block.dataset.date = dateKey;
  block.dataset.duration = duration;
  block.classList.add('day-entry');
  header.classList.add('day-entry__header');
  entries.classList.add('day-entry__entries');
  dateText.textContent = dateKey;
  totalText.textContent = `Total: ${formatTimeTimer(duration)}`;
  totalText.classList.add('day-entry__timer');

  header.appendChild(dateText);
  header.appendChild(totalText);
  block.appendChild(header);

  tracker.timeEntries.filter(entry => {
    // Since we're not using a time parsing library,
    // to simplify we'll assume that the site's gmt
    // offset is the same as the local client
    let entryDate = new Date(entry.interval.start);
    return isSameDate(entryDate, date);
  }).forEach(timeEntry => {
    // TODO: Group time entries based on identical notes
    entries.appendChild(createTimeEntryElement(timeEntry));
  });

  block.appendChild(entries);
  return block;
}

function createTimeEntryElement(timeEntry) {
  const row = document.createElement('div');
  const note = document.createElement('div');
  const project = document.createElement('div');
  const timer = document.createElement('div');
  const button = document.createElement('button');

  row.classList.add('time-entry');
  note.textContent = timeEntry.note;
  note.classList.add('time-entry__note');
  project.textContent = getProjectName(timeEntry.projectId);
  project.classList.add('time-entry__project');
  timer.textContent = formatTimeTimer(timeEntry.interval.duration);
  button.textContent = '▶';
  button.classList.add('button', 'button--start');

  row.appendChild(note);
  row.appendChild(project);
  row.appendChild(timer);
  row.appendChild(button);
  return row;
}

// Tracker Update Loop
function trackerUpdateLoop(currentEntry, referenceDateTime) {
  if (currentEntry == null)
    throw new Exception('Time Entry is invalid');

  if (referenceDateTime == null)
    referenceDateTime = new Date(currentEntry.interval.start);

  const now = new Date();
  const interval = now - referenceDateTime;
  document.title = `${formatTimeLong(interval)} • ${site.name}`;
  ui.tracker.timer.textContent = formatTimeTimer(interval);

  // Timeout is not guaranteed to run on time when tab has 
  // lost focus, so we'll use a half-second interval instead
  setTimeout(() => {
    if (tracker.state.isTracking === true) {
      trackerUpdateLoop(currentEntry, referenceDateTime);
    }
  }, 500);
}

function stopTrackerUpdateLoop() {
  document.title = site.name;
  ui.tracker.timer.textContent = formatTimeTimer(0);
}

// Helpers
function findTimeEntry(timeEntryId) {
  return tracker.timeEntries.find(entry => entry.id === timeEntryId);
}

function getProjectName(projectId) {
  return projects[projectId].name;
}

function isSameDate(dateA, dateB) {
  return dateA.getFullYear() === dateB.getFullYear() &&
  dateA.getMonth() === dateB.getMonth() &&
  dateA.getDate() === dateB.getDate();
}

// Formatting
function formatTimeLong(ms) {
  const seconds = Math.trunc(ms / 1000);
  const minutes = Math.trunc(seconds / 60);
  const hours = Math.trunc(minutes / 24);
  if (seconds < 60) {
    return `${seconds} sec`;
  } else if (seconds < 3600) {
    return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')} min`;
  } else {
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')} hrs`;
  }
}

function formatTimeTimer(ms) {
  const seconds = Math.trunc(ms / 1000);
  const minutes = Math.trunc(seconds / 60);
  const hours = Math.trunc(minutes / 24);
  return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; 
}