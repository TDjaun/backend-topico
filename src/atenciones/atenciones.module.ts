import { Module } from '@nestjs/common';
import { AtencionesService } from './atenciones.service';
import { AtencionesController } from './atenciones.controller';
import { SupabaseService } from '../supabase/supabase.service';
import { InventarioModule } from 'src/inventario/inventario.module';

@Module({
  imports: [InventarioModule, ],
  controllers: [AtencionesController],
  providers: [AtencionesService, SupabaseService],
  exports: [AtencionesService],
})
export class AtencionesModule {}
