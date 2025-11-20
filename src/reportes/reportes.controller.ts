import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ReportesService } from './reportes.service';

@Controller('reportes')
export class ReportesController {
    constructor(private readonly reportesService: ReportesService) {}

    @Get('resumen-ejecutivo')
    async getResumenEjecutivoPdf(@Res() res: Response) {
        try {
            const result = await this.reportesService.generarReporteResumenEjecutivo();

            res.set({
                'Content-Type': result.contentType,
                'Content-Disposition': `attachment; filename="Resumen_Ejecutivo.pdf"`,
                'Content-Length': result.buffer.length,
            });

            res.send(result.buffer);
        } catch (error) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error al generar el Resumen Ejecutivo.', error: error.message });
        }
    }

    @Get('atenciones')
    async getReporteAtencionesPdf(@Res() res: Response) {
        try {
            const result = await this.reportesService.generarReporteAtenciones();

            res.set({
                'Content-Type': result.contentType,
                'Content-Disposition': `attachment; filename="Reporte_Atenciones.pdf"`,
                'Content-Length': result.buffer.length,
            });

            res.send(result.buffer);
        } catch (error) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error al generar el reporte de atenciones.', error: error.message });
        }
    }

    @Get('inventario')
    async getReporteInventarioPdf(@Res() res: Response) {
        try {
            const result = await this.reportesService.generarReporteInventario();

            res.set({
                'Content-Type': result.contentType,
                'Content-Disposition': `attachment; filename="Reporte_Inventario.pdf"`,
                'Content-Length': result.buffer.length,
            });

            res.send(result.buffer);
        } catch (error) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error al generar el reporte de inventario.', error: error.message });
        }
    }

    @Get('top-estudiantes')
    async getReporteEstudiantesTopicoPdf(@Res() res: Response) {
        try {
            const result = await this.reportesService.generarReporteEstudiantesTopico();

            res.set({
                'Content-Type': result.contentType,
                'Content-Disposition': `attachment; filename="Reporte_Top_Atenciones_Sintomas.pdf"`,
                'Content-Length': result.buffer.length,
            });

            res.send(result.buffer);
        } catch (error) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ 
                message: 'Error al generar el reporte Top de Estudiantes y Síntomas.', 
                error: error.message 
            });
        }
    }
}