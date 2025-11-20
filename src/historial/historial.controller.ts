import { Controller, Get, Query, UsePipes, ValidationPipe, Res, BadRequestException } from '@nestjs/common';
import { HistorialService } from './historial.service';
import { HistorialQueryDto } from './dtoHis/historial-query.dto';
import { HistorialMappedDto } from './dtoHis/historial-mapped.dto'; 
import type { Response } from 'express';

@Controller('historial') 
export class HistorialController { 
    constructor(private historialService: HistorialService) {}
    @Get() 
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true })) 
    async getHistorial(@Query() query: HistorialQueryDto): Promise<HistorialMappedDto[]> {
        return await this.historialService.getHistorialCompleto(query);
    }
    
    @Get('exportar')
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async exportarHistorial(
        @Query() query: HistorialQueryDto & { formato: 'pdf' | 'csv' },
        @Res() res: Response,
    ) {

        if (!query.formato || !['pdf', 'csv'].includes(query.formato)) {
            throw new BadRequestException('El formato de exportación es inválido. Use "pdf" o "csv".');
        }

        const { buffer, contentType, filename } = await this.historialService.generarExportable(query, query.formato);
        
        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
}