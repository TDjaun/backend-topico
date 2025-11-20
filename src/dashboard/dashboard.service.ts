import { Injectable } from '@nestjs/common';
import { AtencionesService } from '../atenciones/atenciones.service'; 
import { IncidenciasService } from '../inicidencias/incidencias.service';
import { InventarioService } from '../inventario/inventario.service';
import { EstudiantesService } from '../estudiantes/estudiantes.service';

export interface ResumenOperacional {
    atencionesHoy: number;
    stockTotal: number;
    incidencias7Dias: number;
    alertasStockMinimo: number;
}

export interface TimelineEvent {
    tipo: 'Atención Médica' | 'Incidencia' | 'Inventario';
    descripcion: string;
    detalle: string;
    fechaHora: Date;
}

export interface DashboardData {
    resumenOperacional: ResumenOperacional;
    lineaDeTiempo: TimelineEvent[];
}
Injectable()
export class DashboardService {
    constructor(
        private readonly atencionesService: AtencionesService,
        private readonly incidenciasService: IncidenciasService,
        private readonly inventarioService: InventarioService,
        private readonly estudiantesService: EstudiantesService,
    ) {}

    async getDashboardData(): Promise<DashboardData> {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7); 
        last7Days.setHours(0, 0, 0, 0); 

        const atencionesHoy = await this.atencionesService.countAtencionesSince(today); 
        const stockTotal = await this.inventarioService.sumTotalStock();
        const incidencias7Dias = await this.incidenciasService.countIncidenciasSince(last7Days);
        const umbralStockMinimo = 10; 
        const alertasStockMinimo = await this.inventarioService.countStockAlerts(umbralStockMinimo); 
        const latestAtenciones = await this.atencionesService.getLatestEvents(3); 
        const latestIncidencias = await this.incidenciasService.getLatestEvents(2);

        
        const atencionesTimeline: TimelineEvent[] = latestAtenciones.map(att => ({
            tipo: 'Atención Médica',
            descripcion: `Atención a ${att.estudianteNombre} completada.`, 
            detalle: `Causa: ${att.sintomas || att.tipo_atencion}`,
            fechaHora: new Date(att.fecha_hora_atencion),
        }));

        const incidenciasTimeline: TimelineEvent[] = latestIncidencias.map(inc => ({
            tipo: 'Incidencia',
            descripcion: `Incidencia de ${inc.tipo_incidencia} registrada.`,
            detalle: `Reportado por: ${inc.reportado_por}`,
            fechaHora: new Date(inc.fecha_hora_ocurrencia),
        }));

        const lineaDeTiempo = [...atencionesTimeline, ...incidenciasTimeline]
            .sort((a, b) => b.fechaHora.getTime() - a.fechaHora.getTime());

        return {
            resumenOperacional: {
                atencionesHoy,
                stockTotal,
                incidencias7Dias,
                alertasStockMinimo,
            },
            lineaDeTiempo,
        };
    }
}