import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { EstudiantesModule } from './estudiantes/estudiantes.module';
import { AuthModule } from './auth/auth.module';
import { CategoriasModule } from './categorias/categorias.module';
import { InventarioModule } from './inventario/inventario.module';
import { AtencionesModule } from './atenciones/atenciones.module';
import { HistorialModule } from './historial/historial.module';
import { IncidenciasModule } from './inicidencias/incidencias.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportesModule } from './reportes/reportes.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    EstudiantesModule,
    AuthModule,
    CategoriasModule,
    InventarioModule,
    AtencionesModule,
    HistorialModule,
    IncidenciasModule,
    DashboardModule,
    ReportesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
