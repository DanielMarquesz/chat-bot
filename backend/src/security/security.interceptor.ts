import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PromptSanitizationService } from './prompt-sanitization.service';

@Injectable()
export class SecurityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecurityInterceptor.name);

  constructor(private readonly sanitizationService: PromptSanitizationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    if (request.body) {
      this.processRequestBody(request.body);
    }
    
    if (request.query) {
      this.processQueryParams(request.query);
    }

    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        this.logger.debug(
          `Request to ${request.path} processed in ${Date.now() - now}ms`,
        );
      }),
    );
  }

  private processRequestBody(body: any): void {
    if (body.message || body.question || body.content || body.text || body.prompt) {
      const fieldToSanitize = body.message || body.question || body.content || body.text || body.prompt;
      
      try {
        const sanitized = this.sanitizationService.processUserInput(fieldToSanitize);
        
        if (body.message) body.message = sanitized;
        if (body.question) body.question = sanitized;
        if (body.content) body.content = sanitized;
        if (body.text) body.text = sanitized;
        if (body.prompt) body.prompt = sanitized;
      } catch (error) {
        this.logger.warn(`Security violation detected: ${error.message}`);
        throw new BadRequestException('Input contains potentially harmful content');
      }
    }
    
    for (const key in body) {
      if (body.hasOwnProperty(key) && typeof body[key] === 'object' && body[key] !== null) {
        this.processRequestBody(body[key]);
      } else if (body.hasOwnProperty(key) && typeof body[key] === 'string') {
        try {
          body[key] = this.sanitizationService.sanitizeInput(body[key]);
        } catch (error) {
          this.logger.warn(`Error sanitizing field ${key}: ${error.message}`);
        }
      }
    }
  }

  private processQueryParams(query: any): void {
    for (const key in query) {
      if (query.hasOwnProperty(key) && typeof query[key] === 'string') {
        try {
          query[key] = this.sanitizationService.sanitizeInput(query[key]);
        } catch (error) {
          this.logger.warn(`Error sanitizing query param ${key}: ${error.message}`);
          throw new BadRequestException('Query parameter contains potentially harmful content');
        }
      }
    }
  }
}
