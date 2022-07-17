import { MarketType } from "../enums";
import { IProject } from "./Project";

export interface IMarketEvent {
    type: MarketType;
    project: IProject
}