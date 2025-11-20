import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateSeguimientoDto {
    @IsUUID() // <--- CAMBIO AQUÍ: Usamos IsUUID para coincidir con la tabla 'atenciones_medicas'
    @IsNotEmpty()
    atencion_id: string; // ID de la atención médica a la que se le da seguimiento

    @IsString()
    @IsNotEmpty()
    efecto_observado: string; // Ejemplo: 'Mejoría', 'Sin cambio', 'Empeoramiento'

    @IsString()
    @IsOptional()
    recomendaciones_seguimiento?: string; // Nuevas recomendaciones basadas en el seguimiento

    @IsString()
    @IsOptional()
    observaciones_adicionales?: string; // Cualquier otra nota relevante

    @IsDateString()
    @IsNotEmpty()
    fecha_hora_seguimiento: string; // Fecha y hora del evento de seguimiento
}