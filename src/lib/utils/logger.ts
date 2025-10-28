import { createConsola } from 'consola';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const logger = createConsola({
  level: isDevelopment ? 4 : isTest ? 0 : 3,
  formatOptions: {
    colors: isDevelopment,
    compact: !isDevelopment,
    date: isDevelopment,
  },
});

export const realtimeLogger = logger.withTag('realtime');
export const apiLogger = logger.withTag('api');
export const dbLogger = logger.withTag('database');
export const hookLogger = logger.withTag('hook');
export const componentLogger = logger.withTag('component');
export const presenceLogger = logger.withTag('presence');
export const timerLogger = logger.withTag('timer');
export const syncLogger = logger.withTag('sync');
export const submitLogger = logger.withTag('submit');
export const pollLogger = logger.withTag('poll');
export const connectionLogger = logger.withTag('connection');
