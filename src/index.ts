import { fromEvent } from 'rxjs';
import { init } from './logic';
require('./assets/favicon.png');


fromEvent(window, 'load').subscribe(() => {
    console.log('window loaded', document.getElementsByClassName('listOfCoins')[0]);

    init();
});