import { BehaviorSubject, from, fromEvent, Observable, of, Subject, debounceTime, map, filter, switchMap, merge, concat, concatWith, concatMap, mergeWith } from "rxjs";
import { IAsset, IBeatValue, IDivContainer, IProject, IState } from "../interfaces";
import { getApiURL, getPortfolioValue, getRandom } from "../common";
import { getAllProjects, getSingleProject } from "../data";
import { BubbleController, Chart, ChartType, registerables } from "chart.js";
import { MarketType, SeasonEnum } from "../enums";
import { IMarketEvent } from "../interfaces/MarketEvent";

const riseChances = {
    BULL: 90,
    BEAR: 20,
    DEFAULT: 51
}

// State
let initialState: IState = {
    chart: null as Chart,
    selectedProjectId: 1,
    priceSpansToUpdate: [],
    projectItemDivContainers: [],
    projects: [],
    lastBeatPrices: [],
    isProjectLoading: false,
    season: SeasonEnum.DEFAULT,
    money: 1000,
    totalValue: 1000,
    assets: [],
    quantitySpansToUpdate: []
}

let state = new BehaviorSubject<IState>(initialState);
// --------------------

const getDefaultRootForProjectList = (): HTMLDivElement => {
    return document.getElementsByClassName('listOfCoins')[0] as HTMLDivElement;
}

const getDefaultRootForAssetsList = (): HTMLDivElement => {
    return document.getElementById('assets') as HTMLDivElement;
}

const getDefaultChartCanvas = (): HTMLCanvasElement => {
    return document.getElementById('chart') as HTMLCanvasElement;
}

const getChartInfoMessageContainer = (): HTMLSpanElement => {
    return document.getElementById('chartInfoMessage') as HTMLSpanElement;
}

const init = () => {
    const root = getDefaultRootForProjectList();
    initialFetchAndRenderOfProjects(root);
    state.next({
        ...state.value,
        chart: initChart()
    })

    state.subscribe((newState) => {
        updatePricesInProjectsList(newState.projects, newState.lastBeatPrices, newState.priceSpansToUpdate);

        const selectedProject = newState.projects.find(i => i.id === newState.selectedProjectId);
        updateChart(selectedProject, newState.isProjectLoading);
    });

    state.subscribe(({ season }) => {
        document.getElementById('seasonName').innerText = season;
    })

    state.subscribe((newState) => {
        const { money } = newState;
        document.getElementById('money').innerText = `Money: $${money.toFixed(3)}`;
        document.getElementById('value').innerText = `Portfolio value: $${getPortfolioValue(newState)}`;

        updateQuantitiesInAssetsList(newState.assets, newState.quantitySpansToUpdate);
    })
}

const generateNextProjects = (projects: IProject[]) => {
    let newProjects = [...projects];
    newProjects.forEach((project: IProject, index: number) => {
        let newProject = { ...project };

        const fraction = getRandom(0, project.price + 0.1) % 10,
            randInner = getRandom(0, 100),
            confidenceChance = (5 * project.confidence) / 100,
            totalChance = confidenceChance + riseChances[state.value.season];

        if ([50, 60, 70].includes(randInner)) newProject.price += newProject.price / 10; // Iznenadni rast
        else if ([20, 30, 40].includes(randInner)) newProject.price -= newProject.price / 10; // Iznenadni pad
        else if (randInner < totalChance) {
            newProject.price += fraction;
        } else {
            newProject.price -= fraction;
        }

        if (newProject.price <= 0) newProject.price = 0.001; // minimum price
        newProject.price = +newProject.price.toFixed(3);

        let date = new Date();
        let time = date.getMinutes() + ":" + date.getSeconds();
        newProject.history = [...project.history, { time, value: newProject.price }];
        newProjects[index] = newProject;
    });
    return newProjects;
}

const getNextSeason = (season: SeasonEnum): SeasonEnum => {
    const random = Math.floor(getRandom(0, 20));
    switch (random) {
        case 5:
            return SeasonEnum.BEAR;
        case 10:
            return SeasonEnum.BULL;
        case 15:
        case 16:
        case 17:
            return SeasonEnum.DEFAULT;
        default:
            return season;
    }
}

const initBeat = (projects: IProject[]): Subject<IBeatValue> => {
    console.log("initBeat", projects);
    if (!projects || !projects.length) return;

    const beat: Subject<IBeatValue> = new Subject();

    let currentProjects = [...projects];
    let lastPrices = [];
    setInterval(() => {
        lastPrices = [...currentProjects.map(i => i.price)];
        currentProjects = generateNextProjects(currentProjects);
        beat.next({
            projects: currentProjects,
            lastBeatPrices: lastPrices
        });
    }, 200);

    beat.subscribe(({ projects, lastBeatPrices }: IBeatValue) => {
        state.next({
            ...state.value,
            projects,
            lastBeatPrices,
            season: getNextSeason(state.value.season)
        })
    });

    return beat;
}

