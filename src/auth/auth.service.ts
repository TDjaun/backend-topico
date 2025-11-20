import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
  ) {}

  private usuariosTabla = 'usuarios';
  private sesionesTabla = 'sesiones';

  async validarCredenciales(email: string, password: string) {
    const client = this.supabaseService.getClient();
    const { data: user, error } = await client
      .from(this.usuariosTabla)
      .select('*')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (error) throw new BadRequestException('Error al consultar usuario');
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    if (!user.estado) throw new UnauthorizedException('Usuario deshabilitado');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    return user;
  }

  async login(email: string, password: string, meta?: { ip?: string; userAgent?: string }) {
    const client = this.supabaseService.getClient();
    const user = await this.validarCredenciales(email, password);

    const payload = { sub: user.id, email: user.email, rol: user.rol };
    const accessToken = this.jwtService.sign(payload);
    const refreshTokenPlain = randomBytes(64).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshTokenPlain, 10);
    const refreshTtlDays = 30;
    const expiracion = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000).toISOString();

    const sessionRecord = {
      usuario_id: user.id,
      refresh_token: refreshTokenHash,
      user_agent: meta?.userAgent ?? null,
      ip: meta?.ip ?? null,
      expiracion,
    };

    const { error } = await client.from(this.sesionesTabla).insert(sessionRecord);
    if (error) throw new BadRequestException('No se pudo crear sesión');

    return {
      accessToken,
      refreshToken: refreshTokenPlain,
      user: { id: user.id, email: user.email, rol: user.rol },
    };
  }

  async refresh(refreshTokenPlain: string) {
    const client = this.supabaseService.getClient();
    const now = new Date().toISOString();
    const { data: sesiones, error } = await client
      .from(this.sesionesTabla)
      .select('*')
      .eq('revocado', false)
      .gte('expiracion', now);

    if (error) throw new BadRequestException('Error consultando sesiones');

    let matchedSession: any = null;
    for (const s of sesiones) {
      const match = await bcrypt.compare(refreshTokenPlain, s.refresh_token);
      if (match) {
        matchedSession = s;
        break;
      }
    }

    if (!matchedSession) throw new UnauthorizedException('Refresh token inválido');

    const { data: usuario } = await client
      .from(this.usuariosTabla)
      .select('*')
      .eq('id', matchedSession.usuario_id)
      .limit(1)
      .maybeSingle();

    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');

    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
    const accessToken = this.jwtService.sign(payload);

    const newRefreshPlain = randomBytes(64).toString('hex');
    const newRefreshHash = await bcrypt.hash(newRefreshPlain, 10);
    const newExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: upserr } = await client
      .from(this.sesionesTabla)
      .update({ refresh_token: newRefreshHash, expiracion: newExp })
      .eq('id', matchedSession.id);

    if (upserr) throw new BadRequestException('No se pudo rotar refresh token');

    return {
      accessToken,
      refreshToken: newRefreshPlain,
      user: { id: usuario.id, email: usuario.email, rol: usuario.rol },
    };
  }

  async logout(refreshTokenPlain: string) {
    const client = this.supabaseService.getClient();
    const { data: sesiones, error } = await client
      .from(this.sesionesTabla)
      .select('*')
      .eq('revocado', false);

    if (error) throw new BadRequestException('Error consultando sesiones');

    let matchedId: string | null = null;
    for (const s of sesiones) {
      const match = await bcrypt.compare(refreshTokenPlain, s.refresh_token);
      if (match) {
        matchedId = s.id;
        break;
      }
    }

    if (!matchedId) throw new UnauthorizedException('Refresh token inválido');

    const { error: derr } = await client
      .from(this.sesionesTabla)
      .update({ revocado: true })
      .eq('id', matchedId);

    if (derr) throw new BadRequestException('No se pudo revocar la sesión');

    return { ok: true };
  }

  async listarUsuarios() {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.from(this.usuariosTabla).select('*');
    if (error) throw new BadRequestException('Error al obtener usuarios');
    return data;
  }

  async registrarPersonal(body: { email: string; password: string }) {
    const { email, password } = body;

    if (!email || !password) {
      throw new BadRequestException('Email y password son obligatorios');
    }

    const client = this.supabaseService.getClient();

    const { data: existente } = await client
      .from(this.usuariosTabla)
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existente) throw new BadRequestException('El email ya está registrado');

    const hashedPassword = await bcrypt.hash(password, 10);
    const nuevoUsuario = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      rol: 'topico',
      estado: true,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    };

    const { error } = await client.from(this.usuariosTabla).insert(nuevoUsuario);
    if (error) {
      console.error('Error al registrar personal:', error);
      throw new BadRequestException('No se pudo registrar el usuario');
    }

    return { ok: true, message: 'Usuario registrado exitosamente' };
  }


  async eliminarUsuario(id: string) {
    const client = this.supabaseService.getClient();
    const { error } = await client.from(this.usuariosTabla).delete().eq('id', id);
    if (error) throw new BadRequestException('Error al eliminar usuario'); 
    return { ok: true };
  }

  async cambiarEstado(id: string, estado: boolean) {
  const client = this.supabaseService.getClient();
  const { error } = await client.from(this.usuariosTabla).update({ estado }).eq('id', id);
  if (error) throw new BadRequestException('Error al cambiar estado');
  return { ok: true };
  } 
}
