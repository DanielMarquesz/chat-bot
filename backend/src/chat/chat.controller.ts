import { Body, Controller, HttpException, HttpStatus, Post, Logger, BadRequestException } from '@nestjs/common'
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatService } from './chat.service';
import { ChatResponseDto } from './dto/chat-response.dto';
import { PromptSanitizationService } from '../security/prompt-sanitization.service';


@Controller()
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly promptSanitizer: PromptSanitizationService
  ) {}

  @Post('chat')
  async chat(@Body() chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    try {
      if (!chatRequest.message) {
        throw new BadRequestException('Message cannot be empty');
      }
      
      try {
        const sanitizedMessage = this.promptSanitizer.processUserInput(chatRequest.message);
        chatRequest.message = sanitizedMessage;
      } catch (securityError) {
        this.logger.warn(`Security check failed: ${securityError.message}`);
        throw new BadRequestException('Your message contains potentially harmful content');
      }
      
      const result = await this.chatService.processMessage(chatRequest);
      this.logger.log(`Successfully processed message from user ${chatRequest.user_id || 'anonymous'}`);
      
      return result;
    } catch (error) {
      this.logger.error({
        message: `Error processing chat message: ${error.message}`,
        userId: chatRequest.user_id || 'anonymous',
        errorType: error.constructor.name,
        stack: error.stack,
      });
      
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Failed to process chat message',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}