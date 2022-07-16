import { IProject } from "./Project";

export interface IBeatValue {
    projects: IProject[];
    lastBeatPrices: number[];
}