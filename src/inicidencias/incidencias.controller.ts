import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';
import { IncidenciaCreateDto } from './dtoInC/incidencia-create.dto';

@Controller('incidencias')
export class IncidenciasController {
  constructor(private incidenciasService: IncidenciasService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async registrarIncidencia(@Body() dto: IncidenciaCreateDto) {
    return this.incidenciasService.createIncidencia(dto);
  }
}