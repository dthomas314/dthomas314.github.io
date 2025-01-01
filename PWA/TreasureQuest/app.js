const STORAGE_KEY = "treasure-quest";
const IS_CLOSE_METERS = 20;
const DEGREES_PER_METER = 0.000009;
let gIsTest = false;
let gQuest = {};
let gCurrentStep = 0;


function setupQuest() {  
  if(document.location.href.indexOf('?test=1') > 0)
    gIsTest = true;

  //Setup current state
  restoreQuestState();

  //Load quest
  loadQuest();
}



function loadQuest() {
  fetch("quests/test.json")
  .then((res) => {
      if (!res.ok) {
          throw new Error
              (`HTTP error! Status: ${res.status}`);
      }
      return res.json();
  })
  .then((data) => {   
    gQuest = data; 
    drawCurrentStep();
  })
  .catch((error) =>
      console.error("Unable to fetch data:", error));
}



function drawCurrentStep() {
  let canvas = document.querySelector('#canvas');
  canvas.innerHTML = '';

  if(gCurrentStep < 0) {
    gCurrentStep = 0;
  }

  if(gCurrentStep >= gQuest.steps.length) { //Done
    let stepElement = document.createElement('div');
    stepElement.innerText = 'Congratulations, you completed your quest!';
    canvas.appendChild(stepElement);
  } else {  //Draw current step
    let currentStep = gQuest.steps[gCurrentStep];
    let stepElement = document.createElement('div');

    //Overall holder for step
    stepElement.classList.add('questStep');

    //Display text
    stepElement.innerText = currentStep.directions;

    //Determine input controls based on type of step
    switch(currentStep.type) {
      case 'message':
        let nextButton = document.createElement('a');
        nextButton.href = 'javascript:';
        nextButton.addEventListener('click', function() {
          goNextStep();
        });
        nextButton.innerText = currentStep.button;
        nextButton.classList.add('btn');
        nextButton.classList.add('btn-primary');
        stepElement.appendChild(nextButton);      
        break;
      case 'question':
        let stepInput = document.createElement('input');
        stepInput.type = 'text'
        stepInput.classList.add('form-control');
        stepElement.appendChild(stepInput);   

        let submitButton = document.createElement('a');
        submitButton.href = 'javascript:';
        submitButton.addEventListener('click', function() {
          if(stepInput.value == currentStep.answer) {
            goNextStep();
          } else {
            alert('Sorry, that isn\'t the right answer.');
          }
        });
        submitButton.innerText = currentStep.button;
        submitButton.classList.add('btn');
        submitButton.classList.add('btn-primary');
        stepElement.appendChild(submitButton);      
        break;
      case 'location':

        break;
    }

    //Add a skip button if in test mode
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
      
      stepElement.appendChild(testButton);
    }

    //Add step to DOM
    canvas.appendChild(stepElement);
  }        
}



function goNextStep() {
  gCurrentStep++;
  saveQuestState();
  drawCurrentStep();
}



function resetQuest() {
  gCurrentStep = 0;
  saveQuestState();
  drawCurrentStep();
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
  const questState = data ? JSON.parse(data) : {step: 0};

  gCurrentStep = questState.step;
}



//getLocation();
setupQuest();