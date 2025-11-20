export interface ResumenEjecutivoDto {
  totalUsuariosSistema: number;
  totalAtenciones: number;
  totalMedicamentosActivos: number;
  atencionesUltimos30Dias: number;
  metaAtenciones: number;
  porcentajeAtenciones: number;
  medicamentosEnStockBajo: number;
  totalMedicamentosInventario: number;
  porcentajeStockBajo: number;
  personalTopicoRegistrado: number;
  porcentajePersonalTopico: number;
}