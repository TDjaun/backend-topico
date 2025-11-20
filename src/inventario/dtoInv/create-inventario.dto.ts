import { IsString, IsOptional, IsNumber, IsDateString, IsUUID } from 'class-validator';

export class CreateInventarioDto {
  @IsUUID()
  categoria_id: string;

  @IsString()
  nombre_producto: string;

  @IsOptional()
  @IsString()
  concentracion?: string;

  @IsOptional()
  @IsString()
  presentacion?: string;

  @IsOptional()
  @IsString()
  laboratorio?: string;

  @IsString()
  lote: string;

  @IsDateString()
  fecha_vencimiento: string;

  @IsOptional()
  @IsDateString()
  fecha_ingreso?: string;

  @IsNumber()
  cantidad_total: number;

  @IsOptional()
  @IsString()
  unidad_medida?: string;

  @IsOptional()
  @IsNumber()
  unidades_por_contenedor?: number;

  @IsOptional()
  @IsString()
  condiciones_almacenamiento?: string;

  @IsOptional()
  @IsString()
  proveedor?: string;

  @IsOptional()
  @IsString()
  factura_recibo?: string;

  @IsOptional()
  @IsNumber()
  costo_unitario?: number;

  @IsOptional()
  @IsNumber()
  costo_total?: number;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
