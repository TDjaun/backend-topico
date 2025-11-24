import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EstudianteDto } from './dto/estudiante.dto';
import { v4 as uuidv4 } from 'uuid';

function convertExcelDate(excelSerial: any): string | null {
  if (excelSerial === null || excelSerial === undefined || excelSerial === '') {
    return null;
  }

  if (typeof excelSerial === 'number' && excelSerial > 1) {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const date = new Date((excelSerial - 2) * MS_PER_DAY);
    return date.toISOString().split('T')[0];
  }

  if (typeof excelSerial === 'string') {
      return excelSerial.trim() || null;
  }

  return null;
}

@Injectable()
export class EstudiantesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private tabla = 'estudiantes';

  async findByDni(dni: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from(this.tabla)
      .select('*')
      .eq('dni', dni)
      .limit(1);

    if (error) throw new BadRequestException(error.message);
    return data && data.length ? data[0] : null;
  }

  async insertEstudiante(dto: EstudianteDto) {
    const client = this.supabaseService.getClient();
    const record = {
      id: dto.id ?? uuidv4(),
      dni: dto.dni,
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      grado: dto.grado,
      seccion: dto.seccion,
      fecha_nacimiento: dto.fecha_nacimiento || null,
      sexo: dto.sexo || null,
      direccion: dto.direccion || null,
      contacto_apoderado: dto.contacto_apoderado || null,
      observaciones_medicas: dto.observaciones_medicas || null,
    };

    const { data, error } = await client
      .from(this.tabla)
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async importarDesdeArray(rows: any[]): Promise<{
    inserted: number;
    conflicts: any[];
  }> {
    let inserted = 0;
    const conflicts: any[] = [];
    const client = this.supabaseService.getClient();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const dni = (row.dni || '').toString().trim();
      if (!dni) {
        continue;
      }
      
      const recordToInsert: EstudianteDto = {
        dni,
        nombres: row.nombres || row.nombre || '',
        apellidos: row.apellidos || '',
        grado: row.grado || '',
        seccion: row.seccion || '',
        fecha_nacimiento: convertExcelDate(row.fecha_nacimiento), 
        sexo: row.sexo || null,
        direccion: row.direccion || null,
        contacto_apoderado: row.contacto_apoderado || null,
        observaciones_medicas: row.observaciones_medicas || null,
      };

      const existing = await this.findByDni(dni);
      if (existing) {
        conflicts.push({
          fila: i + 2,
          dni,
          existing,
          newRow: recordToInsert,
        });
        continue;
      }

      try {
        await this.insertEstudiante(recordToInsert);
        inserted++;
      } catch (e) {
        conflicts.push({
          fila: i + 2,
          dni,
          error: e.message,
          newRow: recordToInsert,
        });
      }
    }

    return { inserted, conflicts };
  }

  async resolverConflictos(
    action: 'sobrescribir' | 'ignorar',
    items: any[],
  ) {
    const client = this.supabaseService.getClient();
    const result = {
      updated: 0,
      ignored: 0,
    };

    if (action === 'ignorar') {
      result.ignored = items.length;
      return result;
    }

    if (action === 'sobrescribir') {
      for (const row of items) {
        const dni = row.dni;
        const existingId = row.existing?.id;

        if (!dni || !existingId) continue;
        
        const newRow = row.newRow;

        const record = {
          id: existingId,
          dni,
          nombres: newRow.nombres || row.existing.nombres || '',
          apellidos: newRow.apellidos || row.existing.apellidos || '',
          grado: newRow.grado || row.existing.grado || '',
          seccion: newRow.seccion || row.existing.seccion || '',
          fecha_nacimiento: newRow.fecha_nacimiento || row.existing.fecha_nacimiento || null,
          sexo: newRow.sexo || row.existing.sexo || null,
          direccion: newRow.direccion || row.existing.direccion || null,
          contacto_apoderado: newRow.contacto_apoderado || row.existing.contacto_apoderado || null,
          observaciones_medicas: newRow.observaciones_medicas || row.existing.observaciones_medicas || null,
        };
        
        const { error } = await client
          .from(this.tabla)
          .upsert(record, { onConflict: 'dni' })
          .select();

        if (!error) {
          result.updated++;
        }
      }
    }

    return result;
  }
  
  async buscarEstudiante(query: string) {
    const client = this.supabaseService.getClient();

    const { data: dniData, error: dniError } = await client
      .from(this.tabla)
      .select('*')
      .eq('dni', query)
      .maybeSingle();

    if (dniError) throw new BadRequestException(dniError.message);
    if (dniData) return dniData;

    const { data: nombreData, error: nombreError } = await client
      .from(this.tabla)
      .select('*')
      .or(`nombres.ilike.%${query}%,apellidos.ilike.%${query}%`)
      .limit(1)
      .maybeSingle();

    if (nombreError) throw new BadRequestException(nombreError.message);
    return nombreData || null;
  }
}