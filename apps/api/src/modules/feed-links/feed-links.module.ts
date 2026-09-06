import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FeedLinksAdminController } from './feed-links-admin.controller';
import { FeedLinksService } from './feed-links.service';

@Module({
  imports: [AuditModule],
  controllers: [FeedLinksAdminController],
  providers: [FeedLinksService],
  exports: [FeedLinksService],
})
export class FeedLinksModule {}
