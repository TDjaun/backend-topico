import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ResumenEjecutivoDto } from './dtoRep/resumen-ejecutivo.dto';
import { FileResponse } from './interfaces/file-response.interface';
import PDFDocument from 'pdfkit'; 

interface IReporteAtencion {
    fecha_hora_atencion: string;
    tipo_atencion: string;
    diagnostico: string;
    medicamentos: any[];
    estudiante: {
        nombres: string;
        apellidos: string;
        grado: string;
        seccion: string;
    }; 
}

interface IReporteInventario {
    nombre_producto: string;
    concentracion: string;
    presentacion: string;
    laboratorio: string;
    lote: string;
    fecha_vencimiento: string;
    fecha_ingreso: string;
    cantidad_total: number;
    unidad_medida: string;
    condiciones_almacenamiento: string;
    proveedor: string;
    factura_recibo: string;
    costo_unitario: number;
    costo_total: number;
    moneda: string;
    observaciones: string;
    creado_en: string;
    categoria: {
        nombre: string;
    };
}

interface IReporteTop {
    estudiantes: { nombres: string, apellidos: string, total_atenciones: string }[];
    sintomas: { sintoma: string, total_registros: string }[];
    grados: { grado: string, total_atenciones: string }[];
}

@Injectable()
export class ReportesService {
    constructor(private supabaseService: SupabaseService) {} 

    private mapAtencionForReport(atencion: any): IReporteAtencion {
        const estudianteData = atencion.estudiante_id || {};

        return {
            fecha_hora_atencion: atencion.fecha_hora_atencion,
            tipo_atencion: atencion.tipo_atencion,
            diagnostico: atencion.diagnostico,
            medicamentos: atencion.medicamentos,
            estudiante: {
                nombres: estudianteData.nombres || '',
                apellidos: estudianteData.apellidos || '',
                grado: estudianteData.grado || 'N/A',
                seccion: estudianteData.seccion || 'N/A',
            },
        };
    }

    private mapInventarioForReport(item: any): IReporteInventario {
        const categoriaData = item.categoria_id || {};

        return {
            nombre_producto: item.nombre_producto,
            concentracion: item.concentracion,
            presentacion: item.presentacion,
            laboratorio: item.laboratorio,
            lote: item.lote,
            fecha_vencimiento: item.fecha_vencimiento,
            fecha_ingreso: item.fecha_ingreso,
            cantidad_total: item.cantidad_total,
            unidad_medida: item.unidad_medida,
            condiciones_almacenamiento: item.condiciones_almacenamiento,
            proveedor: item.proveedor,
            factura_recibo: item.factura_recibo,
            costo_unitario: item.costo_unitario,
            costo_total: item.costo_total,
            moneda: item.moneda,
            observaciones: item.observaciones,
            creado_en: item.creado_en,
            categoria: {
                nombre: categoriaData.nombre || 'N/A',
            },
        };
    }

    private async getEstudiantesMasAtendidos(limit: number = 10): Promise<{ nombres: string, apellidos: string, total_atenciones: string }[]> {
        const client = this.supabaseService.getClient();
        
        const { data, error } = await client
            .from('atenciones_medicas')
            .select('estudiante_id(nombres, apellidos, id)');

        if (error) {
            throw new InternalServerErrorException('Error al obtener datos de estudiantes para el top: ' + error.message);
        }
        
        const counts = (data || []).reduce((acc, current) => {
            const student = current.estudiante_id as unknown as { nombres: string, apellidos: string, id: string }; 
            if (student && student.id) {
                const key = student.id;
                acc[key] = acc[key] || { ...student, count: 0 };
                acc[key].count++;
            }
            return acc;
        }, {} as Record<string, { nombres: string, apellidos: string, id: string, count: number }>);

        return Object.values(counts)
            .sort((a, b) => b.count - a.count)
            .slice(0, limit)
            .map(s => ({
                nombres: s.nombres,
                apellidos: s.apellidos,
                total_atenciones: s.count.toString(),
            }));
    }

