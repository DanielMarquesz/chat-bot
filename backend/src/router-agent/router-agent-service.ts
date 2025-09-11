import { Injectable, Logger } from '@nestjs/common';
import { RoutingDecision, AgentResponse } from '../interfaces/routing-decision.interface';
import { KnowledgeAgentService } from '../knowledge-agent/knowledge-agent.service';
import { MathAgentService } from '../math-agent/math-agent.service';

@Injectable()
export class RouterAgentService {
  private readonly logger = new Logger(RouterAgentService.name);
  private readonly mathPatterns = [
    /quanto é\s+[\d\+\-\*\/\(\)\.\s]+/i,
    /how much is\s+[\d\+\-\*\/\(\)\.\s]+/i,
    /calcule\s+[\d\+\-\*\/\(\)\.\s]+/i,
    /calculate\s+[\d\+\-\*\/\(\)\.\s]+/i,
    /[\d\+\-\*\/\(\)\.\s]+\s*=\s*\?/i,
  ];

  constructor(
    private readonly knowledgeAgentService: KnowledgeAgentService,
    private readonly mathAgentService: MathAgentService,
  ) {}

  async routeMessage(message: string): Promise<RoutingDecision> {
    const startTime = Date.now();
    
    const decision = this.analyzeMessage(message);
    const processingTime = Date.now() - startTime;

    const routingDecision: RoutingDecision = {
      ...decision,
      processingTime,
    };

    this.logDecision(message, routingDecision);
    
    return routingDecision;
  }

  private analyzeMessage(message: string): Omit<RoutingDecision, 'processingTime'> {
    const messageLower = message.toLowerCase().trim();
    
    const mathConfidence = this.calculateMathConfidence(messageLower);
    if (mathConfidence >= 0.8) {
      return {
        agent: 'MATH',
        confidence: mathConfidence,
        reason: 'Mensagem contém expressão matemática clara',
      };
    }

    const knowledgeConfidence = this.calculateKnowledgeConfidence(messageLower);
    if (knowledgeConfidence >= 0.6) {
      return {
        agent: 'KNOWLEDGE',
        confidence: knowledgeConfidence,
        reason: 'Mensagem é uma pergunta de conhecimento geral',
      };
    }

    return {
      agent: 'KNOWLEDGE',
      confidence: 0.5,
      reason: 'Não foi possível determinar com certeza, default para KnowledgeAgent',
    };
  }

  private calculateMathConfidence(message: string): number {
    for (const pattern of this.mathPatterns) {
      if (pattern.test(message)) {
        return 0.95;
      }
    }

    if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(message)) {
      return 0.9;
    }

    if (/\d+[\+\-\*\/]\d+/.test(message)) {
      return 0.85;
    }

    const mathKeywords = ['quanto é', 'calcule', 'calculate', 'soma', 'subtraia', 'multiplique', 'divida'];
    if (mathKeywords.some(keyword => message.includes(keyword))) {
      return 0.7;
    }

    return 0;
  }

  private calculateKnowledgeConfidence(message: string): number {
    const knowledgeKeywords = [
      'como', 'how', 'o que é', 'what is', 'quem', 'who',
      'quando', 'when', 'onde', 'where', 'por que', 'why',
      'explique', 'explain', 'dúvida', 'doubt', 'ajuda', 'help',
      'infinitepay', 'pix', 'transferência', 'pagamento'
    ];

    const matches = knowledgeKeywords.filter(keyword => 
      message.includes(keyword)
    ).length;

    return Math.min(1, matches * 0.3);
  }

  private logDecision(message: string, decision: RoutingDecision): void {
    this.logger.log({
      message: 'Routing decision made',
      context: {
        originalMessage: message,
        decision: {
          agent: decision.agent,
          confidence: decision.confidence,
          reason: decision.reason,
          processingTime: decision.processingTime,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  async executeWithAgent(message: string, agent: 'KNOWLEDGE' | 'MATH'): Promise<AgentResponse> {
    try {
      if (agent === 'KNOWLEDGE') {
        return await this.knowledgeAgentService.processQuestion(message);
      } else {
        return await this.mathAgentService.calculateExpression(message);
      }
    } catch (error) {
      this.logger.error(`Error executing with ${agent} agent:`, error);
      throw error;
    }
  }
}