const initialFetchAndRenderOfProjects = (root: HTMLDivElement): Observable<IProject[]> => {
    let obs: Observable<IProject[]> = of([]);

    const listOfCoinsObservable = getAllProjects(root);
    listOfCoinsObservable.subscribe(
        (projects: IProject[]) => {
            createProjectsList(projects, root);
            createAssetsList(projects, getDefaultRootForAssetsList());
            state.next({
                ...state.value,
                projects,
                assets: projects.map(i => ({ id: i.id, quantity: 0, handle: i.handle }))
            })
            obs = of(projects);
            initBeat(projects);
        }
    );

    return obs;
}

const changeSelectedIndicator = (selectedId: number) => {
    state.value.projectItemDivContainers.forEach(({ div, projectId }) => {
        if (projectId === selectedId) {
            div.classList.add("selectedProjectItem");
        } else {
            div.classList.remove("selectedProjectItem");
        }
        return { div, projectId };
    });
}

const projectSelectObservable = (projectDiv: HTMLDivElement): Observable<IProject> => {
    const clickObservable = fromEvent(projectDiv, "click");
    clickObservable.subscribe((ev) => {
        const id = +(<HTMLDivElement>ev.target).getAttribute("data-project-id");
        state.next({
            ...state.value,
            isProjectLoading: true,
        });
        changeSelectedIndicator(id);
    });

    const projectSelectObservable: Observable<IProject> = clickObservable.pipe(
        debounceTime(200),
        filter((ev: MouseEvent) => ev.target === projectDiv),
        map((ev: MouseEvent) => +(<HTMLDivElement>ev.target).getAttribute("data-project-id")),
        filter((projectId: number) => state.value.selectedProjectId !== projectId),
        switchMap((projectId) =>
            getSingleProject(projectId, getChartInfoMessageContainer())
        ),
    )

    return projectSelectObservable;
}

const createProjectsList = (
    projects: IProject[],
    root: HTMLDivElement = getDefaultRootForProjectList()
) => {
    if (!root) return;
    root.innerHTML = ""; // reset previous data

    if (!projects || !projects.length) {
        root.innerHTML = "Loading...";
        return;
    }

    let priceSpans: HTMLSpanElement[] = [];
    let listOfObservables: Observable<IProject>[] = [];
    let projectItemDivContainers: IDivContainer[] = [];

    projects.forEach((project: IProject) => {
        const projectItem = document.createElement("div");
        projectItem.classList.add("projectItem");
        projectItem.innerHTML = `
                    <div class="projectItem__innerRow">
                        <span>${project.name}</span>
                        <span>${project.handle}</span>
                    </div>
                    <div class="projectItem__consesus">
                        <span>${project.consesus}</span>
                    </div>
                    <div class="projectItem__innerRow">
                        <span>Start: $${project.price}</span>
                        <span>Year: ${project.releaseYear}.</span>
                    </div>
                `;

        const priceContainer = document.createElement("div");
        priceContainer.classList.add("projectItem__priceContainer");
        const priceSpan = document.createElement("span");
        priceSpan.classList.add("projectItem__price");
        priceSpan.innerHTML = `$${project.price}`;
        priceContainer.appendChild(priceSpan);
        projectItem.appendChild(priceContainer);

        // To stop click event propagation to inner span elements
        const projectClickGrabberMask = document.createElement("div");
        projectClickGrabberMask.classList.add("clickGrabberMask");
        projectItem.appendChild(projectClickGrabberMask);

        // Initial selected project
        if (project.id === state.value.selectedProjectId) {
            projectItem.classList.add("selectedProjectItem");
        }

        priceSpans.push(priceSpan);
        projectItemDivContainers.push({ div: projectItem, projectId: project.id });

        projectClickGrabberMask.setAttribute("data-project-id", project.id.toString());
        listOfObservables.push(projectSelectObservable(projectClickGrabberMask)); // handling click events
        root.appendChild(projectItem);
    });

    const mergedObservable = merge(...listOfObservables).pipe(
        debounceTime(200)
    );
    mergedObservable.subscribe((fetchedProject) => {
        const { id } = fetchedProject;
        const currentState = state.value;
        const mergedProjects = [...currentState.projects].map(p => {
            if (p.id === id) {
                return { ...p, history: [...fetchedProject.history, ...p.history] };
            }
            return p;
        })
        state.next({
            ...currentState,
            projects: mergedProjects,
            selectedProjectId: id,
            isProjectLoading: false
        });
    });

    state.next({
        ...state.value,
        priceSpansToUpdate: priceSpans,
        projectItemDivContainers
    });
}

const handleMarketEvent = (marketEvent: IMarketEvent) => {
    const currentState = state.value;
    let { money, assets, projects } = currentState;

    const { type, projectId } = marketEvent;
    const project: IProject = projects.find(p => p.id === projectId);
    if (!project) return;
    const { price, id, } = project;

    const asset = assets.find(a => a.id === id);
    if (!asset) return;

    if (type === "buy") {
        if (money < price) return;
        money -= price;
        state.next({
            ...state.value,
            money,
            assets: [...assets.map(a => a.id === id ? { ...a, quantity: a.quantity + 1 } : a)],
        });
    } else if (type === "sell") {
        if (asset.quantity === 0) return;
        money += price;
        state.next({
            ...state.value,
            money,
            assets: [...assets.map(a => a.id === id ? { ...a, quantity: a.quantity - 1 } : a)],
        });
    }
}