    private async getSintomasMasRegistrados(limit: number = 10): Promise<{ sintoma: string, total_registros: string }[]> {
        const client = this.supabaseService.getClient();
        
        const { data, error } = await client
            .from('atenciones_medicas')
            .select('sintomas');

        if (error) {
            throw new InternalServerErrorException('Error al obtener datos de síntomas para el top: ' + error.message);
        }
        
        const allSymptoms = (data || [])
            .flatMap(item => 
                (item.sintomas || '') 
                    .split(',') 
                    .map(s => {
                        const trimmed = s.trim();
                        if (!trimmed) return null;
                        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
                    })
            )
            .filter(s => s) as string[];

        const counts = allSymptoms.reduce((acc, sintoma) => {
            acc[sintoma] = (acc[sintoma] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .map(([sintoma, count]) => ({ sintoma, total_registros: count.toString() }))
            .sort((a, b) => parseInt(b.total_registros) - parseInt(a.total_registros))
            .slice(0, limit);
    }

    private async getGradosMasAtendidos(limit: number = 10): Promise<{ grado: string, total_atenciones: string }[]> {
        const client = this.supabaseService.getClient();
        
        const { data, error } = await client
            .from('atenciones_medicas')
            .select('estudiante_id(grado)');

        if (error) {
            throw new InternalServerErrorException('Error al obtener datos de grados para el top: ' + error.message);
        }
        
        const counts = (data || []).reduce((acc, current) => {
            const student = current.estudiante_id as unknown as { grado: string };
            const grado = student?.grado;
            if (grado && String(grado).trim() !== '') {
                acc[grado] = (acc[grado] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .map(([grado, count]) => ({ grado, total_atenciones: count.toString() }))
            .sort((a, b) => parseInt(b.total_atenciones) - parseInt(a.total_atenciones))
            .slice(0, limit);
    }


    async getResumenEjecutivo(): Promise<ResumenEjecutivoDto> {
        const client = this.supabaseService.getClient();
        
        try {
            const { count: totalAtenciones, error: err1 } = await client
                .from('atenciones_medicas')
                .select('*', { count: 'exact', head: true });
            
            if (err1) throw new Error('Error al contar atenciones: ' + err1.message);
            
            const totalAtencionesCount = totalAtenciones || 0;
            
            const { totalMedicamentosInventario, medicamentosEnStockBajo } = await this.getInventarioResumen();
            
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const { count: atencionesUltimos30Dias, error: err2 } = await client
                .from('atenciones_medicas')
                .select('*', { count: 'exact', head: true })
                .gte('fecha_hora_atencion', thirtyDaysAgo.toISOString());
                
            if (err2) throw new Error('Error al contar atenciones en 30 días: ' + err2.message);
            
            const atenciones30DiasCount = atencionesUltimos30Dias || 0;
            
            const totalUsuariosSistema = 45; 
            const personalTopicoRegistrado = 12; 
            const metaAtenciones = 200; 
            
            const porcentajeAtenciones = (atenciones30DiasCount / metaAtenciones) * 100;
            const porcentajeStockBajo = (medicamentosEnStockBajo / (totalMedicamentosInventario || 1)) * 100 || 0;
            const porcentajePersonalTopico = (personalTopicoRegistrado / totalUsuariosSistema) * 100;

            return {
                totalUsuariosSistema,
                totalAtenciones: totalAtencionesCount,
                totalMedicamentosActivos: totalMedicamentosInventario,
                atencionesUltimos30Dias: atenciones30DiasCount,
                metaAtenciones,
                porcentajeAtenciones: parseFloat(porcentajeAtenciones.toFixed(2)),
                medicamentosEnStockBajo,
                totalMedicamentosInventario, 
                porcentajeStockBajo: parseFloat(porcentajeStockBajo.toFixed(2)),
                personalTopicoRegistrado,
                porcentajePersonalTopico: parseFloat(porcentajePersonalTopico.toFixed(2)),
            };
        } catch (error) {
            console.error('Error al obtener resumen ejecutivo:', error);
            throw new InternalServerErrorException('No se pudo generar el resumen ejecutivo: ' + error.message);
        }
    }

    private async getInventarioResumen(): Promise<{ totalMedicamentosInventario: number, medicamentosEnStockBajo: number }> {
        const client = this.supabaseService.getClient();
        const bajoStockUmbral = 10; 

        try {
            const { count: totalMedicamentosInventario, error: err1 } = await client
                .from('inventario_medicamentos')
                .select('*', { count: 'exact', head: true });
            
            if (err1) throw new Error('Error al contar inventario: ' + err1.message);

            const { count: medicamentosEnStockBajo, error: err2 } = await client
                .from('inventario_medicamentos') 
                .select('*', { count: 'exact', head: true })
                .lt('cantidad_total', bajoStockUmbral);

            if (err2) throw new Error('Error al contar bajo stock: ' + err2.message);

            return { 
                totalMedicamentosInventario: totalMedicamentosInventario || 0, 
                medicamentosEnStockBajo: medicamentosEnStockBajo || 0 
            };
        } catch (error) {
            console.error('Error al obtener resumen de inventario:', error);
            throw new InternalServerErrorException('No se pudo obtener el resumen de inventario: ' + error.message);
        }
    }

    async generarReporteEstudiantesTopico(): Promise<FileResponse> {
        try {
            const [estudiantes, sintomas, grados] = await Promise.all([
                this.getEstudiantesMasAtendidos(10),
                this.getSintomasMasRegistrados(10),
                this.getGradosMasAtendidos(10),
            ]);

            const datos: IReporteTop = {
                estudiantes: estudiantes,
                sintomas: sintomas,
                grados: grados,
            };

            return this.generarPdfEstudiantesTopico(datos);
        } catch (error) {
            console.error('Error al generar reporte de estudiantes y síntomas:', error);
            throw new InternalServerErrorException('No se pudo generar el reporte de estudiantes y síntomas.');
        }
    }

    private generarPdfEstudiantesTopico(data: IReporteTop): Promise<FileResponse> {
        return new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 50, bufferPages: true, layout: 'portrait' }); 
            const buffer: Buffer[] = [];
            
            doc.on('data', buffer.push.bind(buffer));
            doc.on('end', () => {
                resolve({
                    buffer: Buffer.concat(buffer),
                    contentType: 'application/pdf',
                });
            });

            doc.fontSize(18).fillColor('#003366').font('Helvetica-Bold').text('REPORTE TOP DE ATENCIONES Y SÍNTOMAS', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#555555').font('Helvetica').text(`Generado el: ${new Date().toLocaleString('es-PE')}`, { align: 'center' });
            doc.moveDown(1);
            
            doc.lineWidth(1).stroke('#CCCCCC');
            doc.moveDown(1);

            doc.fontSize(14).fillColor('#006699').font('Helvetica-Bold').text('TOP 10 ESTUDIANTES CON MÁS ATENCIONES', { underline: true });
            doc.moveDown(0.5);

            if (data.estudiantes.length === 0) {
                doc.fontSize(10).font('Helvetica-Oblique').text('No hay datos de estudiantes con atenciones registradas.');
            } else {
                data.estudiantes.forEach((estudiante, index) => {
                    const nombre = `${estudiante.nombres} ${estudiante.apellidos}`;
                    doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold').text(`${index + 1}. ${nombre}:`, { continued: true })
                        .font('Helvetica').text(` ${estudiante.total_atenciones} Atenciones`);
                });
            }
            doc.moveDown(1.5);

            doc.fontSize(14).fillColor('#339966').font('Helvetica-Bold').text('TOP 10 SÍNTOMAS MÁS FRECUENTES', { underline: true });
            doc.moveDown(0.5);

            if (data.sintomas.length === 0) {
                doc.fontSize(10).font('Helvetica-Oblique').text('No hay datos de síntomas registrados.');
            } else {
                data.sintomas.forEach((sintoma, index) => {
                    doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold').text(`${index + 1}. ${sintoma.sintoma}:`, { continued: true })
                        .font('Helvetica').text(` ${sintoma.total_registros} Registros`);
                });
            }
            doc.moveDown(1.5);
            
            doc.fontSize(14).fillColor('#CC3300').font('Helvetica-Bold').text('TOP 10 GRADOS CON MÁS ATENCIONES', { underline: true });
            doc.moveDown(0.5);

            if (data.grados.length === 0) {
                doc.fontSize(10).font('Helvetica-Oblique').text('No hay datos de grados con atenciones registradas.');
            } else {
                data.grados.forEach((grado, index) => {
                    doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold').text(`${index + 1}. Grado ${grado.grado}:`, { continued: true })
                        .font('Helvetica').text(` ${grado.total_atenciones} Atenciones`);
                });
            }
            doc.moveDown(2);
            
            doc.fontSize(8).fillColor('#777777').font('Helvetica-Oblique').text(
                'Este reporte muestra las principales tendencias de atenciones en el tópico escolar.', 
                50, doc.page.height - 50, { align: 'left' }
            );

            doc.end();
        });
    }

    async generarReporteResumenEjecutivo(): Promise<FileResponse> {
        const resumen = await this.getResumenEjecutivo();
        return this.generarPdfResumenEjecutivo(resumen);
    }
    
    private generarPdfResumenEjecutivo(data: ResumenEjecutivoDto): Promise<FileResponse> {
        return new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 50, bufferPages: true, layout: 'portrait' }); 
            const buffer: Buffer[] = [];
            
            doc.on('data', buffer.push.bind(buffer));
            doc.on('end', () => {
                resolve({
                    buffer: Buffer.concat(buffer),
                    contentType: 'application/pdf',
                });
            });

            doc.fontSize(20).fillColor('#003366').font('Helvetica-Bold').text('RESUMEN EJECUTIVO TÓPICO ESCOLAR', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#555555').font('Helvetica').text(`Generado el: ${new Date().toLocaleString('es-PE')}`, { align: 'center' });
            doc.moveDown(1.5);

            const drawCard = (x: number, y: number, title: string, value: string, subtext: string, color: string) => {
                const width = 230;
                const height = 80;

                doc.rect(x, y, width, height).fill(color);
                doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text(title, x + 10, y + 10, { width: width - 20, align: 'left' });
                doc.fillColor('#FFFFFF').fontSize(24).font('Helvetica-Bold').text(value, x + 10, y + 30, { width: width - 20, align: 'right' });
                doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica').text(subtext, x + 10, y + 65, { width: width - 20, align: 'right' });
            };

            let y = doc.y;
            
            drawCard(50, y, 
                'ATENCIONES TOTALES HISTÓRICAS', 
                data.totalAtenciones.toLocaleString(), 
                'Datos acumulados del sistema', 
                '#003366'
            );

            drawCard(320, y, 
                'USUARIOS TOTALES REGISTRADOS', 
                data.totalUsuariosSistema.toLocaleString(), 
                `Personal Tópico: ${data.personalTopicoRegistrado} (${data.porcentajePersonalTopico}%)`, 
                '#006699'
            );
            
            doc.moveDown(5); 
            y = doc.y;

            doc.fontSize(14).fillColor('#333333').font('Helvetica-Bold').text('DESEMPEÑO RECIENTE (Últimos 30 Días)', 50, y);
            doc.moveDown(0.5);
            
            drawCard(50, y + 20, 
                'ATENCIONES EN 30 DÍAS', 
                data.atencionesUltimos30Dias.toLocaleString(), 
                `Meta de ${data.metaAtenciones} (${data.porcentajeAtenciones}%)`, 
                '#3399CC'
            );

            doc.fontSize(14).fillColor('#333333').font('Helvetica-Bold').text('ESTADO ACTUAL DEL INVENTARIO', 320, y);
            doc.moveDown(0.5);

            drawCard(320, y + 20, 
                'TOTAL DE PRODUCTOS ACTIVOS', 
                data.totalMedicamentosInventario.toLocaleString(), 
                `Productos en stock bajo: ${data.medicamentosEnStockBajo} (${data.porcentajeStockBajo}%)`, 
                (data.porcentajeStockBajo > 20) ? '#CC3300' : '#339966' 
            );
            
            doc.moveDown(5); 
            doc.moveDown(2);
            doc.fontSize(8).fillColor('#777777').font('Helvetica-Oblique').text(
                'Este resumen ejecutivo proporciona una visión de alto nivel. Para detalles específicos, consulte los reportes detallados de Atenciones e Inventario.', 
                50, doc.page.height - 50, { align: 'left' }
            );

            doc.end();
        });
    }

    async generarReporteAtenciones(): Promise<FileResponse> {
        const client = this.supabaseService.getClient();

        const { data, error } = await client
            .from('atenciones_medicas')
            .select(`
                fecha_hora_atencion, 
                tipo_atencion, 
                diagnostico, 
                medicamentos,
                estudiante_id (nombres, apellidos, grado, seccion) 
            `)
            .order('fecha_hora_atencion', { ascending: false });

        if (error) {
            throw new InternalServerErrorException('Error al obtener datos de atenciones: ' + error.message);
        }
        
        const datos: IReporteAtencion[] = (data || []).map(this.mapAtencionForReport);

        return this.generarPdfAtenciones(datos);
    }

    private generarPdfAtenciones(data: IReporteAtencion[]): Promise<FileResponse> {
        return new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 50, bufferPages: true }); 
            const buffer: Buffer[] = [];
            
