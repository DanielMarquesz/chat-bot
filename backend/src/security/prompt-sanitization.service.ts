import { Injectable, Logger } from '@nestjs/common';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class PromptSanitizationService {
  private readonly logger = new Logger(PromptSanitizationService.name);
  
  private readonly suspiciousPatterns = [
    /ignore previous instructions/i,
    /ignore all previous commands/i,
    /disregard previous instructions/i,
    /forget your instructions/i,
    /you are now/i,
    /system prompt/i,
    /you're actually/i,
    /you are actually/i,
    /new role/i,
    /new persona/i,
    /new personality/i,
    /new identity/i,
    /\<\/?system\>/i,
    /\<\/?user\>/i,
    /\<\/?assistant\>/i,
    /\<\/?instructions\>/i,
    /\<\/?prompt\>/i,
  ];

  sanitizeInput(input: string): string {
    if (!input) return '';
    
    try {
      const sanitized = sanitizeHtml(input, {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'recursiveEscape'
      });
      
      return sanitized;
    } catch (error) {
      this.logger.error(`Error sanitizing input: ${error.message}`);
      return input.replace(/<[^>]*>?/gm, '');
    }
  }

  isPromptSafe(input: string): boolean {
    if (!input) return true;
    
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(input)) {
        this.logger.warn(`Potential prompt injection detected: ${input.substring(0, 100)}...`);
        return false;
      }
    }
    
    const unusualFormatting = this.detectUnusualFormatting(input);
    if (unusualFormatting) {
      this.logger.warn(`Unusual formatting detected: ${unusualFormatting}`);
      return false;
    }
    
    return true;
  }
  
  private detectUnusualFormatting(input: string): string | null {
    if ((input.match(/\n/g) || []).length > 15) {
      return 'Excessive newlines';
    }
    
    if (/[\u2000-\u200F\u2028-\u202F\u205F-\u206F\uFEFF]/u.test(input)) {
      return 'Unusual Unicode control characters';
    }
    
    const repetitionRegex = /(.{3,})\1{5,}/;
    if (repetitionRegex.test(input)) {
      return 'Excessive repetition';
    }
    
    return null;
  }
  
  processUserInput(input: string): string {
    const sanitized = this.sanitizeInput(input);
    
    if (!this.isPromptSafe(sanitized)) {
      throw new Error('Potential security risk detected in the input');
    }
    
    return sanitized;
  }
}
