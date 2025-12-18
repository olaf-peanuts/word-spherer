import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AzureADStrategy } from './azure.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'oauth-bearer' })],
  providers: [AzureADStrategy],
})
export class AuthModule {}
