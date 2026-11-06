import {bootOnce} from './boot-player.mjs';
try{bootOnce(globalThis.__EKKO_STARTUP_CONFIG__||{});}catch{}
