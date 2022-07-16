import { delay, from, map, Observable, startWith } from "rxjs";
import { IHistoryItem, IProject } from "../interfaces";
import { getApiURL } from "../common";

const getAllProjects = (
    listOfCoins: HTMLDivElement,
): Observable<IProject[]> => {
    return from(
        fetch(`${getApiURL()}/projects`)
            .then((res) => {
                if (res.ok) return res.json();
                else throw new Error("Projects not found");
            })
            .catch((err) => (listOfCoins.innerHTML = "Projects not found"))
    ).pipe(
        map((projects: IProject[]) => projects.sort((a: IProject, b: IProject) => a.position - b.position)),
        map(projects => projects.map((p: IProject) => ({ ...p, history: [/* { time: "00:00", value: 0 } */] }))),
        delay(200),
        startWith([])
    );
}

const getSingleProject = (
    projectId: number,
    chartInfoMessageContainer: HTMLSpanElement,
): Observable<IProject> => {
    return from(
        fetch(`${getApiURL()}/projects/${projectId}`)
            .then((res) => {
                if (res.ok) return res.json();
                else throw new Error("Project not found");
            })
            .catch((err) => (chartInfoMessageContainer.innerHTML = "Project not found"))
    ).pipe(
        delay(500),
        map(project => ({ ...project, history: [/* { time: "00:00", value: 0 } */] }))
    );
}

export {
    getAllProjects,
    getSingleProject,
}