import { Injectable, OnModuleInit } from '@nestjs/common';

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { OpenAIConfigService } from 'src/common/openai-config.service';
import { AgentResponse } from 'src/interfaces/routing-decision.interface';
import { AgentLogger, StructuredLoggerService } from 'src/common/structured-logger.service';


@Injectable()
export class MathAgentService implements OnModuleInit {
  private readonly logger: AgentLogger;
  private llm: ChatOpenAI;

  constructor(
    private readonly openAIConfig: OpenAIConfigService,
    private readonly loggerService: StructuredLoggerService
  ) {
    this.logger = this.loggerService.createAgentLogger('MathAgent');
  }

  onModuleInit() {
    this.initializeLLM();
  }

  private initializeLLM() {
    if (!this.openAIConfig.isConfigured()) {
      this.logger.warn({
        conversation_id: 'system',
        user_id: 'system',
        content: 'OpenAI API key not configured. MathAgent will use fallback calculations.'
      });
      return;
    }

    try {
      this.llm = new ChatOpenAI({
        apiKey: this.openAIConfig.getApiKey(),
        modelName: this.openAIConfig.getModelName(),
        temperature: Number(this.openAIConfig.getTemperature()),
        maxTokens: Number(this.openAIConfig.getMaxTokens()),
      });
      
      this.logger.log({
        conversation_id: 'system',
        user_id: 'system',
        content: 'OpenAI LLM initialized successfully'
      });
    } catch (error) {
      this.logger.error({
        conversation_id: 'system',
        user_id: 'system',
        content: `Failed to initialize OpenAI LLM: ${error.message}`,
        error: error.stack
      });
    }
  }

  async calculateExpression(expression: string, conversation_id?: string, user_id?: string): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {      
      if (this.llm) {
        const result = await this.interpretWithLLM(expression);
        const executionTime = Date.now() - startTime;

        this.logExecution(expression, result, executionTime, true, conversation_id, user_id);

        return {
          success: true,
          answer: result,
          executionTime,
        };
      } else {        
        const result = this.fallbackCalculation(expression);
        const executionTime = Date.now() - startTime;

        this.logExecution(expression, result, executionTime, false, conversation_id, user_id);

        return {
          success: true,
          answer: result,
          executionTime,
        };
      }
    } catch (error) {
      this.logger.error({
        conversation_id: conversation_id || 'unknown',
        user_id: user_id || 'unknown',
        content: `Error in MathAgent: ${error.message}`,
        error: error.stack,
        execution_time: Date.now() - startTime
      });
      const fallbackResult = this.fallbackCalculation(expression);
      
      return {
        success: false,
        answer: fallbackResult,
        executionTime: Date.now() - startTime,
      };
    }
  }

  private async interpretWithLLM(message: string): Promise<string> {
    try {
      const systemPrompt = `Você é um assistente especializado em matemática. Sua única função é:
      1. INTERPRETAR expressões matemáticas em português, inglês ou espanhol
      2. CALCULAR o resultado numericamente
      3. RESPONDER apenas com o resultado numérico e uma explicação muito breve

      Exemplos:
      - Input: "Quanto é 65 x 3.11?" → Output: "202.15 (65 multiplicado por 3.11)"
      - Input: "70 + 12" → Output: "82 (70 mais 12)"
      - Input: "(42 * 2) / 6" → Output: "14 (42 vezes 2 dividido por 6)"
      - Input: "Quanto custa 100 * 2.5?" → Output: "250 (100 multiplicado por 2.5)"

      Responda APENAS com o resultado e a explicação breve entre parênteses.`;

      const response = await this.llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(`Por favor, calcule: ${message}`),
      ]);

      return response.content.toString().trim();

    } catch (error) {
      this.logger.error({
        conversation_id: 'unknown',
        user_id: 'unknown',
        content: `LLM invocation failed, using fallback: ${error.message}`,
        error: error.stack
      });
      return this.fallbackCalculation(message);
    }
  }

  private fallbackCalculation(expression: string): string {    
    try {      
      const cleanExpr = expression.replace(/[^\d\+\-\*\/\(\)\.]/g, '');      
      
      if (!this.isSafeExpression(cleanExpr)) {
        throw new Error('Expressão não segura');
      }     
      
      const result = this.safeEval(cleanExpr);
      return `${result} (calculado localmente: ${cleanExpr})`;
      
    } catch (error) {
      return `Não foi possível calcular a expressão: ${expression}`;
    }
  }

  private isSafeExpression(expr: string): boolean {    
    return /^[\d\s\+\-\*\/\(\)\.]+$/.test(expr);
  }

  private safeEval(expr: string): number {    
    const tokens = expr.split(/([\+\-\*\/\(\)])/).filter(token => token.trim());   
    
    if (tokens.length === 3) {
      const [a, op, b] = tokens;
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      
      switch (op.trim()) {
        case '+': return numA + numB;
        case '-': return numA - numB;
        case '*': return numA * numB;
        case '/': return numB !== 0 ? numA / numB : NaN;
        default: throw new Error('Operador inválido');
      }
    }
    
    throw new Error('Expressão muito complexa para fallback');
  }

  private logExecution(
    expression: string, 
    result: string, 
    executionTime: number,
    usedLLM: boolean,
    conversation_id?: string,
    user_id?: string
  ): void {
    this.logger.log({
      conversation_id: conversation_id || 'unknown',
      user_id: user_id || 'unknown',
      execution_time: executionTime,
      content: result,
      expression,
      used_llm: usedLLM
    });
  }
}