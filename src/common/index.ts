import { IState } from "../interfaces";

const getApiURL = (): string => {
    return "http://localhost:3000";
};

const getRandom = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
}

const getPortfolioValue = (state: IState): number => {
    const initialValue = state.money;
    const sumWithInitial = state.assets.reduce(
        (previousValue, currentAsset) => {
            const project = state.projects.find(project => project.id === currentAsset.id);
            if (!project) return previousValue;
            return previousValue + currentAsset.quantity * project.price;
        },
        initialValue
    );

    return sumWithInitial;
}

export {
    getApiURL,
    getRandom,
    getPortfolioValue
};