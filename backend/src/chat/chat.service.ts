import { Injectable, Logger } from '@nestjs/common';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto, AgentWorkflowStep } from './dto/chat-response.dto';
import { RouterAgentService } from '../router-agent/router-agent-service';
import { KnowledgeAgentService } from '../knowledge-agent/knowledge-agent.service';
import { MathAgentService } from '../math-agent/math-agent.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly routerAgentService: RouterAgentService,
    private readonly knowledgeAgentService: KnowledgeAgentService,
    private readonly mathAgentService: MathAgentService,
  ) {}

  async processMessage(chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    const workflow: AgentWorkflowStep[] = [];
    const startTime = Date.now();

    try {      
      const routerDecision = await this.routerAgentService.routeMessage(chatRequest.message);
      workflow.push({
        agent: 'RouterAgent',
        decision: routerDecision.agent,
      });

      let agentResponse: string;
      let sourceAgentResponse: string;
      
      if (routerDecision.agent === 'KNOWLEDGE') {
        workflow.push({ agent: 'KnowledgeAgent' });
        const knowledgeResult = await this.knowledgeAgentService.processQuestion(chatRequest.message);
        agentResponse = this.addPersonality(knowledgeResult.answer);
        sourceAgentResponse = knowledgeResult.answer;
      } else {
        workflow.push({ agent: 'MathAgent' });
        const mathResult = await this.mathAgentService.calculateExpression(chatRequest.message);
        agentResponse = this.addPersonality(mathResult.answer);
        sourceAgentResponse = mathResult.answer;
      }

      const processingTime = Date.now() - startTime;
      
      this.logChatProcessing(chatRequest, workflow, processingTime);

      return {
        response: agentResponse,
        source_agent_response: sourceAgentResponse,
        agent_workflow: workflow,
      };

    } catch (error) {
      this.logger.error('Error processing chat message:', error);
      throw error;
    }
  }

  private addPersonality(response: string): string {    
    const personalityPhrases = [
      "Com prazer! ",
      "Ótima pergunta! ",
      "Vamos lá! ",
      "Aqui está: ",
      "Descobri para você: "
    ];
    
    const randomPhrase = personalityPhrases[
      Math.floor(Math.random() * personalityPhrases.length)
    ];

    return randomPhrase + response;
  }

  private logChatProcessing(
    chatRequest: ChatRequestDto, 
    workflow: AgentWorkflowStep[], 
    processingTime: number
  ): void {
    this.logger.log({
      message: 'Chat message processed',
      context: {
        user_id: chatRequest.user_id,
        conversation_id: chatRequest.conversation_id,
        original_message: chatRequest.message,
        workflow: workflow,
        processing_time_ms: processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  }
}