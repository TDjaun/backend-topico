import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    SupabaseModule, 
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}