export interface EstudianteIncidencia {
  nombres: string;
  apellidos: string;
  dni: string;
  grado: string;
  seccion: string;
}

export class IncidenciaResponseDto {
  id: string;
  fecha_hora_ocurrencia: string;
  tipo_incidencia: string;
  ubicacion_incidente: string;
  reportado_por: string;
  nivel_severidad: string;
  descripcion_detallada: string;
  primeros_auxilios_aplicados: string;
  notificacion_padres: string;
  traslado_centro_medico: string;
  fecha_registro: string;
  estudiante: EstudianteIncidencia;
}