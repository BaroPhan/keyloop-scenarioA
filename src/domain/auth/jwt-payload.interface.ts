/** Discriminator for JWT subjects: customer vs admin accounts. */
export enum AuthKind {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

/** Claims encoded into the access token. */
export interface JwtPayload {
  sub: number;
  email: string;
  kind: AuthKind;
}

/** Shape attached to `request.user` after JwtStrategy validation. */
export interface AuthenticatedPrincipal {
  kind: AuthKind;
  id: number;
  email: string;
}
