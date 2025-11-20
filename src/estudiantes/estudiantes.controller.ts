import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EstudiantesService } from './estudiantes.service';
import * as XLSX from 'xlsx';
import type { Express } from 'express';

@Controller('estudiantes')
export class EstudiantesController {
  constructor(private readonly estudiantesService: EstudiantesService) {}

  @Post('importar')
  @UseInterceptors(FileInterceptor('file'))
  async importar(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo no enviado');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const { inserted, skipped, conflicts } =
      await this.estudiantesService.importarDesdeArray(json);

    return { inserted, skipped, conflicts };
  }

  @Get('buscar')
  async buscar(@Query('query') query: string) {
    if (!query || query.trim() === '') {
      throw new BadRequestException('Debe proporcionar un término de búsqueda');
    }

    const estudiante = await this.estudiantesService.buscarEstudiante(query);
    if (!estudiante) {
      throw new BadRequestException('Estudiante no encontrado');
    }
    return estudiante;
  }
}
