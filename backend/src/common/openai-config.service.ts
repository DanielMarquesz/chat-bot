import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenAIConfigService {
  constructor(private configService: ConfigService) {}

  getApiKey(): string {
    return this.configService.get<string>('OPENAI_API_KEY') || '';
  }

  getModelName(): string {
    return this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo';
  }

  getTemperature(): number {
    return this.configService.get<number>('OPENAI_TEMPERATURE') || 0.1;
  }

  getMaxTokens(): number {
    return this.configService.get<number>('OPENAI_MAX_TOKENS') || 100;
  }

  isConfigured(): boolean {
    const apiKey = this.getApiKey();
    return !!apiKey && apiKey !== 'sua-chave-aqui';
  }
}