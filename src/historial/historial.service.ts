import { Injectable, BadRequestException } from '@nestjs/common';
import { HistorialQueryDto } from './dtoHis/historial-query.dto';
import { HistorialMappedDto } from './dtoHis/historial-mapped.dto'; 
import { SupabaseService } from '../supabase/supabase.service';
import PDFDocument from 'pdfkit'; 
import { stringify } from 'csv-stringify';

interface FileResponse {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

// DEFINICIÓN DE INTERFACES RAW (TAL COMO VIENEN DE LA DB CON EL JOIN)
interface RawEstudiante {
    id: number;
    nombres: string;
    apellidos: string;
    dni: string;
    grado: string;
    seccion: string;
}

interface RawAtencionHistorial {
    // Asumimos que los IDs de la DB son 'number' aunque el DTO los mapee a 'string'
    id: number; 
    fecha_hora_atencion: string;
    tipo_atencion: string;
    sintomas: string;
    diagnostico: string;
    recomendaciones: string;
    observaciones: string;
    medicamentos: any; 
    estudiante_id: RawEstudiante; 
}

@Injectable()
export class HistorialService {
  constructor(private supabaseService: SupabaseService) {}

  async getHistorialCompleto(query: HistorialQueryDto): Promise<HistorialMappedDto[]> {
    const { q, page = '1', limit = '10' } = query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let dbQuery = this.supabaseService.getClient()
      .from('atenciones_medicas')
      .select(`
        id, 
        fecha_hora_atencion, 
        tipo_atencion, 
        sintomas, 
        diagnostico, 
        recomendaciones, 
        observaciones,
        medicamentos,
        estudiante_id!inner (id, nombres, apellidos, dni, grado, seccion) 
      `);

    if (q) {
      const terminoBusqueda = q.trim(); 
      const esDni = /^\d+$/.test(terminoBusqueda); 

      if (esDni) {
         dbQuery = dbQuery.ilike('estudiante_id.dni', `%${terminoBusqueda}%`);
      } else {
         dbQuery = dbQuery.ilike('estudiante_id.nombres', `%${terminoBusqueda}%`);
      }
    }
    
    const { data, error } = await dbQuery
      .order('fecha_hora_atencion', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      throw new BadRequestException('Error al consultar el historial médico: ' + error.message);
    }
    
    // CORRECCIÓN 1: Casteo doble (as unknown as T) para forzar el tipo desde Supabase
    const typedData = data as unknown as RawAtencionHistorial[];

    const estudianteIds = [...new Set(typedData.map(item => item.estudiante_id.id).filter(id => id !== undefined))];
    const conteoAtenciones = await this.contarAtencionesPorEstudiante(estudianteIds);
    return typedData.map(item => {
        const mappedItem = this.mapAtencionToDto(item);
        const estudianteId = item.estudiante_id.id; 
        
        (mappedItem as any).total_atenciones_estudiante = estudianteId !== undefined 
            ? conteoAtenciones[estudianteId] || 0
            : undefined;
        
        return mappedItem;
    });
  }

  private async contarAtencionesPorEstudiante(estudianteIds: number[]): Promise<Record<number, number>> {
    if (estudianteIds.length === 0) {
        return {};
    }

    const { data: groupCount, error: groupError } = await this.supabaseService.getClient()
      .from('atenciones_medicas')
      .select('estudiante_id, id', { count: 'exact' })
      .in('estudiante_id', estudianteIds);

    if (groupError) {
        console.error('Error al contar atenciones:', groupError.message);
        return {};
    }

    const conteo: Record<number, number> = {};
    groupCount.forEach(row => {
        const id = row.estudiante_id;
        if (id) {
            conteo[id] = (conteo[id] || 0) + 1;
        }
    });

    return conteo;
  }

  private async getHistorialParaExportar(query: HistorialQueryDto): Promise<HistorialMappedDto[]> {
      const { q } = query;
      
      let dbQuery = this.supabaseService.getClient()
          .from('atenciones_medicas')
          .select(`
              id, fecha_hora_atencion, tipo_atencion, sintomas, diagnostico, 
              recomendaciones, observaciones,
              medicamentos,
              estudiante_id (id, nombres, apellidos, dni, grado, seccion)
          `);

      if (q) {
          const terminoBusqueda = q.trim();
          const esDni = /^\d+$/.test(terminoBusqueda); 

          if (esDni) {
              dbQuery = dbQuery.ilike('estudiante_id.dni', `%${terminoBusqueda}%`);
          } else {
              dbQuery = dbQuery.ilike('estudiante_id.nombres', `%${terminoBusqueda}%`);
          }
          
          dbQuery = dbQuery.not('estudiante_id', 'is', null);
      }
      
      const { data, error } = await dbQuery
          .order('fecha_hora_atencion', { ascending: false });

      if (error) {
          throw new BadRequestException('Error al obtener datos para exportar: ' + error.message);
      }

      // CORRECCIÓN 1: Casteo doble (as unknown as T) para forzar el tipo desde Supabase
      const typedData = data as unknown as RawAtencionHistorial[];

      return typedData.map(item => this.mapAtencionToDto(item));
  }

