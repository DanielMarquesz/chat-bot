export interface RoutingDecision {
  agent: 'KNOWLEDGE' | 'MATH';
  confidence: number;
  reason: string;
  processingTime: number;
}

export interface AgentResponse {
  success: boolean;
  answer: string;
  sources?: string[];
  executionTime?: number;
}