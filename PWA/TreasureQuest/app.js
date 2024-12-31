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
  addSteps();
}



function addSteps() {
  let questSteps = document.querySelector('#questSteps');

  fetch("quests/test.json")
  .then((res) => {
      if (!res.ok) {
          throw new Error
              (`HTTP error! Status: ${res.status}`);
      }
      return res.json();
  })
  .then((data) => {    
    for(let stepIndex = 0; stepIndex < data.steps.length; stepIndex++) {
      addStep(questSteps, data.steps[stepIndex]);
    }
  })
  .catch((error) =>
      console.error("Unable to fetch data:", error));
}



function addStep(questSteps, stepData) {
  let newStep = document.createElement('div');
  let stepNumber = gStepCount + 1;

  newStep.id = 'questStep' + stepNumber;
  newStep.classList.add('questStep');
  if(stepNumber === gCurrentStep)
    newStep.classList.add('questStepActive');
  newStep.innerText = stepData.directions;

  if(gIsTest) {
    let testButton = document.createElement('a');
    testButton.href = 'javascript:';
    testButton.addEventListener('click', function() {
      goNextStep();
    });
    testButton.innerText = "TEST: Skip to Next Step";
    testButton.classList.add('testButton');
    testButton.classList.add('btn');
    testButton.classList.add('btn-warning');
    
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
    /*
    let locationElement = document.createElement('div');
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