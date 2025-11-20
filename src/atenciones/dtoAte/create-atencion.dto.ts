import { IsUUID, IsString, IsNotEmpty, IsArray, IsOptional, IsDateString, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MedicamentoAtencionDto {
  @IsUUID()
  @IsNotEmpty()
  producto_id: string; 

  @IsString()
  @IsNotEmpty()
  nombre: string; 
  
  @IsNumber()
  @Min(1)
  cantidad: number;
  
  @IsString()
  @IsNotEmpty()
  dosis: string;
}

export class CreateAtencionDto {
  @IsUUID()
  @IsNotEmpty()
  estudiante_id: string;

  @IsDateString()
  fecha_hora_atencion: string;

  @IsString()
  @IsNotEmpty()
  tipo_atencion: string;

  @IsOptional()
  @IsString()
  sintomas?: string;
  
  @IsOptional()
  @IsString()
  diagnostico?: string;

  @IsOptional()
  @IsString()
  recomendaciones?: string

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true }) 
  @Type(() => MedicamentoAtencionDto) 
  medicamentos?: MedicamentoAtencionDto[];
}