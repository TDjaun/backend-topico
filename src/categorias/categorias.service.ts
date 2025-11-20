import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCategoriaDto } from './dtoCat/create-categoria.dto';
import { UpdateCategoriaDto } from './dtoCat/update-categoria.dto';

@Injectable()
export class CategoriasService {
  private tableName = 'categorias_medicamentos';

  constructor(private readonly supabaseService: SupabaseService) {}

  async crear(dto: CreateCategoriaDto) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.from(this.tableName).insert([dto]).select();

    if (error) throw new Error(error.message);
    return data[0];
  }

  async listar() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async obtenerPorId(id: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Categoría no encontrada');
    return data;
  }

  async actualizar(id: string, dto: UpdateCategoriaDto) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .update({ ...dto, actualizado_en: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async eliminar(id: string) {
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);

    if (error) throw new Error(error.message);
    return { message: 'Categoría eliminada correctamente' };
  }
}
