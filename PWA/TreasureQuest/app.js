const TEST_MODE = true;
const DEBUG_AREA = document.querySelector('#debug');
const STORAGE_KEY = "treasure-quest";
const SUCCESS_SOUND = new Audio('assets/success.mp3');
const FAILURE_SOUND = new Audio('assets/failure.mp3');
const COMPASS_DEFAULT_ROTATION = 90;

const questDB = new QuestDB();
let gAllQuests = new QuestCollection();
let gQuest = {};
let gCurrentQuestID = 0;
let gCurrentStep = 0;
let gTimerInterval = null;
let gTimerEnd = null;
let gDestinationBearing = 0;
let gCompassHeading = 0;


function initialize() {
  if(TEST_MODE) {
    DEBUG_AREA.style.display = 'block';
    DEBUG_AREA.innerText += "TODO: Refactor";
    let checkDBBtn = document.querySelector('#checkDBBtn');
    checkDBBtn.style.display = 'inline';    
  }

  if (isIos() && !isInStandaloneMode()) {
    document.querySelector('#iosInstall').style.display = 'block';
  }  

  questDB.connect()
  .then((message) => {
    let questID = getCurrentQuest();

    if(questID) {
      playQuest(questID);
    } else {
      loadAllQuests();
    }
  })
  .catch((error) => {
    alert(`Unable to connect to database: ${error}`);
  });
}



function loadAllQuests() {
  let menuArea = document.querySelector('#menuArea');
  let menuCanvas = document.querySelector('#menuCanvas');
  let questArea = document.querySelector('#questArea');
  let restartQuestBtn = document.querySelector('#restartQuestBtn');

  menuArea.style.display = 'block';
  menuCanvas.innerHTML = '';
  questArea.style.display = 'none';
  restartQuestBtn.style.display = 'none';

  setCurrentQuest(null);

  fetch("quests.json")
  .then((res) => {
      if (!res.ok) {
          throw new Error
              (`HTTP error! Status: ${res.status}`);
      }
      return res.json();
  })
  .then((data) => {   
    gAllQuests.quests = data.quests;

    for(let questIndex = 0; questIndex < gAllQuests.quests.length; questIndex++) {
      questDB.getQuest(gAllQuests.quests[questIndex].questID)
      .then((quest) => {
        if(quest) {
          addQuestToMenu(gAllQuests.quests[questIndex], quest);
        } else {
          questDB.addQuest(gAllQuests.quests[questIndex])
          .then((quest) => {
            addQuestToMenu(gAllQuests.quests[questIndex], quest);
          });
        }
      })
      .catch((error) => {
        console.error(error);
      });      
    }
  })
  .catch((error) =>
      console.error("Unable to fetch data:", error));
}



function addQuestToMenu(newQuest, dbQuest) {
  let menuCanvas = document.querySelector('#menuCanvas');
  let menuElement = document.createElement('div');
  menuElement.classList.add('card');

  let cardBodyElement = document.createElement('div');
  cardBodyElement.classList.add('card-body');
  let nameElement = document.createElement('h3');
  nameElement.classList.add('card-title');  
  nameElement.innerText = newQuest.name;
  cardBodyElement.appendChild(nameElement);
  let locationElement = document.createElement('div');
  locationElement.innerText = "Location: " + newQuest.location;
  cardBodyElement.appendChild(locationElement);
  
  let statusElement = document.createElement('div');
  statusElement.classList.add('card-text');
  let needDownload = true;  
  let canPlay = false;
   

  if(dbQuest.downloadedVersion === null) {
    statusElement.innerText = "Status: not downloaded";
  } else {
    if(dbQuest.downloadedVersion === newQuest.version) {
      statusElement.innerText = "Status: current";
      needDownload = false;
      canPlay = true;    
    } else {
      statusElement.innerText = "Status: update needed";
      canPlay = true;
    }
  }
  cardBodyElement.appendChild(statusElement);

  if(needDownload) {
    let downloadButton = document.createElement('a');    
    downloadButton.href = 'javascript:';
    downloadButton.addEventListener('click', function() {
      downloadQuest(newQuest.questID, this);
    });
    downloadButton.innerText = 'Download';
    downloadButton.classList.add('btn');
    downloadButton.classList.add('btn-secondary');
    cardBodyElement.appendChild(downloadButton);
  }


  if(canPlay) {
    let playButton = document.createElement('a');
    playButton.style.marginLeft = "10px";
    playButton.href = 'javascript:';
    playButton.addEventListener('click', function() {
      playQuest(newQuest.questID);
    });
    if(dbQuest.currentStep > 0)
      playButton.innerText = 'Resume';
    else
      playButton.innerText = 'Play';
    playButton.classList.add('btn');
    playButton.classList.add('btn-primary');
    cardBodyElement.appendChild(playButton);
  }

  menuElement.appendChild(cardBodyElement);

  menuCanvas.appendChild(menuElement);
}




