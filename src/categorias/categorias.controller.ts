import { Controller, Get, Post, Body, Param, Delete, Patch } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dtoCat/create-categoria.dto';
import { UpdateCategoriaDto } from './dtoCat/update-categoria.dto';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Post()
  crear(@Body() dto: CreateCategoriaDto) {
    return this.categoriasService.crear(dto);
  }

  @Get()
  listar() {
    return this.categoriasService.listar();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.categoriasService.obtenerPorId(id);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: UpdateCategoriaDto) {
    return this.categoriasService.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.categoriasService.eliminar(id);
  }
}
