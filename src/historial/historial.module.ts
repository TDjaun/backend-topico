import { Module } from '@nestjs/common';
import { HistorialController } from './historial.controller';
import { HistorialService } from './historial.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    SupabaseModule,
  ],
  controllers: [HistorialController],
  providers: [HistorialService],
})
export class HistorialModule {}