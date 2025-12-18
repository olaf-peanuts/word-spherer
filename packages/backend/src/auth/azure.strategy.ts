import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BearerStrategy, IBearerStrategyOptionWithRequest } from 'passport-azure-ad';

@Injectable()
export class AzureADStrategy extends PassportStrategy(BearerStrategy, 'oauth-bearer') {
  constructor() {
    const options: IBearerStrategyOptionWithRequest = {
      identityMetadata:
        `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0/.well-known/openid-configuration`,
      clientID: process.env.AZURE_AD_CLIENT_ID,
      audience: process.env.AZURE_AD_CLIENT_ID, // API の App ID URI = Client ID
      validateIssuer: true,
      loggingLevel: 'info',
      passReqToCallback: false,
    };
    super(options);
  }

  async validate(payload: any) {
    // payload contains `oid` (object id) and other claims.
    return { userId: payload.oid, displayName: payload.name, email: payload.preferred_username };
  }
}
