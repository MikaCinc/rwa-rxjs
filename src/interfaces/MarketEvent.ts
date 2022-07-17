import { MarketType } from "../enums";

export interface IMarketEvent {
    type: MarketType;
    projectId: number
}