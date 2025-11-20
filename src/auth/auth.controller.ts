import { Controller, Post, Body, Req, Get, UseGuards, Put, Delete, Patch, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }, @Req() req: Request) {
    const meta = { ip: req.ip, userAgent: req.headers['user-agent'] as string };
    return this.authService.login(body.email, body.password, meta);
  }

  @Post('registrar-personal')
  async registrarPersonal(@Body() body: { email: string; password: string }) {
    return this.authService.registrarPersonal(body);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  async logout(@Body() body: { refreshToken: string }) {
    return this.authService.logout(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) {
    return { ok: true, msg: 'Ruta protegida', user: req.user };
  }

  @Get('usuarios')
  async listarUsuarios() {
    return this.authService.listarUsuarios();
  }

  @Delete('usuarios/:id')
  eliminarUsuario(@Param('id') id: string) {  
    return this.authService.eliminarUsuario(id);
  }

  @Patch('usuarios/:id/estado')
  cambiarEstado(@Param('id') id: string, @Body() body: { estado: boolean }) 
  {
    return this.authService.cambiarEstado(id, body.estado);
  }
}