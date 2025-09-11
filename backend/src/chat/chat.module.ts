import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { RouterAgentService } from "src/router-agent/router-agent-service";
import { KnowledgeAgentService } from "src/knowledge-agent/knowledge-agent.service";
import { MathAgentService } from "src/math-agent/math-agent.service";
import { OpenAIConfigService } from "src/common/openai-config.service";

@Module({  
  controllers: [ChatController],
  providers: [ChatService, RouterAgentService, KnowledgeAgentService, MathAgentService, OpenAIConfigService],
})
export class ChatModule {}