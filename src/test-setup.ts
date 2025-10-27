import { GlobalWindow } from 'happy-dom';

const happyWindow = new GlobalWindow();

// Cast through unknown to satisfy TypeScript's DOM typings while using happy-dom.
global.window = happyWindow as unknown as Window & typeof globalThis;
global.document = happyWindow.document as unknown as Document;
global.navigator = happyWindow.navigator as unknown as Navigator;
global.Event = happyWindow.Event as unknown as typeof Event;
