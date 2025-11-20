import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { IncidenciaCreateDto } from './dtoInC/incidencia-create.dto';

interface LatestIncidenciaEvent {
    tipo_incidencia: string;
    reportado_por: string;
    fecha_hora_ocurrencia: string;
}

@Injectable()
export class IncidenciasService {
    constructor(private supabaseService: SupabaseService) {}

    private mapIncidenciaResponse(data: any): any {
        const estudiante = data.estudiante_id;
        return {
            id: data.id,
            fecha_hora_ocurrencia: data.fecha_hora_ocurrencia,
            tipo_incidencia: data.tipo_incidencia,
            nivel_severidad: data.nivel_severidad,
            descripcion_detallada: data.descripcion_detallada,
            estudiante: {
                nombres: estudiante?.nombres,
                apellidos: estudiante?.apellidos,
                dni: estudiante?.dni,
                grado: estudiante?.grado,
                seccion: estudiante?.seccion,
            },
        };
    }

    async createIncidencia(dto: IncidenciaCreateDto): Promise<any> {
        const supabase = this.supabaseService.getClient();
        
        const { data: estudianteData, error: estudianteError } = await supabase
            .from('estudiantes')
            .select('id')
            .eq('dni', dto.dniEstudiante)
            .single();

        if (estudianteError || !estudianteData) {
            throw new NotFoundException(`Estudiante con DNI ${dto.dniEstudiante} no encontrado.`);
        }

        const estudiante_id = estudianteData.id;

        const { data: incidenciaData, error: incidenciaError } = await supabase
            .from('incidencias')
            .insert({
                estudiante_id: estudiante_id,
                fecha_hora_ocurrencia: dto.fechaHoraOcurrencia,
                tipo_incidencia: dto.tipoIncidencia,
                ubicacion_incidente: dto.ubicacionIncidente,
                reportado_por: dto.reportadoPor,
                nivel_severidad: dto.nivelSeveridad,
                descripcion_detallada: dto.descripcionDetallada,
                primeros_auxilios_aplicados: dto.primerosAuxiliosAplicados || null,
                notificacion_padres: dto.notificacionPadres,
                traslado_centro_medico: dto.trasladoCentroMedico,
            })
            .select(`
                *,
                estudiante_id (nombres, apellidos, dni, grado, seccion)
            `)
            .single();

        if (incidenciaError) {
            console.error(incidenciaError);
            throw new BadRequestException('Error al registrar la incidencia: ' + incidenciaError.message);
        }

        return this.mapIncidenciaResponse(incidenciaData);
    }
    
    async countIncidenciasSince(date: Date): Promise<number> {
        const { data, error } = await this.supabaseService.getClient()
            .from('incidencias')
            .select('id', { count: 'exact' }) 
            .gte('fecha_hora_ocurrencia', date.toISOString());

        if (error) {
            console.error(error.message);
            return 0;
        }
        
        return data ? data.length : 0;
    }
    
    async getLatestEvents(limit: number): Promise<LatestIncidenciaEvent[]> {
        const { data, error } = await this.supabaseService.getClient()
            .from('incidencias')
            .select(`
                fecha_hora_ocurrencia,
                tipo_incidencia,
                reportado_por
            `)
            .order('fecha_hora_ocurrencia', { ascending: false })
            .limit(limit);

        if (error) {
            console.error(error.message);
            return [];
        }

        return data as LatestIncidenciaEvent[] || [];
    }
}