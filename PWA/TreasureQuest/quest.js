class Quest {
    static getQuestAssets(quest) {
        let assets = [];
        const steps = quest.questJSON.steps;

        for(let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
            let assetElements = this.getStepAssetElements(steps[stepIndex]);
            for(let elementIndex = 0; elementIndex < assetElements.length; elementIndex++) {
                assets.push(assetElements[elementIndex].src);
            }
        }

        return assets;
    }



    static getStepAssetElements(step) {
        const parser = new DOMParser();
        const directions = parser.parseFromString(step.directions, "text/html");

        let assets = directions.querySelectorAll('img, source');

        return assets;
    }
}


class QuestCollection {
    quests = [];

    constructor() {}

    getByID(questID) {
        for(let index = 0; index < this.quests.length; index++) {
            if(this.quests[index].questID === questID)
                return this.quests[index];
        }
    }
}