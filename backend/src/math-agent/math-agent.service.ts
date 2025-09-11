import { Injectable, Logger } from '@nestjs/common';
import { AgentResponse } from '../interfaces/routing-decision.interface';

@Injectable()
export class MathAgentService {
  private readonly logger = new Logger(MathAgentService.name);

  async calculateExpression(expression: string): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      const cleanedExpression = this.extractMathExpression(expression);
      const result = this.evaluateExpression(cleanedExpression);
      const executionTime = Date.now() - startTime;

      this.logExecution(expression, result, executionTime);

      return {
        success: true,
        answer: `O resultado de ${cleanedExpression} é ${result}`,
        executionTime,
      };
    } catch (error) {
      this.logger.error('Error calculating expression:', error);
      throw error;
    }
  }

  private extractMathExpression(text: string): string {
    
    const mathMatch = text.match(/[\d\+\-\*\/\(\)\.]+/);
    return mathMatch ? mathMatch[0] : text;
  }

  private evaluateExpression(expression: string): number {
    try {      
      const cleanExpression = expression.replace(/[^\d\+\-\*\/\(\)\.]/g, '');      
      
      if (!this.isValidMathExpression(cleanExpression)) {
        throw new Error('Expressão matemática inválida');
      }
      
      const result = eval(cleanExpression);
      return Number(result);
    } catch (error) {
      throw new Error(`Não foi possível calcular a expressão: ${expression}`);
    }
  }

  private isValidMathExpression(expression: string): boolean {    
    return /^[\d\+\-\*\/\(\)\.\s]+$/.test(expression);
  }

  private logExecution(expression: string, result: number, executionTime: number): void {
    this.logger.log({
      message: 'MathAgent execution',
      context: {
        expression,
        result,
        executionTime,
        timestamp: new Date().toISOString(),
      },
    });
  }
}