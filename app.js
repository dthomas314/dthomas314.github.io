// Add the storage key as an app-wide constant
const STORAGE_KEY = "treasure-quest";
const IS_CLOSE_METERS = 20;
const DEGREES_PER_METER = 0.000009;

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

getLocation();

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
