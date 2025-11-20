import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { AtencionesService } from './atenciones.service';
import { CreateAtencionDto } from './dtoAte/create-atencion.dto';
import { BuscarEstudianteDto } from './dtoAte/buscar-estudiante.dto';
import { CreateSeguimientoDto } from './dtoAte/create-seguimiento.dto'

@Controller('atenciones')
export class AtencionesController {
  constructor(private readonly service: AtencionesService) {}

  @Get('estudiantes/buscar')
  buscarEstudiante(@Query() dto: BuscarEstudianteDto) {
    return this.service.buscarEstudiante(dto);
  }

  @Post()
  crearAtencion(@Body() dto: CreateAtencionDto) {
    return this.service.crearAtencion(dto);
  }
  @Post('seguimiento')
  registrarSeguimiento(@Body() dto: CreateSeguimientoDto) {
    return this.service.registrarSeguimiento(dto);
  }
}