async function downloadQuest(questID, btn) {
  startProcessingDownload(btn);

  let newQuest = gAllQuests.getByID(questID);
  let dbQuest = await questDB.updateQuestJSON(newQuest);

  if(dbQuest) {
    let assets = Quest.getQuestAssets(dbQuest);

    for(assetIndex = 0; assetIndex < assets.length; assetIndex++) {
      let path = await questDB.updateAsset(questID, assets[assetIndex]);
      
      console.log(`${assetIndex+1} of ${assets.length}: ${path}`);   
    }

    await questDB.updateQuestVersion(newQuest);

    loadAllQuests();
  } else {
    console.log('JSON load failed');
  }
}



async function playQuest(questID) {
  let menuArea = document.querySelector('#menuArea');
  let questArea = document.querySelector('#questArea');
  let canvas = document.querySelector('#canvas');
  let restartQuestBtn = document.querySelector('#restartQuestBtn');
  let questName = document.querySelector('#questName');

  menuArea.style.display = 'none';
  questArea.style.display = 'block';
  restartQuestBtn.style.display = 'inline';

  gCurrentQuestID = questID;
  setCurrentQuest(gCurrentQuestID);

  let dbQuest = await questDB.getQuest(questID);
  gQuest = dbQuest.questJSON;

  questName.innerText = dbQuest.name;
  gCurrentStep = dbQuest.currentStep;

  drawCurrentStep();
}




