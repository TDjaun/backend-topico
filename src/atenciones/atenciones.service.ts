import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { InventarioService } from 'src/inventario/inventario.service'; 
import { CreateAtencionDto, MedicamentoAtencionDto } from './dtoAte/create-atencion.dto';
import { BuscarEstudianteDto } from './dtoAte/buscar-estudiante.dto';
import { CreateSeguimientoDto } from './dtoAte/create-seguimiento.dto'; // Importación del nuevo DTO

interface LatestAtencionEvent {
    estudianteNombre: string;
    sintomas: string;
    tipo_atencion: string;
    fecha_hora_atencion: string;
}

interface SupabaseLatestAtencion {
    fecha_hora_atencion: string;
    sintomas: string;
    tipo_atencion: string;
    estudiante: { nombres: string; apellidos: string }[];
}

@Injectable()
export class AtencionesService {
    private tableAtenciones = 'atenciones_medicas';
    private tableEstudiantes = 'estudiantes';
    private tableSeguimientos = 'seguimientos_atenciones'; // Nueva tabla para seguimientos

    constructor(
        private readonly supabase: SupabaseService,
        private readonly inventarioService: InventarioService,
    ) {}

    async buscarEstudiante({ query }: BuscarEstudianteDto) {
        const { data, error } = await this.supabase.getClient()
            .from(this.tableEstudiantes)
            .select('*')
            .or(`dni.ilike.%${query}%,nombres.ilike.%${query}%,apellidos.ilike.%${query}%`)
            .limit(1);

        if (error || !data || data.length === 0) {
            throw new NotFoundException('Estudiante no encontrado');
        }

        return data[0];
    }

    async crearAtencion(dto: CreateAtencionDto) {

        if (dto.medicamentos && dto.medicamentos.length > 0) {
            for (const medicamento of dto.medicamentos as MedicamentoAtencionDto[]) {
                try {
                    await this.inventarioService.reducirStock(
                        medicamento.producto_id,
                        medicamento.cantidad,
                    );
                } catch (error) {
                    throw new BadRequestException(`Fallo en el inventario para ${medicamento.nombre}: ${error.message}`);
                }
            }
        }

        const insertPayload = {
            estudiante_id: dto.estudiante_id,
            fecha_hora_atencion: dto.fecha_hora_atencion,
            tipo_atencion: dto.tipo_atencion,
            sintomas: dto.sintomas,
            diagnostico: dto.diagnostico,
            recomendaciones: dto.recomendaciones,
            observaciones: dto.observaciones,
            medicamentos: dto.medicamentos, 
        };

        Object.keys(insertPayload).forEach(key => {
            if (insertPayload[key] === undefined || insertPayload[key] === null) {
                delete insertPayload[key];
            }
        });

        const { data, error } = await this.supabase.getClient()
            .from(this.tableAtenciones)
            .insert(insertPayload) 
            .select()
            .single();

        if (error) {
            throw new Error(`Error al insertar atención: ${error.message}`);
        }
        
        return data;
    }
    
    /**
     * Registra un seguimiento para una atención médica existente.
     * @param dto Datos del seguimiento a registrar.
     */
    async registrarSeguimiento(dto: CreateSeguimientoDto) {
        // Opcional: Verificar si la atencion_id existe antes de insertar

        const insertPayload = {
            atencion_id: dto.atencion_id,
            fecha_hora_seguimiento: dto.fecha_hora_seguimiento,
            efecto_observado: dto.efecto_observado,
            recomendaciones_seguimiento: dto.recomendaciones_seguimiento,
            observaciones_adicionales: dto.observaciones_adicionales,
        };

        const { data, error } = await this.supabase.getClient()
            .from(this.tableSeguimientos)
            .insert(insertPayload)
            .select()
            .single();

        if (error) {
            console.error('Error al registrar seguimiento:', error.message);
            throw new Error(`Error al registrar seguimiento: ${error.message}`);
        }

        return data;
    }

    /**
     * Obtiene todos los seguimientos asociados a una atención médica específica.
     * Esto sería útil para mostrar el historial completo de una atención.
     * @param atencionId ID de la atención a consultar.
     */
    async obtenerSeguimientosPorAtencion(atencionId: number) {
        const { data, error } = await this.supabase.getClient()
            .from(this.tableSeguimientos)
            .select('*')
            .eq('atencion_id', atencionId)
            .order('fecha_hora_seguimiento', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    }

    async obtenerHistorialPorEstudiante(id: string) {
        // En un caso real, podrías querer enriquecer este historial con los seguimientos
        const { data, error } = await this.supabase.getClient()
            .from(this.tableAtenciones)
            .select('*')
            .eq('estudiante_id', id)
            .order('fecha_hora_atencion', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    }

    async countAtencionesSince(date: Date): Promise<number> {
        const { data, error } = await this.supabase.getClient()
            .from(this.tableAtenciones)
            .select('id', { count: 'exact' })
            .gte('fecha_hora_atencion', date.toISOString());

        if (error) {
            console.error(error.message);
            return 0;
        }
        
        return data ? data.length : 0;
    }
    
    async getLatestEvents(limit: number): Promise<LatestAtencionEvent[]> {
        const { data, error } = await this.supabase.getClient()
            .from(this.tableAtenciones)
            .select(`
                fecha_hora_atencion,
                sintomas,
                tipo_atencion,
                estudiante:estudiantes (nombres, apellidos)
            `)
            .order('fecha_hora_atencion', { ascending: false })
            .limit(limit);

        if (error) {
            console.error(error.message);
            return [];
        }

        if (!data) return [];
        
        return data.map((att: SupabaseLatestAtencion) => ({
            estudianteNombre: `${att.estudiante[0]?.nombres || ''} ${att.estudiante[0]?.apellidos || ''}`,
            sintomas: att.sintomas,
            tipo_atencion: att.tipo_atencion,
            fecha_hora_atencion: att.fecha_hora_atencion,
        })) as LatestAtencionEvent[];
    }
}