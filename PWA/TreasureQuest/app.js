const STORAGE_KEY = "treasure-quest";
const SUCCESS_SOUND = new Audio('assets/success.mp3');
const FAILURE_SOUND = new Audio('assets/failure.mp3');
let gIsTest = true;
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
    stepElement.innerHTML = '<h2>Congratulations, you completed your quest!</h2>';
    canvas.appendChild(stepElement);
  } else {  //Draw current step
    let currentStep = gQuest.steps[gCurrentStep];
    let stepElement = document.createElement('div');

    //Overall holder for step
    stepElement.classList.add('questStep');

    //Display text
    let directions = document.createElement('div');
    directions.classList.add('directions');
    directions.innerHTML = currentStep.directions;
    stepElement.appendChild(directions);

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
            SUCCESS_SOUND.play();
            goNextStep();
          } else {
            FAILURE_SOUND.play();
            alert('Sorry, that isn\'t the right answer.');
          }
        });
        submitButton.innerText = currentStep.button;
        submitButton.classList.add('btn');
        submitButton.classList.add('btn-primary');
        stepElement.appendChild(submitButton);      
        break;
      case 'location':
        let watchID = null;

        //Block for displaying location errors
        let locationError = document.createElement('div');
        locationError.classList.add('error');
        locationError.style.display = 'none';
        stepElement.appendChild(locationError);

        //Block for displaying success
        let arrived = document.createElement('div');
        arrived.style.display = 'none';
        arrived.innerText = 'You\'re there!';
        let doneButton = document.createElement('a');
        doneButton.href = 'javascript:';
        doneButton.addEventListener('click', function() {
          navigator.geolocation.clearWatch(watchID);
          watchID = null;
          goNextStep();
        });
        doneButton.innerText = currentStep.button;
        doneButton.classList.add('btn');
        doneButton.classList.add('btn-primary');
        arrived.appendChild(doneButton);
        stepElement.appendChild(arrived);         

        if (navigator.geolocation) {
          watchID = navigator.geolocation.watchPosition((position) => {
            /*
            locationError.innerHTML = 'Latitude: ' + position.coords.latitude + '<br />'
            + 'Longitude: ' + position.coords.longitude + '<br />'
            + 'Accuracy: ' + position.coords.accuracy + '<br />'
            + '';
            locationError.style.display = 'block';
            */

            locationError.style.display = 'none';
            //if (isCloseEstimate(position, currentStep.destination)) {
            if (isCloseEstimate(position, currentStep.destination)) {
              if(arrived.style.display !== 'block') SUCCESS_SOUND.play();

              arrived.style.display = 'block';
            } else {
              arrived.style.display = 'none';
            }           
          },
          //error
          (error) => {
            if (error.PERMISSION_DENIED) {
              locationError.innerText = 'Location is required to complete quest.';
              locationError.style.display = 'block';
          }
          });
        } else {
          locationError.innerText = 'Your device does not support location sharing, which is required to complete quest.';
          locationError.style.display = 'block';
        }
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




function isClose(checkPosition, destination) {
  let R = 6378.137; // Radius of earth in KM
  let dLat = destination.coords.latitude * Math.PI / 180 - checkPosition.coords.latitude * Math.PI / 180;
  let dLon = destination.coords.longitude * Math.PI / 180 - checkPosition.coords.longitude * Math.PI / 180;
  let a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(checkPosition.coords.latitude * Math.PI / 180) * Math.cos(destination.coords.latitude * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  let d = R * c * 1000; // Meters

  return (d < destination.proximityMeters);
}



function isCloseEstimate(checkPosition, destination) {
  const DEGREES_PER_METER = 0.000009;

  return Math.abs(checkPosition.coords.latitude - destination.coords.latitude) < destination.proximityMeters * DEGREES_PER_METER
    && Math.abs(checkPosition.coords.longitude - destination.coords.longitude) < destination.proximityMeters * DEGREES_PER_METER
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



setupQuest();