import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryCustomersDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Matches name, phone, or customer number.',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
