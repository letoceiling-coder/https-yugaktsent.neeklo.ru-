import { PartialType } from '@nestjs/swagger';
import { CreateFeedLinkDto } from './create-feed-link.dto';

export class UpdateFeedLinkDto extends PartialType(CreateFeedLinkDto) {}
