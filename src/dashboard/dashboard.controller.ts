import { Controller, Get } from '@nestjs/common';
import { DashboardService, DashboardData } from './dashboard.service';

@Controller('prueba')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get() 
    async getTopicoDashboard(): Promise<DashboardData> { 
        return this.dashboardService.getDashboardData();
    }
}