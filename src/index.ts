import { Chart, ChartType, registerables } from 'chart.js';
import { Observable } from 'rxjs';
import { init, initialFetchAndRenderOfProjects } from './observables';
require('./assets/favicon.png');

/* var observable = Observable.create((observer: any) => {
    observer.next('Hello World!');
    observer.next('Hello Again!');
    observer.complete();
    observer.next('Bye');
})

observable.subscribe(
    (x: any) => logItem(x),
    (error: any) => logItem('Error: ' + error),
    () => logItem('Completed')
);

function logItem(val: any) {
    var node = document.createElement("li");
    var textnode = document.createTextNode(val);
    node.appendChild(textnode);
    document.getElementById("list").appendChild(node);
} */


/* const labels = [
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
}; */

window.onload = () => {
    console.log('window loaded', document.getElementsByClassName('listOfCoins')[0]);

    /* Chart.register(...registerables);
    const myChart = new Chart(
        (document.getElementById('chart') as HTMLCanvasElement).getContext('2d'),
        config
    ); */

    init();
}
