import { Injectable, OnModuleInit } from '@nestjs/common';
import { AgentResponse } from '../interfaces/routing-decision.interface';
import { OpenAIConfigService } from '../common/openai-config.service';
import { KnowledgeAgentConfig } from './knowledge-agent.config';
import { KnowledgeCrawlerService } from './knowledge-crawler.service';
import { AgentLogger, StructuredLoggerService } from '../common/structured-logger.service';
import { ChatOpenAI } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { Document } from 'langchain/document';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class KnowledgeAgentService implements OnModuleInit {
  private readonly logger: AgentLogger;
  private vectorStore: MemoryVectorStore;
  private llm: ChatOpenAI;
  private ragChain: RunnableSequence;
  private knowledgeBaseUrls: string[];
  private loadedSources: string[] = [];
  
  constructor(
    private readonly openAIConfig: OpenAIConfigService,
    private readonly config: KnowledgeAgentConfig,
    private readonly crawler: KnowledgeCrawlerService,
    private readonly loggerService: StructuredLoggerService
  ) {
    this.logger = this.loggerService.createAgentLogger('KnowledgeAgent');
  }

  async onModuleInit() {
    await this.initializeRAG();
  }

  private async initializeRAG() {
    try {
      this.logger.log({
        content: 'Initializing RAG system...',
        conversation_id: 'system',
        user_id: 'system'
      });
      
      // Initialize LLM
      if (!this.openAIConfig.isConfigured()) {
        this.logger.warn({
          content: 'OpenAI API key not configured. KnowledgeAgent will use fallback responses.',
          conversation_id: 'system',
          user_id: 'system'
        });
        return;
      }
      
      this.llm = new ChatOpenAI({
        apiKey: this.openAIConfig.getApiKey(),
        modelName: this.openAIConfig.getModelName(),
        temperature: Number(this.openAIConfig.getTemperature()),
      });
      
      // Get knowledge base URLs from configuration
      this.knowledgeBaseUrls = this.config.getKnowledgeBaseUrls();
      this.logger.log({
        content: `Configured knowledge base URLs: ${this.knowledgeBaseUrls.join(', ')}`,
        conversation_id: 'system',
        user_id: 'system'
      });
      
      // Load and process documents
      await this.loadDocuments();
      
      // Create RAG chain
      this.createRAGChain();
      
      this.logger.log({
        content: 'RAG system initialized successfully',
        conversation_id: 'system',
        user_id: 'system'
      });
    } catch (error) {
      this.logger.error({
        content: 'Failed to initialize RAG system',
        error: error.stack,
        conversation_id: 'system',
        user_id: 'system'
      });
    }
  }
  
  private async loadDocuments() {
    try {
      let allDocs: Document[] = [];      
      
      for (const url of this.knowledgeBaseUrls) {
        try {
          this.logger.log({
            content: `Crawling content from ${url}`,
            conversation_id: 'system',
            user_id: 'system'
          });          
          
          const crawledPages = await this.crawler.crawlWebsite(url);
          
          this.logger.log({
            content: `Crawled ${crawledPages.length} pages from ${url}`,
            conversation_id: 'system',
            user_id: 'system'
          });          
          
          const docs = crawledPages.map(page => {
            return new Document({
              pageContent: `${page.title}\n\n${page.content}`,
              metadata: {
                source: page.url,
                title: page.title
              }
            });
          });
          
          allDocs = [...allDocs, ...docs];
          this.loadedSources.push(url);
          
        } catch (error) {
          this.logger.error({
            content: `Error crawling content from ${url}`,
            error: error.stack,
            conversation_id: 'system',
            user_id: 'system'
          });          
          this.logger.error({
            content: `Error details for ${url}: ${error.message}`,
            error: error.stack,
            conversation_id: 'system',
            user_id: 'system'
          });          
        }
      }
      
      if (allDocs.length === 0) {
        throw new Error('Failed to load any documents from the configured URLs');
      }
      
      this.logger.log({
        content: `Loaded a total of ${allDocs.length} documents. Processing...`,
        conversation_id: 'system',
        user_id: 'system'
      });
      
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: this.config.getChunkSize(),
        chunkOverlap: this.config.getChunkOverlap(),
      });
      
      const splitDocs = await textSplitter.splitDocuments(allDocs);
      this.logger.log({
        content: `Split into ${splitDocs.length} chunks`,
        conversation_id: 'system',
        user_id: 'system'
      });      
      
      const embeddings = new OpenAIEmbeddings({
        apiKey: this.openAIConfig.getApiKey(),
        modelName: this.config.getEmbeddingModel(),
      });
      
      this.vectorStore = await MemoryVectorStore.fromDocuments(
        splitDocs,
        embeddings
      );
      
      this.logger.log({
        content: 'Vector store created successfully',
        conversation_id: 'system',
        user_id: 'system'
      });
    } catch (error) {
      this.logger.error({
        content: 'Error loading documents',
        error: error.stack,
        conversation_id: 'system',
        user_id: 'system'
      });
      throw error;
    }
  }
  
  private createRAGChain() {    
    const promptTemplate = PromptTemplate.fromTemplate(`
      Você é um assistente especializado para clientes da InfinitePay.
      Responda à pergunta baseando-se APENAS no contexto fornecido abaixo.
      Se você não souber a resposta, diga que não sabe. Não invente informações.
      
      Contexto: {context}
      
      Pergunta: {question}
      
      Responda no mesmo idioma da pergunta (português, inglês ou espanhol).
    `);    
    
    this.ragChain = RunnableSequence.from([
      {
        context: async (input: { question: string }) => {          
          const docs = await this.vectorStore.similaritySearch(
            input.question, 
            this.config.getTopK()
          );          
          
          return docs.map(doc => {
            const source = doc.metadata.source || 'Unknown source';
            return `[Fonte: ${source}]\n${doc.pageContent}`;
          }).join('\n\n');
        },
        question: (input: { question: string }) => input.question,
      },
      promptTemplate,
      this.llm,
      new StringOutputParser(),
    ]);
  }
  
  async processQuestion(question: string, conversation_id?: string, user_id?: string): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      let answer: string;
      
      if (this.ragChain) {        
        answer = await this.ragChain.invoke({ question });
      } else {        
        answer = await this.fallbackProcessing(question);
      }
      
      const executionTime = Date.now() - startTime;
      this.logExecution(question, answer, executionTime, conversation_id, user_id);

      return {
        success: true,
        answer: answer,
        sources: this.loadedSources,
        executionTime,
      };
    } catch (error) {
      this.logger.error({
        conversation_id: conversation_id || 'unknown',
        user_id: user_id || 'unknown',
        content: `Error processing knowledge question: ${error.message}`,
        error: error.stack,
        execution_time: Date.now() - startTime
      });
      
      try {        
        if (this.llm) {
          const fallbackAnswer = await this.directLLMFallback(question);
          return {
            success: true,
            answer: fallbackAnswer,
            sources: [],
            executionTime: Date.now() - startTime,
          };
        }
      } catch (fallbackError) {
        this.logger.error({
          conversation_id: conversation_id || 'unknown',
          user_id: user_id || 'unknown',
          content: `Fallback also failed: ${fallbackError.message}`,
          error: fallbackError.stack,
          execution_time: Date.now() - startTime
        });
      }
      
      return {
        success: false,
        answer: 'Desculpe, encontrei um erro ao processar sua pergunta. Por favor, tente novamente mais tarde.',
        sources: [],
        executionTime: Date.now() - startTime,
      };
    }
  }

  private async fallbackProcessing(question: string): Promise<string> {    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return `Não tenho informações suficientes para responder sua pergunta sobre a InfinitePay no momento. Por favor, entre em contato com o suporte ao cliente para obter mais assistência.`;
  }
  
  private async directLLMFallback(question: string): Promise<string> {
    const systemPrompt = `Você é um assistente para clientes da InfinitePay.
    Você deve responder perguntas sobre a InfinitePay de forma útil, mas deve deixar claro quando não tem informações específicas.
    Responda no mesmo idioma da pergunta (português, inglês ou espanhol).`;
    
    const response = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(question),
    ]);
    
    return response.content.toString();
  }

  private logExecution(question: string, answer: string, executionTime: number, conversation_id?: string, user_id?: string): void {
    this.logger.log({
      conversation_id: conversation_id || 'unknown',
      user_id: user_id || 'unknown',
      execution_time: executionTime,
      content: answer,
      question,
      answer_length: answer.length,
      sources: this.loadedSources
    });
  }
}