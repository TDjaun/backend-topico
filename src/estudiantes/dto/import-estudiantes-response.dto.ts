export class ImportEstudiantesResponseDto {
  inserted: number;
  skipped: number;
  conflicts: Array<{
    fila: number;
    dni: string;
    existing: any;
    newRow: any;
  }>;
}
