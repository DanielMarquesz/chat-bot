import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KnowledgeAgentConfig {
  constructor(private configService: ConfigService) {}

  getKnowledgeBaseUrls(): string[] {
    const configuredUrls = this.configService.get<string>('KNOWLEDGE_BASE_URLS');
    if (configuredUrls) {
      return configuredUrls.split(',').map(url => url.trim());
    }    
    return ['https://ajuda.infinitepay.io/pt-BR'];
  }

  getChunkSize(): number {
    return this.configService.get<number>('KNOWLEDGE_CHUNK_SIZE') || 1000;
  }

  getChunkOverlap(): number {
    return this.configService.get<number>('KNOWLEDGE_CHUNK_OVERLAP') || 200;
  }

  getTopK(): number {
    return this.configService.get<number>('KNOWLEDGE_TOP_K') || 3;
  }

  getEmbeddingModel(): string {
    return this.configService.get<string>('EMBEDDING_MODEL') || 'text-embedding-ada-002';
  }
}
