import { IsString } from 'class-validator';

export class BuscarEstudianteDto {
  @IsString()
  query: string; 
}