const createAssetsList = (
    projects: IProject[],
    root: HTMLDivElement = getDefaultRootForAssetsList()
) => {
    if (!root) return;
    root.innerHTML = ""; // reset previous data

    if (!projects || !projects.length) {
        root.innerHTML = "Loading...";
        return;
    }

    let quantityContainers: HTMLSpanElement[] = [];
    const marketObservables: Observable<IMarketEvent>[] = [];

    projects.forEach((project: IProject) => {
        const assetItem = document.createElement("div");
        assetItem.classList.add("assetItem");
        assetItem.innerHTML = `
                        <span>${project.name}: </span>
                `;

        const quantityContainer = document.createElement("span");
        quantityContainer.classList.add("assetItem__quantity");
        quantityContainer.innerHTML = `0 ${project.handle}`;
        assetItem.appendChild(quantityContainer);

        quantityContainers.push(quantityContainer);

        const buyButton = document.createElement("button");
        buyButton.classList.add("assetItem__buyButton");
        buyButton.innerHTML = "Buy";
        buyButton.setAttribute("data-project-id", project.id.toString());
        assetItem.appendChild(buyButton);

        const sellButton = document.createElement("button");
        sellButton.classList.add("assetItem__sellButton");
        sellButton.innerHTML = "Sell";
        sellButton.setAttribute("data-project-id", project.id.toString());
        assetItem.appendChild(sellButton);

        const buyClickObservable = fromEvent(buyButton, "click").pipe(map(ev => "buy" as MarketType));
        const sellClickObservable = fromEvent(sellButton, "click").pipe(map(ev => "sell" as MarketType));
        const projectObservable = of(project);

        const marketObservable = buyClickObservable.pipe(
            mergeWith(sellClickObservable),
            concatMap((type) => projectObservable.pipe(
                switchMap(project => of({ projectId: project.id, type }))
            ))
        );

        marketObservables.push(marketObservable);

        root.appendChild(assetItem);
    });

    const mergedObservable = merge(...marketObservables);

    mergedObservable.subscribe((marketEvent: IMarketEvent) => {
        handleMarketEvent(marketEvent);
    });

    state.next({
        ...state.value,
        quantitySpansToUpdate: quantityContainers
    });
}

const updateQuantitiesInAssetsList = (
    assets: IAsset[],
    quantitySpansToUpdate: HTMLSpanElement[]
) => {

    if (!assets || !assets.length) return;

    assets.forEach((asset: IAsset, index) => {
        quantitySpansToUpdate[index].innerHTML = `${asset.quantity} ${asset.handle}`;
    });
}

const updatePricesInProjectsList = (
    projects: IProject[],
    lastBeatPrices: number[],
    priceSpansToUpdate: HTMLSpanElement[]
) => {

    if (!projects || !projects.length) return;

    projects.forEach((project: IProject, index) => {
        priceSpansToUpdate[index].innerHTML = `$${project.price}`;
        priceSpansToUpdate[index].style.color = project.price > lastBeatPrices[index] ? "#0f0" : "orangered";
    });
}

const initChart = (): Chart => {
    Chart.register(...registerables);
    const labels = [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
    ];

    const data = {
        labels: labels,
        datasets: [{
            label: 'LOADING...',
            backgroundColor: 'blue',
            borderColor: 'yellow',
            data: [0, 10, 5, 2, 20, 30, 45],
        }]
    };

    const config = {
        type: 'line' as ChartType,
        data: data,
        options: {}
    };

    const ctx = (getDefaultChartCanvas()).getContext('2d');
    return new Chart(ctx, config);
}

const updateChart = (newData: IProject, isLoading: boolean) => {
    const { chart } = state.value;
    if (!chart || !newData || !newData.history || !newData.history.length) return;

    if (isLoading) {
        getDefaultChartCanvas().style.display = "none";
        getChartInfoMessageContainer().innerHTML = "Loading...";
        return;
    }

    getDefaultChartCanvas().style.display = "block";
    getChartInfoMessageContainer().innerHTML = "";

    const { history, name } = newData;

    const last50 = history.slice(history.length - 50 > 0 ? history.length - 50 : 0, history.length);
    const data = {
        labels: [...last50.map((i, index) => i.time)],
        datasets: [
            {
                label: name + "'s value",
                data: last50.map(i => i.value),
                fill: false,
                backgroundColor: 'blue',
                borderColor: 'yellow',
                color: '#fff',
                animation: false
            },
        ],
    };

    chart.data = data;
    chart.update();
}

export {
    init,
    initialFetchAndRenderOfProjects
}
