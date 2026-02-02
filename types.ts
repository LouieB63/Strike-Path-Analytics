
export enum Handedness {
  RIGHT = 'Right',
  LEFT = 'Left'
}

export enum DriftDirection {
  LEFT = 'Left',
  RIGHT = 'Right',
  NONE = 'None'
}

export interface Bowler {
  id: string;
  name: string;
  handedness: Handedness;
  drift: number; // Number of boards
  driftDirection: DriftDirection;
  layDownDistance: number; // Distance between ball and foot at release
  lastTarget?: number;
  lastBreakpoint?: number;
}

export interface CalculationResult {
  x: number;
  y: number;
  ballLayDownBoard: number;
  slideFootBoard: number;
  stanceFootBoard: number;
}
