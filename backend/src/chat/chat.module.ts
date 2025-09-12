import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { RouterAgentService } from "src/router-agent/router-agent-service";
import { MathAgentService } from "src/math-agent/math-agent.service";
import { OpenAIConfigService } from "src/common/openai-config.service";
import { KnowledgeAgentModule } from "src/knowledge-agent/knowledge-agent.module";

@Module({  
  imports: [KnowledgeAgentModule],
  controllers: [ChatController],
  providers: [ChatService, RouterAgentService, MathAgentService, OpenAIConfigService],
})
export class ChatModule {}