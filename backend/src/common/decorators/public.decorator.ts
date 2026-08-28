import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opts an endpoint out of the global JwtAuthGuard (e.g. login, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
