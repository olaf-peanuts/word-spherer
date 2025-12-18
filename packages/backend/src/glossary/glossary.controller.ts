import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GlossaryService } from './glossary.service';
import { CreateTermDto } from './dtos/CreateTermDto';
import { UpdateTermDto } from './dtos/UpdateTermDto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('terms')
export class GlossaryController {
  constructor(private readonly glossaryService: GlossaryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateTermDto,
    @CurrentUser() user: any,
  ) {
    return this.glossaryService.create(dto, user.userId);
  }

  @Get('search')
  async search(@Query('q') q: string) {
    return this.glossaryService.search(q);
  }

  @Get('grouped')
  async getGroupedTerms() {
    return this.glossaryService.getGroupedTerms();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.glossaryService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTermDto,
    @CurrentUser() user: any,
  ) {
    return this.glossaryService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.glossaryService.delete(id, user.userId);
  }
}