  private mapAtencionToDto(atencion: RawAtencionHistorial): HistorialMappedDto {
    const estudiante = atencion.estudiante_id;

    const nombreCompleto = estudiante 
        ? `${estudiante.nombres || ''} ${estudiante.apellidos || ''}`.trim() 
        : 'Desconocido';

    return {
      // CORRECCIÓN 2: Convertir el ID (number) a string para que coincida con el DTO
      id_atencion: String(atencion.id), 
      fecha_atencion: new Date(atencion.fecha_hora_atencion).toLocaleString('es-PE'),
      tipo_atencion: atencion.tipo_atencion,
      
      sintomas_reportados: atencion.sintomas, 
      diagnostico: atencion.diagnostico,
      tratamiento: atencion.recomendaciones, 
      observaciones: atencion.observaciones,

      medicamentos: atencion.medicamentos || [],
      nombre_estudiante: nombreCompleto,
      grado_seccion: estudiante ? `${estudiante.grado} ${estudiante.seccion}` : 'N/A',
    } as HistorialMappedDto; // Casting final simplificado
  }
  
  async generarExportable(query: HistorialQueryDto, formato: 'pdf' | 'csv'): Promise<FileResponse> {
    const datosCompletos = await this.getHistorialParaExportar(query); 
    
    if (datosCompletos.length === 0) {
        throw new BadRequestException('No hay registros para exportar con los filtros seleccionados.');
    }

    if (formato === 'pdf') {
        return this.generarPDF(datosCompletos, query.q);
    }
    if (formato === 'csv') {
        return this.generarCSV(datosCompletos);
    }

    throw new BadRequestException('Formato de exportación no soportado');
  }

  private generarCSV(datos: HistorialMappedDto[]): Promise<FileResponse> {
    return new Promise((resolve, reject) => {
      const columns = {
        fecha_atencion: 'Fecha/Hora',
        nombre_estudiante: 'Estudiante',
        grado_seccion: 'Grado/Sección',
        total_atenciones_estudiante: 'Total Atenciones',
        tipo_atencion: 'Tipo de Atención',
        sintomas_reportados: 'Síntomas',
        diagnostico: 'Diagnóstico',
        tratamiento: 'Recomendaciones/Tratamiento',
        observaciones: 'Observaciones',
        medicamentos: 'Medicamentos (JSON)',
      };

      stringify(datos, { header: true, columns: columns, delimiter: ';'}, (err, output) => {
        if (err) return reject(new Error('Error al generar CSV: ' + err.message));

        resolve({
          buffer: Buffer.from(output, 'utf-8'),
          contentType: 'text/csv',
          filename: `Historial_Exportado_${Date.now()}.csv`,
        });
      });
    });
  }

  private generarPDF(datos: HistorialMappedDto[], filtroBusqueda?: string): Promise<FileResponse> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, bufferPages: true });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk as Buffer));
      doc.on('end', () => {
        resolve({
          buffer: Buffer.concat(buffers),
          contentType: 'application/pdf',
          filename: `Historial_Detallado_${Date.now()}.pdf`,
        });
      });
      
      doc.fontSize(18).fillColor('#003366').font('Helvetica-Bold').text('Reporte Detallado de Historia Clínica Escolar', { align: 'center' });
      doc.moveDown(0.5);
      
      doc.fontSize(10).fillColor('#555555').font('Helvetica').text(`Generado el: ${new Date().toLocaleString('es-PE')}`, { align: 'center' });
      doc.text(`Filtro de Búsqueda Aplicado: ${filtroBusqueda || 'Ninguno'}`, { align: 'center' });
      doc.moveDown(1);
      doc.lineWidth(1).stroke('#CCCCCC');
      doc.moveDown(1);
      
      doc.fillColor('#000000').font('Helvetica');

      datos.forEach((atencion, index) => {
          doc.fontSize(12).fillColor('#333333').font('Helvetica-Bold').text(`ATENCIÓN #${index + 1} - ${atencion.nombre_estudiante} (${atencion.grado_seccion})`, { 
              underline: true
          });
          doc.moveDown(0.5);

          doc.fontSize(10).font('Helvetica-Bold').text('Fecha y Hora:', { continued: true }).font('Helvetica').text(` ${atencion.fecha_atencion}`);
          doc.font('Helvetica-Bold').text('Tipo de Atención:', { continued: true }).font('Helvetica').text(` ${atencion.tipo_atencion}`);
          doc.font('Helvetica-Bold').text('Estudiante:', { continued: true }).font('Helvetica').text(` ${atencion.nombre_estudiante}`);
          doc.font('Helvetica-Bold').text('Grado/Sección:', { continued: true }).font('Helvetica').text(` ${atencion.grado_seccion}`);
          doc.moveDown(1);

          this.addDetailSection(doc, 'Síntomas Reportados', atencion.sintomas_reportados);
          this.addDetailSection(doc, 'Diagnóstico', atencion.diagnostico);
          this.addDetailSection(doc, 'Tratamiento/Recomendaciones', atencion.tratamiento);
          this.addDetailSection(doc, 'Observaciones', atencion.observaciones);

          if (atencion.medicamentos && atencion.medicamentos.length > 0) {
              const meds = atencion.medicamentos.map(m => `${m.nombre} (${m.dosis})`).join('; ');
              this.addDetailSection(doc, 'Medicamentos Administrados', meds);
          }
          
          doc.moveDown(1);
          doc.lineWidth(0.5).stroke('#EEEEEE');
          doc.moveDown(1.5);
      });

      doc.end();
    });
  }
  
  private addDetailSection(doc: InstanceType<typeof PDFDocument>, title: string, content: string) {
      const safeContent = content ? String(content).trim() : '';

      if (safeContent) {
          doc.fontSize(10).fillColor('#003366').font('Helvetica-Bold').text(title + ':', { 
              paragraphGap: 2
          });
          doc.fontSize(10).fillColor('#000000').font('Helvetica').text(safeContent, { 
              indent: 10,
              align: 'justify'
          });
          doc.moveDown(0.5);
      }
  }
}