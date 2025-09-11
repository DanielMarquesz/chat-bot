import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common'
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatService } from './chat.service';
import { ChatResponseDto } from './dto/chat-response.dto';


@Controller()
export class ChatController {
  constructor(
    private readonly chatService: ChatService
  ) {}

  @Post('chat')
  async chat(@Body() chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    try {
      return await this.chatService.processMessage(chatRequest);
    } catch (error) {
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