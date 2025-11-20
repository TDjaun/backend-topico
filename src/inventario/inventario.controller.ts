import { Controller, Get, Post, Put, Delete, Param, Body, Patch, BadRequestException, Query } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CreateInventarioDto } from './dtoInv/create-inventario.dto';
import { UpdateInventarioDto } from './dtoInv/update-inventario.dto';

@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Post()
  crear(@Body() dto: CreateInventarioDto) {
    return this.inventarioService.crear(dto);
  }

  @Get()
  listar() {
    return this.inventarioService.listar();
  }
  
  @Get('buscar') 
  async buscarMedicamentos(@Query('q') query: string) {
    if (!query || query.length < 3) {
        return []; 
    }
    return this.inventarioService.buscarPorNombre(query);
  }
  
  @Get('medicamentos/disponibles')
  async obtenerMedicamentosDisponibles() {
    return await this.inventarioService.obtenerMedicamentosDisponibles();
  }

  @Get(':id') 
  obtenerPorId(@Param('id') id: string) {
    return this.inventarioService.obtenerPorId(id);
  }

  @Put(':id')
  actualizar(@Param('id') id: string, @Body() dto: UpdateInventarioDto) {
    return this.inventarioService.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.inventarioService.eliminar(id);
  }

  @Put('medicamentos/reducir-stock/:id')
  async reducirStock(
    @Param('id') id: string,
    @Body() body: { cantidadReducida: number },
  ) {
    const { cantidadReducida } = body;

    if (!cantidadReducida || cantidadReducida <= 0) {
      throw new BadRequestException('Cantidad inválida');
    }

    return this.inventarioService.reducirStock(id, cantidadReducida);
  }
}