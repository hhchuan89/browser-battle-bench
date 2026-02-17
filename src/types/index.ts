export type SystemState = 'ONLINE' | 'OFFLINE' | 'STANDBY' | 'ERROR' | 'LOADING';

export interface SystemStatus {
  coreIntegrity: SystemState;
  webLlmEngine: SystemState;
  judgeAi: SystemState;
}

export interface BattleState {
    isRunning: boolean;
    currentPhase: number;
    totalPhases: number;
}

// Re-export battle types
export * from './battle';

// Re-export endurance types
export * from './endurance';

// Re-export report types
export * from './report';
