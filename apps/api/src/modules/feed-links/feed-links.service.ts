import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeedLinkDto } from './dto/create-feed-link.dto';
import { UpdateFeedLinkDto } from './dto/update-feed-link.dto';
import { MarkFeedSyncedDto } from './dto/mark-feed-synced.dto';

const FEED_LINK_INCLUDE = {
  region: { select: { id: true, code: true, name: true } },
} as const;

@Injectable()
export class FeedLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllAdmin(opts?: { regionId?: number; enabledOnly?: boolean }) {
    return this.prisma.feedLink.findMany({
      where: {
        ...(opts?.regionId ? { regionId: opts.regionId } : {}),
        ...(opts?.enabledOnly ? { isEnabled: true } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      include: FEED_LINK_INCLUDE,
    });
  }

  async findOne(id: number) {
    const row = await this.prisma.feedLink.findUnique({
      where: { id },
      include: FEED_LINK_INCLUDE,
    });
    if (!row) throw new NotFoundException('Фид не найден');
    return row;
  }

  async createAdmin(dto: CreateFeedLinkDto) {
    await this.assertRegion(dto.regionId);
    const name = dto.name.trim();
    const feedUrl = dto.feedUrl.trim();
    if (!name) throw new BadRequestException('Название не может быть пустым');
    if (!feedUrl) throw new BadRequestException('URL фида не может быть пустым');
    this.assertFeedUrl(feedUrl);

    try {
      return await this.prisma.feedLink.create({
        data: {
          regionId: dto.regionId,
          name,
          feedUrl,
          blockName: dto.blockName?.trim() || null,
          provider: dto.provider?.trim() || 'profitbase',
          isEnabled: dto.isEnabled ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
        include: FEED_LINK_INCLUDE,
      });
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Фид с таким URL уже существует');
      }
      throw err;
    }
  }

  async updateAdmin(id: number, dto: UpdateFeedLinkDto) {
    await this.findOne(id);
    if (dto.regionId !== undefined) await this.assertRegion(dto.regionId);

    const data: Record<string, unknown> = {};
    if (dto.regionId !== undefined) data.regionId = dto.regionId;
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Название не может быть пустым');
      data.name = name;
    }
    if (dto.feedUrl !== undefined) {
      const feedUrl = dto.feedUrl.trim();
      if (!feedUrl) throw new BadRequestException('URL фида не может быть пустым');
      this.assertFeedUrl(feedUrl);
      data.feedUrl = feedUrl;
    }
    if (dto.blockName !== undefined) data.blockName = dto.blockName?.trim() || null;
    if (dto.provider !== undefined) data.provider = dto.provider.trim() || 'profitbase';
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    try {
      return await this.prisma.feedLink.update({
        where: { id },
        data,
        include: FEED_LINK_INCLUDE,
      });
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Фид с таким URL уже существует');
      }
      throw err;
    }
  }

  async deleteAdmin(id: number) {
    await this.findOne(id);
    await this.prisma.feedLink.delete({ where: { id } });
  }

  async markSynced(id: number, stats?: MarkFeedSyncedDto) {
    await this.findOne(id);
    return this.prisma.feedLink.update({
      where: { id },
      data: {
        lastSyncedAt: new Date(),
        ...(stats?.status !== undefined ? { lastSyncStatus: stats.status } : {}),
        ...(stats?.total !== undefined ? { lastSyncTotal: stats.total } : {}),
        ...(stats?.created !== undefined ? { lastSyncCreated: stats.created } : {}),
        ...(stats?.updated !== undefined ? { lastSyncUpdated: stats.updated } : {}),
        ...(stats?.errors !== undefined ? { lastSyncErrors: stats.errors } : {}),
      },
      include: FEED_LINK_INCLUDE,
    });
  }

  async probe(id: number) {
    const link = await this.findOne(id);
    const started = Date.now();
    const res = await fetch(link.feedUrl, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) {
      return {
        ok: false,
        httpStatus: res.status,
        offerCount: 0,
        durationMs: Date.now() - started,
        error: `HTTP ${res.status}`,
      };
    }
    const xml = await res.text();
    const offerCount = (xml.match(/<offer[\s>]/g) ?? []).length;
    return {
      ok: true,
      httpStatus: res.status,
      offerCount,
      durationMs: Date.now() - started,
      bytes: xml.length,
    };
  }

  private async assertRegion(regionId: number) {
    const region = await this.prisma.feedRegion.findUnique({ where: { id: regionId } });
    if (!region) throw new NotFoundException('Регион не найден');
  }

  private assertFeedUrl(url: string) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('Некорректный URL фида');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('URL фида должен начинаться с http:// или https://');
    }
  }

  private isUniqueViolation(err: unknown) {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    );
  }
}
