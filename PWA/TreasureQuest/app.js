const TEST_MODE = true;
const DEBUG_AREA = document.querySelector('#debug');
const STORAGE_KEY = "treasure-quest";
const SUCCESS_SOUND = new Audio('assets/success.mp3');
const FAILURE_SOUND = new Audio('assets/failure.mp3');

const questDB = new QuestDB();
let gAllQuests = new QuestCollection();
let gQuest = {};
let gCurrentStep = 0;
let gTimerInterval = null;
let gTimerEnd = null;


function initialize() {
  if(TEST_MODE)
    DEBUG_AREA.style.display = 'block';

  questDB.connect()
  .then((message) => {
    loadAllQuests();
  })
  .catch((error) => {
    alert(`Unable to connect to database: ${error}`);
  });
}



function loadAllQuests() {
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
    let menu = document.querySelector('#menu');
    menu.innerHTML = '';

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
  let menu = document.querySelector('#menu');
  let menuElement = document.createElement('div');

  let nameElement = document.createElement('span');
  nameElement.innerText = newQuest.name;
  menuElement.appendChild(nameElement);
  
  let statusElement = document.createElement('span');
  statusElement.style.marginLeft = "10px";
  let needDownload = true;  
  let canPlay = false;
   

  if(dbQuest.downloadedVersion === null) {
    statusElement.innerText = "not installed";
  } else {
    if(dbQuest.downloadedVersion === newQuest.version) {
      statusElement.innerText = "current";
      needDownload = false;
      canPlay = true;    
    } else {
      statusElement.innerText = "update needed";
      canPlay = true;
    }
  }
  menuElement.appendChild(statusElement);

  if(needDownload) {
    let downloadButton = document.createElement('a');
    downloadButton.style.marginLeft = "10px";
    downloadButton.href = 'javascript:';
    downloadButton.addEventListener('click', function() {
      downloadQuest(newQuest.questID);
    });
    downloadButton.innerText = 'Download';
    downloadButton.classList.add('btn');
    downloadButton.classList.add('btn-secondary');
    menuElement.appendChild(downloadButton);
  }

  if(canPlay) {
    let playButton = document.createElement('a');
    playButton.style.marginLeft = "10px";
    playButton.href = 'javascript:';
    playButton.addEventListener('click', function() {
      playQuest(newQuest.questID);
    });
    playButton.innerText = 'Play';
    playButton.classList.add('btn');
    playButton.classList.add('btn-primary');
    menuElement.appendChild(playButton);
  }

  menu.appendChild(menuElement);
}




async function downloadQuest(questID) {
  let newQuest = gAllQuests.getByID(questID);
  let dbQuest = await questDB.updateQuestJSON(newQuest);

  if(dbQuest) {
    let assets = Quest.getQuestAssets(dbQuest);

    for(assetIndex = 0; assetIndex < assets.length; assetIndex++) {
      let path = await questDB.updateAsset(questID, assets[assetIndex]);
      
      console.log(`${assetIndex+1} of ${assets.length}: ${path}`);
      /*
      questDB.updateAsset(questID, assets[assetIndex]).then((media) => {
        console.log(`${assetIndex+1} of ${assets.length}: ${media}`);
      })
      */      
    }

    await questDB.updateQuestVersion(newQuest);

    loadAllQuests();
  } else {
    console.log('JSON load failed');
  }
}



async function playQuest(questID) {
  let canvas = document.querySelector('#canvas');
  let menu = document.querySelector('#menu');

  canvas.style.display = 'block';
  menu.style.display = 'none';

  let dbQuest = await questDB.getQuest(questID);

  gQuest = dbQuest.questJSON;

  restoreQuestState();
  drawCurrentStep();
}




async function drawCurrentStep() {
  let rootURL = window.location.protocol + '//' + window.location.host;
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
            //if (isCloseEstimate(position, currentStep.destination)) {
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



function saveQuestState() {
  const questState = {step: gCurrentStep};

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(questState));
}



function restoreQuestState() {
  const data = window.localStorage.getItem(STORAGE_KEY);
  const questState = data ? JSON.parse(data) : {step: 0};

  gCurrentStep = questState.step;
}



function stopTimer() {
  if(gTimerInterval) {
    clearInterval(gTimerInterval);
    gTimerInterval = null;
  }  
}



function showDownloads() {

    questDB.listContents().then((contents) => {
      document.querySelector('#downloadStatus').innerHTML += contents;
    });


  document.querySelector('#downloadStatus').style.display = 'block';
}



initialize();