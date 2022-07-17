import { Chart } from "chart.js";
import { SeasonEnum } from "../enums";
import { IAsset } from "./Asset";
import { IProject } from "./Project";

export interface IDivContainer {
    div: HTMLDivElement;
    projectId: number;
}

export interface IState {
    chart: Chart;
    selectedProjectId: number;
    priceSpansToUpdate: HTMLSpanElement[];
    projectItemDivContainers: IDivContainer[];
    projects: IProject[];
    lastBeatPrices: number[];
    isProjectLoading: boolean;
    season: SeasonEnum,
    money: number,
    totalValue: number,
    assets: IAsset[],
    quantitySpansToUpdate: HTMLSpanElement[],
}