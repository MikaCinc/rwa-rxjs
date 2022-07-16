import { from, Observable, of, Subject } from "rxjs";
import { IProject } from "../interfaces";
import { getApiURL } from "../common";
import { getAllProjects } from "../data";
import { Chart, ChartType, registerables } from "chart.js";

interface IState {
    chart: Chart;
    selectedProjectId: number;
}

let state: IState = {
    chart: null as Chart,
    selectedProjectId: 1
}

const getDefaultRootForProjectList = (): HTMLDivElement => {
    return document.getElementsByClassName('listOfCoins')[0] as HTMLDivElement;
}

const init = () => {
    const root = getDefaultRootForProjectList();
    initialFetchAndRenderOfProjects(root);
    state.chart = initChart();
}

const generateNextProjects = (projects: IProject[]) => {
    let newProjects = [...projects];
    newProjects.forEach((project: IProject, index: number) => {
        let newProject = { ...project };
        newProject.price = project.price + 1;
        let date = new Date();
        let time = date.getMinutes() + ":" + date.getSeconds();
        newProject.history = [...project.history, { time, value: newProject.price }];
        newProjects[index] = newProject;
    });
    return newProjects;
}

const initBeat = (projects: IProject[]): Subject<IProject[]> => {
    console.log("beat", projects);
    if (!projects || !projects.length) return;

    const beat: Subject<IProject[]> = new Subject();

    let currentProjects = [...projects];
    setInterval(() => {
        currentProjects = generateNextProjects(currentProjects);
        beat.next(currentProjects);
    }, 1000);

    beat.subscribe((newValue) => renderProjects(newValue));

    beat.subscribe((newValue) => {
        const selectedProject = newValue.find(i => i.id === state.selectedProjectId);
        updateChart(selectedProject)
    });

    return beat;
}

const initialFetchAndRenderOfProjects = (root: HTMLDivElement): Observable<IProject[]> => {
    let obs: Observable<IProject[]> = of([]);

    const listOfCoinsObservable = getAllProjects(root);
    listOfCoinsObservable.subscribe(
        (projects: IProject[]) => {
            renderProjects(projects, root);
            obs = of(projects);
            initBeat(projects);
        }
    );

    return obs;
}

const renderProjects = (
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

    projects.forEach((project: IProject) => {
        const projectItem = document.createElement("div");
        projectItem.classList.add("projectItem");
        projectItem.innerHTML = `
                    <div class="projectItem__innerRow">
                        <span>${project.name}</span>
                        <span>${project.handle}</span>
                    </div>
                    <div class="projectItem__innerRow">
                        <span>Price: $${project.price}</span>
                        <span>Year: ${project.releaseYear}.</span>
                    </div>
                    <div class="projectItem__consesus">${project.consesus}</div>
                `;
        root.appendChild(projectItem);
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

    const ctx = (document.getElementById('chart') as HTMLCanvasElement).getContext('2d');
    return new Chart(ctx, config);
}

const updateChart = (newData: IProject) => {
    const { chart } = state;
    if (!chart || !newData || !newData.history || !newData.history.length) return;

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
    initialFetchAndRenderOfProjects,
    renderProjects,
}