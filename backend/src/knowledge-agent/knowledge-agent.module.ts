import { Module } from '@nestjs/common';
import { KnowledgeAgentService } from './knowledge-agent.service';
import { OpenAIConfigService } from 'src/common/openai-config.service';
import { KnowledgeAgentConfig } from './knowledge-agent.config';
import { KnowledgeCrawlerService } from './knowledge-crawler.service';

@Module({
  providers: [KnowledgeAgentService, OpenAIConfigService, KnowledgeAgentConfig, KnowledgeCrawlerService],
  exports: [KnowledgeAgentService],
})
export class KnowledgeAgentModule {}
