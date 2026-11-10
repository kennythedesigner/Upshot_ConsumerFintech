export * from './types';
export * from './settings';
export * from './labels';
export * from './factory';
export * from './calculate';
export * from './overlap';
export * from './portfolio';
export * from './format';
export * from './messages';

import { SHORT_WINDOW_MONTHS } from './settings';

/** Screen-level states (TRD "State precedence"). */
export const isShortWindow = (horizonMonths: number): boolean => horizonMonths === SHORT_WINDOW_MONTHS;
