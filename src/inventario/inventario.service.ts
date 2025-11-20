import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateInventarioDto } from './dtoInv/create-inventario.dto';
import { UpdateInventarioDto } from './dtoInv/update-inventario.dto';

@Injectable()
export class InventarioService {
    private tableName = 'inventario_medicamentos';

    constructor(private readonly supabase: SupabaseService) {}

    async crear(dto: CreateInventarioDto) {
        const { data, error } = await this.supabase
            .getClient()
            .from(this.tableName)
            .insert([dto])
            .select();

        if (error) throw new Error(error.message);
        return data[0];
    }

    async listar() {
        const { data, error } = await this.supabase
            .getClient()
            .from(this.tableName)
            .select('*, categorias_medicamentos(nombre)')
            .order('creado_en', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    }

    async obtenerPorId(id: string) {
        const { data, error } = await this.supabase
            .getClient()
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw new NotFoundException('Registro de inventario no encontrado');
        return data;
    }

    async actualizar(id: string, dto: UpdateInventarioDto) {
        const { data, error } = await this.supabase
            .getClient()
            .from(this.tableName)
            .update({ ...dto, actualizado_en: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async eliminar(id: string) {
        const { error } = await this.supabase
            .getClient()
            .from(this.tableName)
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
        return { message: 'Registro de inventario eliminado correctamente' };
    }
    
    async buscarPorNombre(query: string) {
        const { data, error } = await this.supabase
            .getClient()
            .from(this.tableName)
            .select('id, nombre_producto, cantidad_total') 
            .ilike('nombre_producto', `%${query}%`)
            .gt('cantidad_total', 0)
            .limit(10); 

        if (error) {
            console.error("Error buscando medicamentos:", error.message);
            throw new Error("Error en la búsqueda de inventario");
        }
        return data;
    }

    async obtenerMedicamentosDisponibles() {
        const { data, error } = await this.supabase
            .getClient()
            .from(this.tableName)
            .select('id, nombre_producto, cantidad_total')
            .gt('cantidad_total', 0)
            .order('nombre_producto', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    }

    async reducirStock(id: string, cantidadReducida: number) {
        const client = this.supabase.getClient();
        const { data: medicamento, error: getError } = await client
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (getError || !medicamento) {
            throw new Error(getError?.message || 'Medicamento no encontrado');
        }

        const nuevoStock = (medicamento.cantidad_total || 0) - cantidadReducida;
        if (nuevoStock < 0) {
            throw new Error('No hay suficiente stock disponible');
        }

        const { data: updated, error: updateError } = await client
            .from(this.tableName)
            .update({ cantidad_total: nuevoStock, actualizado_en: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw new Error(updateError.message);
        return updated;
    }

    async sumTotalStock(): Promise<number> {
        const { data, error } = await this.supabase
            .getClient()
            .from(this.tableName)
            .select('cantidad_total');

        if (error) {
            console.error(error.message);
            return 0;
        }

        const total = data.reduce((sum, item) => sum + (item.cantidad_total || 0), 0);
        return total;
    }
    
    async countStockAlerts(umbral: number): Promise<number> {
        const { data, error } = await this.supabase
            .getClient()
            .from(this.tableName)
            .select('id', { count: 'exact' })
            .lte('cantidad_total', umbral);

        if (error) {
            console.error(error.message);
            return 0;
        }

        return data ? data.length : 0;
    }
}