import { BehaviorSubject, from, fromEvent, Observable, of, Subject, debounceTime, map, filter, switchMap, merge } from "rxjs";
import { IBeatValue, IProject } from "../interfaces";
import { getApiURL } from "../common";
import { getAllProjects, getSingleProject } from "../data";
import { Chart, ChartType, registerables } from "chart.js";

// State
interface IState {
    chart: Chart;
    selectedProjectId: number;
    priceSpansToUpdate: HTMLSpanElement[];
    projects: IProject[];
    lastBeatPrices: number[];
    isProjectLoading: boolean;
}

let initialState: IState = {
    chart: null as Chart,
    selectedProjectId: 1,
    priceSpansToUpdate: [],
    projects: [],
    lastBeatPrices: [],
    isProjectLoading: false
}

let state = new BehaviorSubject<IState>(initialState);
// --------------------

const getDefaultRootForProjectList = (): HTMLDivElement => {
    return document.getElementsByClassName('listOfCoins')[0] as HTMLDivElement;
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
}

const generateNextProjects = (projects: IProject[]) => {
    let newProjects = [...projects];
    newProjects.forEach((project: IProject, index: number) => {
        let newProject = { ...project };
        newProject.price = +(project.price + 1).toFixed(2);
        let date = new Date();
        let time = date.getMinutes() + ":" + date.getSeconds();
        newProject.history = [...project.history, { time, value: newProject.price }];
        newProjects[index] = newProject;
    });
    return newProjects;
}

const initBeat = (projects: IProject[]): Subject<IBeatValue> => {
    console.log("initBeat", projects);
    if (!projects || !projects.length) return;

    const beat: Subject<IBeatValue> = new Subject();

    let currentProjects = [...projects];
    let lastPrices = [];
    setInterval(() => {
        lastPrices = [...projects.map(i => i.price)];
        currentProjects = generateNextProjects(currentProjects);
        beat.next({
            projects: currentProjects,
            lastBeatPrices: lastPrices
        });
    }, 1000);

    beat.subscribe(({ projects, lastBeatPrices }: IBeatValue) => {
        state.next({
            ...state.value,
            projects,
            lastBeatPrices
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
            state.next({
                ...state.value,
                projects
            })
            obs = of(projects);
            initBeat(projects);
        }
    );

    return obs;
}

const projectSelectObservable = (projectDiv: HTMLDivElement): Observable<IProject> => {
    const clickObservable = fromEvent(projectDiv, "click");
    clickObservable.subscribe(() => {
        state.next({
            ...state.value,
            isProjectLoading: true
        })
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
    // console.log("projects", projects);
    if (!root) return;
    root.innerHTML = ""; // reset previous data

    if (!projects || !projects.length) {
        root.innerHTML = "Loading...";
        return;
    }

    let priceSpans: HTMLSpanElement[] = [];
    let listOfObservables: Observable<IProject>[] = [];

    projects.forEach((project: IProject) => {
        const projectItem = document.createElement("div");
        projectItem.classList.add("projectItem");
        projectItem.innerHTML = `
                    <div class="projectItem__innerRow">
                        <span>${project.name}</span>
                        <span>${project.handle}</span>
                    </div>
                    <div class="projectItem__consesus">${project.consesus}</div>
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

        priceSpans.push(priceSpan);

        projectClickGrabberMask.setAttribute("data-project-id", project.id.toString());
        listOfObservables.push(projectSelectObservable(projectClickGrabberMask)); // handling click events
        root.appendChild(projectItem);
    });

    const mergedObservable = merge(...listOfObservables);
    mergedObservable.subscribe((fetchedProject) => {
        const projectId = fetchedProject.id;
        const currentState = state.value;
        const mergedProjects = [...currentState.projects].map(p => {
            if (p.id === projectId) {
                return { ...p, history: [...fetchedProject.history, ...p.history] };
            }
            return p;
        })
        state.next({
            ...currentState,
            projects: mergedProjects,
            selectedProjectId: projectId,
            isProjectLoading: false
        })
    });

    state.next({
        ...state.value,
        priceSpansToUpdate: priceSpans
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
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
    ];

    const data = {
        labels: labels,
        datasets: [{
            label: 'My First dataset',
            backgroundColor: 'rgb(255, 99, 132)',
            borderColor: 'rgb(255, 99, 132)',
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