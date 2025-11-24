export class EstudianteDto {
  id?: string;
  dni!: string;
  nombres!: string;
  apellidos!: string;
  grado!: string;
  seccion!: string;
  fecha_nacimiento?: string | null;
  sexo?: string;
  direccion?: string;
  contacto_apoderado?: string;
  observaciones_medicas?: string;
}
