import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FreezePipe } from './pipes/freeze.pipe';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Post()
  @UseGuards(FreezePipe)
  examplePost(@Body(new FreezePipe()) body: any) {
    body.test = 32;
  }
  @Get('error')
  throwError() {
    throw new InternalServerErrorException();
  }
}
