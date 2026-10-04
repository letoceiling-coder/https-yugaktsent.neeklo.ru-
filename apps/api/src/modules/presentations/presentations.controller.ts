import { Controller, Get, Param, ParseIntPipe, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser, OptionalJwtUser, Public } from '../../auth/decorators';
import { PresentationsService } from './presentations.service';
import { pdfContentDisposition } from './presentation-pdf';

@ApiTags('Presentations')
@Controller('presentations')
export class PresentationsController {
  constructor(private readonly service: PresentationsService) {}

  @Public()
  @Get('listing/:listingId')
  @ApiOperation({ summary: 'Public: get presentation payload by listing id (any object type)' })
  getListing(@Param('listingId', ParseIntPipe) listingId: number) {
    return this.service.getListingPresentation(listingId);
  }

  @Public()
  @OptionalJwtUser()
  @Get('listing/:listingId/pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Public: download listing presentation PDF (photos + plans)' })
  async downloadListingPdf(
    @Param('listingId', ParseIntPipe) listingId: number,
    @CurrentUser('sub') userId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buf = await this.service.generateListingPdf(listingId, userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', pdfContentDisposition(`obyekt-${listingId}`, `listing-${listingId}`));
    res.setHeader('Content-Length', String(buf.length));
    return new StreamableFile(buf);
  }

  @Public()
  @OptionalJwtUser()
  @Get(':slug/pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Public: download presentation PDF by block slug' })
  async downloadPdf(
    @Param('slug') slug: string,
    @CurrentUser('sub') userId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buf = await this.service.generatePdf(slug, userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', pdfContentDisposition(`${slug}-prezentaciya`, `presentation-${slug}`));
    res.setHeader('Content-Length', String(buf.length));
    return new StreamableFile(buf);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Public: get presentation payload by block slug' })
  getBySlug(@Param('slug') slug: string) {
    return this.service.getBySlug(slug);
  }
}

