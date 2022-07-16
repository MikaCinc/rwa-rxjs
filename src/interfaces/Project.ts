export interface IProject {
    id: number;
    name: string;
    handle: string,
    price: number,
    position: number,
    confidence: number,
    releaseYear: number,
    consesus: string,
    history?: IHistoryItem[],
    // --- Ideje:
    //marketCap: number,
    //numOfCoins: number,
}

export interface IHistoryItem {
    time: string,
    value: number,
}