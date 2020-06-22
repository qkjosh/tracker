// Data
const tracker = {
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
    },
    {
      id: 1,
      projectId: 1,
      note: 'Sample note',
      interval: {
        duration: 90000,
        start: '2020-06-15T22:38:00.000Z',
        end: '2020-06-15T22:39:30.000Z',
      }
    },
    {
      id: 2,
      projectId: 1,
      note: 'Generic note',
      interval: {
        duration: 90000,
        start: '2020-06-17T22:38:00.000Z',
        end: '2020-06-17T22:39:30.000Z',
      }
    }
  ],
  timeEntriesAutoNumber: 3
}

// Initialize the tracker's dayEntries property based on the local client time
tracker.dayEntries = tracker.timeEntries.reduce((dayEntries, currentEntry) => {
  let dateKey = getLocalDateKey(currentEntry.interval.start);
  if (dayEntries[dateKey] == null)
    dayEntries[dateKey] = 0;

  // NOTE: Strictly speaking, we should allocate the duration
  // to multiple days if an interval crosses over midnight
  // For the sake of simplicity, we will only allocate
  // to the day a time entry is started
  dayEntries[dateKey] += currentEntry.interval.duration;
  return dayEntries;
}, {});

const projects = {
  'NONE': {
    name: 'No Project',
    duration: 0,
    color: '#000000'
  },
  0: {
    name: 'Test Project',
    duration: 120000,
    color: '#1E48A5'
  },
  1: {
    name: 'Front-End Demo',
    duration: 90000,
    color: '#DC6600'
  }
}

const site = {
  name: 'Tracker Demo'
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
    projectList: document.getElementById('tracker-project-list'),
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
    ui.tracker.input.value = '';
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
    projectId: ui.tracker.projectDropdown.dataset.id || null,
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
  currentEntry.projectId = ui.tracker.projectDropdown.dataset.id || null;
  currentEntry.note = ui.tracker.input.value;

  stopTrackerUpdateLoop();
  addTimeEntryDisplay(currentEntry);

  let project = projects[currentEntry.projectId] || projects['NONE'];
  setProjectDuration(project, project.duration + currentEntry.interval.duration);
}

// Tracker Display
function buildTrackerDisplay() {
  // Build the list of projects available in the tooltip
  const projectFragment = new DocumentFragment();
  for (const [key, value] of Object.entries(projects)) {
    projectFragment.appendChild(createProjectListElement(key, value));
  }
  ui.tracker.projectList.appendChild(projectFragment);

  // Build all the parent day groups and child time entries
  const trackerFragment = new DocumentFragment();
  for (const [key, value] of Object.entries(tracker.dayEntries)) {
    trackerFragment.appendChild(createDayEntryElement(key, value));
  }
  ui.tracker.display.appendChild(trackerFragment);
}

function addTimeEntryDisplay(timeEntry) {
  const dateKey = getLocalDateKey(timeEntry.interval.start);
  if (tracker.dayEntries[dateKey] == null) {
    // Create a new Day Entry block
    tracker.dayEntries[dateKey] = timeEntry.interval.duration;
    ui.tracker.display.appendChild(createDayEntryElement(dateKey, timeEntry.interval.duration));
  } else {
    const dayEntry = document.querySelector(`[data-date="${dateKey}"]`);
    const dayEntryTimer = dayEntry.querySelector('.day-entry__timer');
    const dayEntryTimeEntries =  dayEntry.querySelector('.day-entry__entries');

    // TODO: Consider rounding durations to the nearest second to
    // avoid the situation where you add 1300ms + 1700ms and get 3000ms
    // as each time entry will show 1 second but the total will be 3 seconds

    // Update the total time for the day
    tracker.dayEntries[dateKey] += timeEntry.interval.duration;
    dayEntryTimer.textContent = `Total: ${formatTimeTimer(tracker.dayEntries[dateKey])}`;
    dayEntryTimeEntries.appendChild(createTimeEntryElement(timeEntry));
  }
}

function createProjectListElement(projectId, data) {
  const project = document.createElement('li');
  project.dataset.id = projectId;
  project.textContent = data.name;
  project.style.color = data.color;
  project.classList.add('project-link');
  project.addEventListener('click', () => {
    ui.tracker.projectDropdown.dataset.id = projectId;
    ui.tracker.projectLabel.textContent = data.name;
    ui.tracker.projectLabel.style.color = data.color;
    ui.tracker.projectLabel.classList.add('project-link');
  });
  return project;
}

function createDayEntryElement(dateKey, duration) {
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
    // Compare the day entry and time entry ISO dates
    return isSameDate(parseDateKey(dateKey), new Date(entry.interval.start));
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

  row.dataset.id = timeEntry.id;
  row.classList.add('time-entry');
  note.textContent = timeEntry.note;
  note.classList.add('time-entry__note');
  project.textContent = getProjectName(timeEntry.projectId);
  project.classList.add('time-entry__project', 'project-link');
  project.style.color = getProjectColor(timeEntry.projectId);
  timer.textContent = formatTimeTimer(timeEntry.interval.duration);
  timer.classList.add('tracker__timer');
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
  if (projectId == null)
    return 'No Project';

  return projects[projectId].name;
}

function getProjectColor(projectId) {
  if (projectId == null)
    return '#000000';

  return projects[projectId].color;
}

function setProjectDuration(project, duration) {
  // TODO: Some error handling would be nice,
  // in case we access a non-existent project

  project.duration = duration;
  pieChart.update();
}

function isSameDate(dateA, dateB) {
  return dateA.getFullYear() === dateB.getFullYear() &&
  dateA.getMonth() === dateB.getMonth() &&
  dateA.getDate() === dateB.getDate();
}

// Returns a date in local time with the yyyy-mm-dd format based on an ISO string
function getLocalDateKey(ISOString) {
  return new Date(ISOString).toLocaleDateString('en-ca');
}

// Returns a Date object based on a localized date string of the format yyyy-mm-dd
function parseDateKey(dateKey) {
  let unadjustedDate = new Date(dateKey);
  return new Date(unadjustedDate.getTime() + (unadjustedDate.getTimezoneOffset() * 60 * 1000));
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