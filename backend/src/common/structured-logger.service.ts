import { Injectable, LoggerService, LogLevel } from '@nestjs/common';

export type AgentType = 'RouterAgent' | 'KnowledgeAgent' | 'MathAgent' | 'ChatService';

export interface StructuredLogEntry {
  timestamp: string;
  level: string;
  agent: AgentType;
  conversation_id?: string;
  user_id?: string;
  execution_time?: number;
  decision?: string;
  content?: string;
  [key: string]: any;
}

@Injectable()
export class StructuredLoggerService implements LoggerService {
  log(message: any, context?: string): void {
    this.writeLog('INFO', message, context);
  }

  error(message: any, trace?: string, context?: string): void {
    this.writeLog('ERROR', message, context, trace);
  }

  warn(message: any, context?: string): void {
    this.writeLog('WARN', message, context);
  }

  debug(message: any, context?: string): void {
    this.writeLog('DEBUG', message, context);
  }

  verbose(message: any, context?: string): void {
    this.writeLog('VERBOSE', message, context);
  }

  private writeLog(level: string, message: any, context?: string, trace?: string): void {
    let logEntry: StructuredLogEntry;

    if (typeof message === 'object' && message !== null) {
      logEntry = {
        timestamp: new Date().toISOString(),
        level,
        agent: context as AgentType || 'Unknown',
        ...message,
      };
    } else {
      logEntry = {
        timestamp: new Date().toISOString(),
        level,
        agent: context as AgentType || 'Unknown',
        content: message,
      };
    }

    if (trace) {
      logEntry.trace = trace;
    }

    console.log(JSON.stringify(logEntry));
  }

  createAgentLogger(agent: AgentType): AgentLogger {
    return new AgentLogger(this, agent);
  }
}

export class AgentLogger {
  constructor(
    private logger: StructuredLoggerService,
    private agent: AgentType,
  ) {}

  log(data: Omit<StructuredLogEntry, 'timestamp' | 'level' | 'agent'>): void {
    this.logger.log(data, this.agent);
  }

  error(data: Omit<StructuredLogEntry, 'timestamp' | 'level' | 'agent'>, trace?: string): void {
    this.logger.error(data, trace, this.agent);
  }

  warn(data: Omit<StructuredLogEntry, 'timestamp' | 'level' | 'agent'>): void {
    this.logger.warn(data, this.agent);
  }

  debug(data: Omit<StructuredLogEntry, 'timestamp' | 'level' | 'agent'>): void {
    this.logger.debug(data, this.agent);
  }
}
