export class AgentWorkflowStep {
  agent: string;
  decision?: string;
}

export class ChatResponseDto {
  response: string;
  source_agent_response: string;
  agent_workflow: AgentWorkflowStep[];
}