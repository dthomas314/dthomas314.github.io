const STORAGE_KEY = "treasure-quest";
const IS_CLOSE_METERS = 20;
const DEGREES_PER_METER = 0.000009;
let gIsTest = false;
let gStepCount = 0;
let gCurrentStep = 1;


function setupQuest() {  
  if(document.location.href.indexOf('?test=1') > 0)
    gIsTest = true;

  //Setup current state
  restoreQuestState();
  
  //Add steps
  let questSteps = document.querySelector('#questSteps');
  addStep(questSteps);
  addStep(questSteps);
}



function addStep(questSteps) {
  let newStep = document.createElement('div');
  let stepNumber = gStepCount + 1;

  newStep.id = 'questStep' + stepNumber;
  newStep.classList.add('questStep');
  if(stepNumber === gCurrentStep)
    newStep.classList.add('questStepActive');
  newStep.innerText = 'Go to the Tot Lot' + ' - Step ' + stepNumber;

  if(gIsTest) {
    let testButton = document.createElement('a');
    testButton.href = 'javascript:';
    testButton.addEventListener('click', function() {
      goNextStep();
    });
    testButton.innerText = "Next Step";
    testButton.classList.add('testButton');
    newStep.appendChild(testButton);
  }

  questSteps.appendChild(newStep);
  gStepCount++;
}



function goNextStep() {
  document.querySelector('#questStep' + gCurrentStep).classList.remove('questStepActive');

  gCurrentStep++;
  saveQuestState();

  document.querySelector('#questStep' + gCurrentStep).classList.add('questStepActive');
}



function resetQuest() {
  document.querySelector('#questStep' + gCurrentStep).classList.remove('questStepActive');

  gCurrentStep = 1;
  saveQuestState();

  document.querySelector('#questStep' + gCurrentStep).classList.add('questStepActive');
}



function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(showPosition, showError);
    } else {
        document.getElementById('location').innerHTML = 'Location not supported.';
    }
}



function showPosition(position) {
    const locationElement = document.querySelector('#location');
    /*
    locationElement.innerHTML = 'Latitude: ' + position.coords.latitude + '<br />'
                                                    + 'Longitude: ' + position.coords.longitude + '<br />'
                                                    + 'Accuracy: ' + position.coords.accuracy + '<br />'
                                                    + '';
    */

    //Goal:  43.566439, -116.140272
    //Test: 43.566428, -116.140091
    const goalPosition = {coords:{latitude:43.566439, longitude:-116.140272}};

    locationElement.innerHTML = '';
    if (isCloseEstimate(position, goalPosition)) {
      locationElement.innerHTML += 'Estimate: Close<br />';
    } else {
      locationElement.innerHTML += 'Estimate: Far<br />';
    }

    if (isClose(position, goalPosition)) {
      locationElement.innerHTML += 'Accurate: Close<br />';
    } else {
      locationElement.innerHTML += 'Accurate: Far<br />';
    }
}



function showError(error) {
    if (error.PERMISSION_DENIED) {
        document.getElementById("location").innerHTML = 'Location sharing denied.';
    }
}



function isClose(checkPosition, goalPosition) {
  let R = 6378.137; // Radius of earth in KM
  let dLat = goalPosition.coords.latitude * Math.PI / 180 - checkPosition.coords.latitude * Math.PI / 180;
  let dLon = goalPosition.coords.longitude * Math.PI / 180 - checkPosition.coords.longitude * Math.PI / 180;
  let a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(checkPosition.coords.latitude * Math.PI / 180) * Math.cos(goalPosition.coords.latitude * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  let d = R * c * 1000; // Meters

  return (d < IS_CLOSE_METERS);
}



function isCloseEstimate(checkPosition, goalPosition) {
  return Math.abs(checkPosition.coords.latitude - goalPosition.coords.latitude) < IS_CLOSE_METERS * DEGREES_PER_METER
    && Math.abs(checkPosition.coords.longitude - goalPosition.coords.longitude) < IS_CLOSE_METERS * DEGREES_PER_METER
}



function saveQuestState() {
  const questState = {step: gCurrentStep};

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(questState));
}



function restoreQuestState() {
  const data = window.localStorage.getItem(STORAGE_KEY);
  const questState = data ? JSON.parse(data) : {step: 1};

  gCurrentStep = questState.step;
}



//getLocation();
setupQuest();

/*
const newPeriodFormEl = document.getElementsByTagName("form")[0];
const startDateInputEl = document.getElementById("start-date");
const endDateInputEl = document.getElementById("end-date");
const pastPeriodContainer = document.getElementById("past-periods");

// Listen to form submissions.
newPeriodFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const startDate = startDateInputEl.value;
  const endDate = endDateInputEl.value;
  if (checkDatesInvalid(startDate, endDate)) {
    return;
  }
  storeNewPeriod(startDate, endDate);
  renderPastPeriods();
  newPeriodFormEl.reset();
});

function checkDatesInvalid(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) {
    newPeriodFormEl.reset();
    return true;
  }
  return false;
}

function storeNewPeriod(startDate, endDate) {
  const periods = getAllStoredPeriods();
  periods.push({ startDate, endDate });
  periods.sort((a, b) => {
    return new Date(b.startDate) - new Date(a.startDate);
  });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(periods));
}

function getAllStoredPeriods() {
  const data = window.localStorage.getItem(STORAGE_KEY);
  const periods = data ? JSON.parse(data) : [];
  console.dir(periods);
  console.log(periods);
  return periods;
}

function renderPastPeriods() {
  const pastPeriodHeader = document.createElement("h2");
  const pastPeriodList = document.createElement("ul");
  const periods = getAllStoredPeriods();
  if (periods.length === 0) {
    return;
  }
  pastPeriodContainer.textContent = "";
  pastPeriodHeader.textContent = "Past periods";
  periods.forEach((period) => {
    const periodEl = document.createElement("li");
    periodEl.textContent = `From ${formatDate(
      period.startDate,
    )} to ${formatDate(period.endDate)}`;
    pastPeriodList.appendChild(periodEl);
  });

  pastPeriodContainer.appendChild(pastPeriodHeader);
  pastPeriodContainer.appendChild(pastPeriodList);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { timeZone: "UTC" });
}

renderPastPeriods();
*/
