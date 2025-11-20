import { IsUUID, IsString, IsNotEmpty, IsDateString, IsOptional, IsIn } from 'class-validator';

export class IncidenciaCreateDto {

  @IsString()
  @IsNotEmpty()
  dniEstudiante: string;

  @IsDateString()
  @IsNotEmpty()
  fechaHoraOcurrencia: string;

  @IsString()
  @IsNotEmpty()
  tipoIncidencia: string;

  @IsString()
  @IsNotEmpty()
  ubicacionIncidente: string;

  @IsString()
  @IsNotEmpty()
  reportadoPor: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['Baja', 'Media', 'Alta'])
  nivelSeveridad: string;

  @IsString()
  @IsNotEmpty()
  descripcionDetallada: string;
  
  @IsString()
  @IsOptional()
  primerosAuxiliosAplicados?: string;

  @IsString()
  @IsNotEmpty()
  notificacionPadres: string;

  @IsString()
  @IsNotEmpty()
  trasladoCentroMedico: string;
}