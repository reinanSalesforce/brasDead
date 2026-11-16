import { createContext, useContext } from 'react';
import type { Player } from '../types';

export interface SpotlightApi {
  open: (p: Player) => void;
}
export const SpotCtx = createContext<SpotlightApi>({ open: () => undefined });
export const useSpotlight = () => useContext(SpotCtx);
