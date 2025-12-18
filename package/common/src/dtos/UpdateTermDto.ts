import { PartialType } from '@nestjs/mapped-types';
import { CreateTermDto } from './CreateTermDto';

export class UpdateTermDto extends PartialType(CreateTermDto) {}
