import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, MaxLength } from 'class-validator';

export class SetBlockCoverDto {
  @ApiProperty({
    description: 'Прямая ссылка на изображение. Файл не скачивается — хранится только адрес.',
    example: 'https://cdn.example.com/house.jpg',
  })
  @IsString()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  url!: string;
}