            doc.on('data', buffer.push.bind(buffer));
            doc.on('end', () => {
                resolve({
                    buffer: Buffer.concat(buffer),
                    contentType: 'application/pdf',
                });
            });
            
            doc.fontSize(16).fillColor('#003366').font('Helvetica-Bold').text('REPORTE DETALLADO DE ATENCIONES MÉDICAS', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#555555').font('Helvetica').text(`Generado el: ${new Date().toLocaleString('es-PE')}`, { align: 'center' });
            doc.text(`Total de Atenciones: ${data.length}`, { align: 'center' });
            doc.moveDown(1);
            doc.lineWidth(1).stroke('#CCCCCC');
            doc.moveDown(1);
            
            doc.fillColor('#000000').font('Helvetica');

            if (data.length === 0) {
                doc.fontSize(12).text('*** NO HAY REGISTROS DE ATENCIONES PARA MOSTRAR ***', { align: 'center' });
            } else {
                data.forEach((atencion, index) => {
                    const estudiante = atencion.estudiante || {};
                    const nombreCompleto = `${estudiante.nombres || ''} ${estudiante.apellidos || ''}`.trim() || 'Estudiante Desconocido';
                    const gradoSeccion = estudiante.grado ? `${estudiante.grado} ${estudiante.seccion}` : 'N/A';
                    const fechaFormateada = new Date(atencion.fecha_hora_atencion).toLocaleString('es-PE');
                    
                    doc.fontSize(12).fillColor('#333333').font('Helvetica-Bold').text(`ATENCIÓN #${index + 1}: ${nombreCompleto} (${gradoSeccion})`, { 
                        underline: true
                    });
                    doc.moveDown(0.5);

                    doc.fontSize(10).font('Helvetica-Bold').text('Fecha/Hora:', { continued: true }).font('Helvetica').text(` ${fechaFormateada}`);
                    doc.font('Helvetica-Bold').text('Tipo de Atención:', { continued: true }).font('Helvetica').text(` ${atencion.tipo_atencion}`);
                    
                    this.addDetailSection(doc, 'Diagnóstico Principal', atencion.diagnostico);
                    
                    if (atencion.medicamentos && atencion.medicamentos.length > 0) {
                        const meds = atencion.medicamentos.map((m: any) => `${m.nombre || 'Medicamento'} (${m.dosis || 'N/D'})`).join('; ');
                        this.addDetailSection(doc, 'Medicamentos Administrados', meds);
                    }
                    
                    doc.moveDown(1);
                    doc.lineWidth(0.5).stroke('#EEEEEE');
                    doc.moveDown(1.5);

                    if (index < data.length - 1 && doc.y > 700) { 
                        doc.addPage();
                    }
                });
            }
            
            doc.end();
        });
    }

    async generarReporteInventario(): Promise<FileResponse> {
        const client = this.supabaseService.getClient();
        
        const { data, error } = await client
            .from('inventario_medicamentos')
            .select(`
                nombre_producto, 
                concentracion, 
                presentacion, 
                laboratorio, 
                lote, 
                fecha_vencimiento, 
                fecha_ingreso,
                cantidad_total, 
                unidad_medida,
                condiciones_almacenamiento,
                proveedor,
                factura_recibo,
                costo_unitario,
                costo_total,
                moneda,
                observaciones,
                creado_en,
                categoria_id (nombre)
            `)
            .order('fecha_ingreso', { ascending: false });

        if (error) {
            console.error('Error de Supabase al obtener datos de inventario:', error.message);
            throw new InternalServerErrorException('Error al obtener datos de inventario: ' + error.message);
        }
        
        const datos: IReporteInventario[] = (data || []).map(this.mapInventarioForReport);
        return this.generarPdfInventario(datos);
    }

    private generarPdfInventario(data: IReporteInventario[]): Promise<FileResponse> {
        return new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 50, bufferPages: true, layout: 'portrait' }); 
            const buffer: Buffer[] = [];
            
            doc.on('data', buffer.push.bind(buffer));
            doc.on('end', () => {
                resolve({
                    buffer: Buffer.concat(buffer),
                    contentType: 'application/pdf',
                });
            });
            
            doc.fontSize(16).fillColor('#003366').font('Helvetica-Bold').text('REPORTE DETALLADO DE INVENTARIO DE MEDICAMENTOS', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#555555').font('Helvetica').text(`Generado el: ${new Date().toLocaleString('es-PE')}`, { align: 'center' });
            doc.text(`Total de Productos Registrados: ${data.length}`, { align: 'center' });
            doc.moveDown(1);
            doc.lineWidth(1).stroke('#CCCCCC');
            doc.moveDown(1);
            
            if (data.length === 0) {
                doc.fontSize(12).text('NO HAY REGISTROS DE INVENTARIO PARA MOSTRAR', { align: 'center' });
            } else {
                data.forEach((item, index) => {
                    this.drawInventoryDetail(doc, item, index);
                    
                    if (index < data.length - 1 && doc.y > 700) { 
                        doc.addPage();
                    }
                });
            }
            
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

    private drawInventoryDetail(doc: InstanceType<typeof PDFDocument>, item: IReporteInventario, index: number) {
        const categoriaNombre = (item.categoria && item.categoria.nombre) ? item.categoria.nombre : 'Sin Categoría';
        const fechaVencimiento = item.fecha_vencimiento ? new Date(item.fecha_vencimiento).toLocaleDateString('es-PE') : 'N/A';
        const fechaIngreso = item.fecha_ingreso ? new Date(item.fecha_ingreso).toLocaleDateString('es-PE') : 'N/A';
        const stockTotal = `${item.cantidad_total || 0} ${item.unidad_medida || 'N/A'}`;
        const costoUnitario = `${item.moneda || 'S/.'} ${parseFloat(String(item.costo_unitario)).toFixed(2) || '0.00'}`;
        const costoTotal = `${item.moneda || 'S/.'} ${parseFloat(String(item.costo_total)).toFixed(2) || '0.00'}`;
        
        doc.fontSize(12).fillColor('#333333').font('Helvetica-Bold').text(`PRODUCTO #${index + 1}: ${item.nombre_producto || 'N/A'}`, { 
            underline: true
        });
        doc.moveDown(0.5);

        doc.fontSize(10).font('Helvetica-Bold').text('Categoría:', { continued: true }).font('Helvetica').text(` ${categoriaNombre}`);
        doc.font('Helvetica-Bold').text('Concentración/Presentación:', { continued: true }).font('Helvetica').text(` ${item.concentracion || 'N/A'} / ${item.presentacion || 'N/A'}`);
        doc.font('Helvetica-Bold').text('Laboratorio:', { continued: true }).font('Helvetica').text(` ${item.laboratorio || 'N/A'}`);
        doc.font('Helvetica-Bold').text('Proveedor:', { continued: true }).font('Helvetica').text(` ${item.proveedor || 'N/A'}`);
        
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').text('Stock Total:', { continued: true }).font('Helvetica').text(` ${stockTotal}`);
        doc.font('Helvetica-Bold').text('Condiciones de Almacenamiento:', { continued: true }).font('Helvetica').text(` ${item.condiciones_almacenamiento || 'N/A'}`);

        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').text('Lote:', { continued: true }).font('Helvetica').text(` ${item.lote || 'N/A'}`);
        doc.font('Helvetica-Bold').text('Fecha Vencimiento:', { continued: true }).font('Helvetica').text(` ${fechaVencimiento}`);
        doc.font('Helvetica-Bold').text('Fecha Ingreso:', { continued: true }).font('Helvetica').text(` ${fechaIngreso}`);
        doc.font('Helvetica-Bold').text('Factura/Recibo:', { continued: true }).font('Helvetica').text(` ${item.factura_recibo || 'N/A'}`);
        
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').text('Costo Unitario:', { continued: true }).font('Helvetica').text(` ${costoUnitario}`, { continued: true })
            .font('Helvetica-Bold').text(' | Costo Total:', { continued: true }).font('Helvetica').text(` ${costoTotal}`);

        doc.font('Helvetica-Bold').text('Creado En:', { continued: true }).font('Helvetica').text(` ${new Date(item.creado_en).toLocaleDateString('es-PE')}`);

        this.addDetailSection(doc, 'Observaciones', item.observaciones);
        
        doc.moveDown(1);
        doc.lineWidth(0.5).stroke('#EEEEEE');
        doc.moveDown(1.5);
    }
}