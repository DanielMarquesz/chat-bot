import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { SecurityInterceptor } from './security.interceptor';
import { GlobalExceptionFilter } from './global-exception.filter';
import { PromptSanitizationService } from './prompt-sanitization.service';

@Module({
  providers: [
    PromptSanitizationService,
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [PromptSanitizationService],
})
export class SecurityModule {}