async function drawCurrentStep() {
  let rootURL = window.location.protocol + '//' + window.location.host;
  let canvas = document.querySelector('#canvas');
  let navBox = document.querySelector('#navBox')

  canvas.innerHTML = '';
  navBox.style.display = 'none';

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
    let assetElements = Quest.getStepAssetElements(currentStep);
    let directionMarkup = currentStep.directions;
    for(assetIndex = 0; assetIndex < assetElements.length; assetIndex++) {
      let originalMarkup = assetElements[assetIndex].outerHTML;
      let path = assetElements[assetIndex].src;
      if (path.indexOf('http') != 0)
        path = rootURL + '/' + path;
      let asset = await questDB.getAsset(path);
      assetElements[assetIndex].src = window.URL.createObjectURL(asset.blob);
      let newMarkup = assetElements[assetIndex].outerHTML;
      directionMarkup = directionMarkup.replace(originalMarkup, newMarkup);
    }
    directions.innerHTML = directionMarkup;
    stepElement.appendChild(directions);

    //Check for countdown
    if(currentStep.countdown) {
      let timer = document.createElement('div');
      timer.classList.add('timer');
      stepElement.appendChild(timer);

      gTimerEnd = new Date(new Date().getTime() + (currentStep.countdown.minutes * 60000) + (currentStep.countdown.seconds * 1000));
      gTimerInterval = setInterval(() => {
        let now = new Date().getTime();
        let distance = gTimerEnd - now;
        
        if(distance <= 0) {
          stopTimer();
          alert('Sorry, time\'s up');
          gCurrentStep = 0;
          saveQuestState();
          drawCurrentStep();          
        } else {
          let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          let seconds = '0' + Math.floor((distance % (1000 * 60)) / 1000);

          timer.innerHTML = minutes + ':' + seconds.substring(seconds.length - 2);
        }                
      }, 1000);
    }

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
        let stepInput;
        if(currentStep.input == 'dropdown') {
          stepInput = document.createElement('select');
          let newOption = document.createElement('option');
          newOption.value = currentStep.initialOption.value;
          newOption.text = currentStep.initialOption.text;
          stepInput.appendChild(newOption);          
          for(let optionIndex = 0; optionIndex < currentStep.options.length; optionIndex++) {
            let newOption = document.createElement('option');
            newOption.value = currentStep.options[optionIndex].value;
            newOption.text = currentStep.options[optionIndex].text;
            stepInput.appendChild(newOption);
          }
        } else {
          stepInput = document.createElement('input');
          stepInput.type = 'text'
        }
        stepInput.classList.add('form-control');
        stepElement.appendChild(stepInput);   

        let submitButton = document.createElement('a');
        submitButton.href = 'javascript:';
        submitButton.addEventListener('click', function() {
          let isCorrect = false;

          if(currentStep.input == 'dropdown') {
            if(stepInput.selectedIndex > 0) {
              isCorrect = (stepInput.options[stepInput.selectedIndex].value === currentStep.answer);
            }
          } else {
            isCorrect = (stepInput.value === currentStep.answer);
          }
          if(isCorrect) {
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

        navBox.style.display = 'block';

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
          const options = {enableHighAccuracy: true,timeout: 5000,maximumAge: 0,desiredAccuracy: 0, frequency: 500 };
          watchID = navigator.geolocation.watchPosition((position) => {
            DEBUG_AREA.innerHTML = 'Goal: {lat:' + currentStep.destination.coords.latitude + ', lon: ' + currentStep.destination.coords.longitude + ', prox: ' + currentStep.destination.proximityMeters + '}<br />' +
                          'Current: {lat:' + position.coords.latitude + ', lon: ' + position.coords.longitude + ', acc: ' + position.coords.accuracy + '}<br />' +
                          '(' + Date.now() + ')';

            locationError.style.display = 'none';

            gDestinationBearing = getBearing(position.coords.latitude, position.coords.longitude, currentStep.destination.coords.latitude, currentStep.destination.coords.longitude);
            DEBUG_AREA.innerHTML += '<div>Bearing: ' + gDestinationBearing + '</div>';
            DEBUG_AREA.innerHTML += '<div>Device Heading: ' + gCompassHeading + '</div>';
            DEBUG_AREA.innerHTML += '<div>Declination: ' + gQuest.declination + '</div>';            
            let rotation = parseInt(gDestinationBearing - gCompassHeading - COMPASS_DEFAULT_ROTATION - gQuest.declination);
            document.querySelector('#navArrow').style.transform = `rotate(${rotation}deg)`;

            if (isCloseEstimate(position, currentStep.destination)) {
              if(arrived.style.display !== 'block') SUCCESS_SOUND.play();

              stopTimer();

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
          },
          options);
        } else {
          locationError.innerText = 'Your device does not support location sharing, which is required to complete quest.';
          locationError.style.display = 'block';
        }
        break;
      case 'timed':
        gTimerEnd = new Date(new Date().getTime() + (currentStep.timer.minutes * 60000) + (currentStep.timer.seconds * 1000));
        console.log(gTimerEnd);
        gTimerInterval = setInterval(() => {
          let now = new Date().getTime();
          let distance = gTimerEnd - now;
          
          if(distance <= 0) {
            stopTimer();

            if(currentStep.alert) {
              alert(currentStep.alert);
            }
            
            let nextButton = document.createElement('a');
            nextButton.href = 'javascript:';
            nextButton.addEventListener('click', function() {
              goNextStep();
            });
            nextButton.innerText = currentStep.button;
            nextButton.classList.add('btn');
            nextButton.classList.add('btn-primary');
            stepElement.appendChild(nextButton);
          }                
        }, 1000);        
        break;
    }

    //Add a skip button if in test mode
    if(TEST_MODE) {
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
  stopTimer();
  gCurrentStep++;
  saveQuestState();
  drawCurrentStep();
}



function resetQuest() {
  stopTimer(); 
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



function toRadians(degrees) {
  return degrees * Math.PI / 180;
}



function toDegrees(radians) {
  return radians * 180 / Math.PI;
}



function getBearing(startLat, startLng, destLat, destLng) {
  startLat = toRadians(startLat);
  startLng = toRadians(startLng);
  destLat = toRadians(destLat);
  destLng = toRadians(destLng);

  const y = Math.sin(destLng - startLng) * Math.cos(destLat);
  const x = Math.cos(startLat) * Math.sin(destLat) -
            Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
  const bearingRad = Math.atan2(y, x);
  const bearingDeg = toDegrees(bearingRad);

  return (bearingDeg + 360) % 360;
}




async function saveQuestState() {
  await questDB.updateQuestStep(gCurrentQuestID, gCurrentStep);
}



function getCurrentQuest() {
  const data = window.localStorage.getItem(STORAGE_KEY);
  const questState = data ? JSON.parse(data) : {questID: null};

  return questState.questID;
}



function setCurrentQuest(questID) {
  const questState = {questID: questID};
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(questState));
}



function stopTimer() {
  if(gTimerInterval) {
    clearInterval(gTimerInterval);
    gTimerInterval = null;
  }  
}



function checkDB() {
  document.querySelector('#downloadStatus').innerHTML = '';

  questDB.listContents().then((contents) => {
    document.querySelector('#downloadStatus').innerHTML += contents;
  });

  document.querySelector('#downloadStatus').style.display = 'block';
}



function startProcessingDownload(btn) {
  btn.classList.add('disabled');
  let loadingSpinner = document.createElement('div');
  loadingSpinner.classList.add('spinner-border');
  loadingSpinner.classList.add('text-primary');
  loadingSpinner.style.position = 'absolute';
  loadingSpinner.style.right = '18px';
  loadingSpinner.role = 'status';
  let loadingReader = document.createElement('span');
  loadingReader.classList.add('sr-only');
  loadingReader.innerText = 'Loading...';
  loadingSpinner.appendChild(loadingReader);
  btn.parentNode.appendChild(loadingSpinner);  
}



let startCompass = document.querySelector('#startCompass');
startCompass.addEventListener("click", () => {
  startCompass.style.display = 'none';
  if (isIos()) {
    DeviceOrientationEvent.requestPermission()
      .then((response) => {
        if (response === 'granted') {
          setupCompass('deviceorientation');
        } else {
          setupCompass('');
        }
      })
      .catch(() => setupCompass(''));
  } else {
    setupCompass('deviceorientationabsolute');
  }
});



function setupCompass(compassEvent) {
  if(compassEvent !== '') {
    document.querySelector('#navCompass').style.display = 'block';
    window.addEventListener(compassEvent, handleOrientation, true);
  } else {
    document.querySelector('#noCompass').style.display = 'block';
  }  
}



function handleOrientation(event) {
  const compassHeading = event.webkitCompassHeading;

  if (compassHeading !== null && compassHeading !== undefined) {
    //gCompassHeading = 360 - compassHeading;
    gCompassHeading = compassHeading;
  }
}



/*
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  //installPrompt = event;
  //installButton.removeAttribute("hidden");
  DEBUG_AREA.innerText += 'beforeinstallprompt->installable';
});*/
const isIos = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test( userAgent );
}
// Detects if device is in standalone mode
const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);


initialize();