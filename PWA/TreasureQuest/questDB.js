//Helper for IndexedDB API

class QuestDB {
    DB_NAME = 'TreasureQuestDB';
    DB_VERSION = 5;
    db;
    state = 'disconnected';

    constructor() {}

    connect() {
        this.state = 'connecting';

        return new Promise((RESOLVE, REJECT) => {        
            const openDBRequest = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            openDBRequest.onerror = event => {
                this.state = 'error';
                REJECT(event.target.error);
            }
            
            openDBRequest.onsuccess = event => {
                this.db = event.target.result;
                this.state = 'connected';
                RESOLVE('connected');
            }
            
            openDBRequest.onupgradeneeded = event => {
                //Setup schema if new db, or alter if increasing version
                const db = event.target.result;
            
                if (event.oldVersion < this.DB_VERSION) {
                    if (db.objectStoreNames.contains('quests')) {
                        db.deleteObjectStore('quests');
                    }

                    if (db.objectStoreNames.contains('questAssets')) {
                        db.deleteObjectStore('questAssets');
                    }
                }
            
                db.createObjectStore('quests', {keyPath: 'questID'});
                db.createObjectStore('questAssets', { keyPath: 'path' });
            }
        });        
    }


    waitConnected = async () => {
        let timeoutMs = 5000;   //Wait 5 seconds before deciding that connection isn't happening        

        return new Promise((resolve, reject) => {
          const timeWas = new Date();
          const db = this;
          (function wait() {
            if (db.state == 'connected') {
                console.log("resolved after", new Date() - timeWas, "ms");
                resolve();
              } else if (new Date() - timeWas > timeoutMs) { // Timeout
                console.log("rejected after", new Date() - timeWas, "ms");
                reject();
              } else {
                setTimeout(wait, 50);
              }          
            })();          
        });
    }



    getQuest(questID) {
        return new Promise((RESOLVE, REJECT) => {
            const questObjectStore = this.db.transaction('quests').objectStore('quests');
  
            const request = questObjectStore.get(questID);
        
            request.onerror = (event) => {
                REJECT('Error reading quests');
            };
        
            request.onsuccess = (event) => {
                RESOLVE(request.result);
            };
        });
    }





    addQuest(newQuest) {
        return new Promise((RESOLVE, REJECT) => {
            const questTransaction = this.db.transaction(["quests"], "readwrite");
            let dbQuest = {questID: newQuest.questID, name: newQuest.name, assetsFolder: newQuest.assetsFolder, downloadedVersion: null, questJSON: null};

            questTransaction.oncomplete = (event) => {
              RESOLVE(dbQuest);
            };
            const questsObjectStore = questTransaction.objectStore('quests');
            questsObjectStore.add(dbQuest);
        });
    }
    
    

    async updateQuestJSON(newQuest) {
        const response = await fetch('assets/quests/' + newQuest.assetsFolder + '/quest.json');
        const questJSON = await response.json();
        const dbQuest = await this.getQuest(newQuest.questID);
        dbQuest.questJSON = questJSON;
        const questObjectStore = this.db.transaction('quests', 'readwrite').objectStore('quests');
        const request = await questObjectStore.put(dbQuest);

        return dbQuest;
    }
    
    

    async updateQuestVersion(newQuest) {
        const dbQuest = await this.getQuest(newQuest.questID);
        dbQuest.downloadedVersion = newQuest.version;
        const questObjectStore = this.db.transaction('quests', 'readwrite').objectStore('quests');
        const request = await questObjectStore.put(dbQuest);

        return dbQuest;
    }
    


    async getAsset(path) {
        return new Promise((RESOLVE, REJECT) => {
            const assetObjectStore = this.db.transaction('questAssets').objectStore('questAssets');
            const request = assetObjectStore.get(path);
        
            request.onerror = (event) => {
                REJECT('Error reading media');
            };
        
            request.onsuccess = (event) => {
                RESOLVE(request.result);
            };
        });
    }


    async updateAsset(questID, path) {
        const response = await fetch(path);
        const blob = await response.blob();
        const assetObjectStore = this.db.transaction('questAssets', 'readwrite').objectStore('questAssets');
        const dbResponse = await assetObjectStore.put({path: path, questID: questID, blob: blob});

        return path;
        /*
        return new Promise((RESOLVE, REJECT) => {
            const mediaRequest = fetch(path).then(response => response.blob());
            mediaRequest.then(blob => {
                console.log('got ' + path);
                const mediaObjectStore = this.db.transaction('questAssets', 'readwrite').objectStore('questAssets');
                mediaObjectStore.add({path: path, questID: questID, blob: blob});

                RESOLVE(path);
            });
        });*/
    }


/*
    listContents() {
        return new Promise((RESOLVE, REJECT) => {
            let contents = '';
    
            const mediaObjectStore = this.db.transaction('media').objectStore('media');
            let allRecords = mediaObjectStore.getAll();
            allRecords.onsuccess = function() {
                for(let index = 0; index < allRecords.result.length; index++) {
                    contents += allRecords.result[index].path + '<br />';
                }
                console.log(contents);
                RESOLVE(contents);
            };
        });            
    }*/
};