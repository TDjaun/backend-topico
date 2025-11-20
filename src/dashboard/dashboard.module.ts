import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

import { AtencionesModule } from '../atenciones/atenciones.module';
import { IncidenciasModule } from '../inicidencias/incidencias.module';
import { InventarioModule } from '../inventario/inventario.module';
import { EstudiantesModule } from '../estudiantes/estudiantes.module';


@Module({
  imports: [
    AtencionesModule,
    IncidenciasModule,
    InventarioModule,
    EstudiantesModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}