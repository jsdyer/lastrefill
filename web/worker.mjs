import {analyze} from './route.mjs';
self.onmessage = ({data: {tracks, records, radius, filter}}) => self.postMessage(analyze(tracks, records, radius, filter));
