//Helper for IndexedDB API

class QuestDB {
    MEDIA_DB_NAME = 'TreasureQuestDB';
    MEDIA_DB_VERSION = 3;
    mediaDB;
    state = 'disconnected';

    constructor() {}

    connect() {
        this.state = 'connecting';

        return new Promise((RESOLVE, REJECT) => {        
            const openDBRequest = indexedDB.open(this.MEDIA_DB_NAME, this.MEDIA_DB_VERSION);

            openDBRequest.onerror = event => {
                this.state = 'error';
                REJECT(event.target.error);
            }
            
            openDBRequest.onsuccess = event => {
                this.mediaDB = event.target.result;
                this.state = 'connected';
                RESOLVE('connected');
            }
            
            openDBRequest.onupgradeneeded = event => {
                //Setup schema if new db, or alter if increasing version
                const db = event.target.result;
            
                if (event.oldVersion < this.MEDIA_DB_VERSION && db.objectStoreNames.contains('media')) {
                    db.deleteObjectStore('media');
                }
            
                db.createObjectStore('media', { keyPath: 'path' });
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
      
      

    checkMediaExists(mediaPath) {
        return new Promise((RESOLVE, REJECT) => {
            const mediaObjectStore = this.mediaDB.transaction('media').objectStore('media');
            const request = mediaObjectStore.get(mediaPath);
        
            request.onerror = (event) => {
                REJECT('Error reading media');
            };
        
            request.onsuccess = (event) => {
                RESOLVE(request.result != undefined);
            };
        });
    }


    getMedia(mediaPath) {
        return new Promise((RESOLVE, REJECT) => {
            const mediaObjectStore = this.mediaDB.transaction('media').objectStore('media');
            const request = mediaObjectStore.get(mediaPath);
        
            request.onerror = (event) => {
                REJECT('Error reading media');
            };
        
            request.onsuccess = (event) => {
                RESOLVE(request.result);
            };
        });
    }


    addMedia(mediaPath) {
        return new Promise((RESOLVE, REJECT) => {
            const mediaRequest = fetch(mediaPath).then(response => response.blob());

            mediaRequest.then(blob => {
                const mediaObjectStore = this.mediaDB.transaction('media', 'readwrite').objectStore('media');
                mediaObjectStore.add({path: mediaPath, blob: blob});

                RESOLVE(mediaPath + ' added to db.');
            });
        });
    }



    listContents() {
        return this.mediaDB.objectStoreNames;
    }
};