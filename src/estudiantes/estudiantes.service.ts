import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EstudianteDto } from './dto/estudiante.dto';
import { v4 as uuidv4 } from 'uuid';

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
    skipped: number;
    conflicts: any[];
  }> {
    let inserted = 0;
    let skipped = 0;
    const conflicts: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const dni = (row.dni || '').toString().trim();
      if (!dni) {
        skipped++;
        continue;
      }

      const existing = await this.findByDni(dni);
      if (existing) {
        conflicts.push({
          fila: i + 2,
          dni,
          existing,
          newRow: row,
        });
        skipped++;
        continue;
      }

      await this.insertEstudiante({
        dni,
        nombres: row.nombres || row.nombre || '',
        apellidos: row.apellidos || '',
        grado: row.grado || '',
        seccion: row.seccion || '',
        fecha_nacimiento: row.fecha_nacimiento || null,
        sexo: row.sexo || null,
        direccion: row.direccion || null,
        contacto_apoderado: row.contacto_apoderado || null,
        observaciones_medicas: row.observaciones_medicas || null,
      });
      inserted++;
    }

    return { inserted, skipped, conflicts };
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
        if (!dni) continue;

        const existing = await this.findByDni(dni);

        const record = {
          id: existing?.id ?? uuidv4(),
          dni,
          nombres: row.nombres || row.nombre || '',
          apellidos: row.apellidos || '',
          grado: row.grado || '',
          seccion: row.seccion || '',
          fecha_nacimiento: row.fecha_nacimiento || null,
          sexo: row.sexo || null,
          direccion: row.direccion || null,
          contacto_apoderado: row.contacto_apoderado || null,
          observaciones_medicas: row.observaciones_medicas || null,
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
