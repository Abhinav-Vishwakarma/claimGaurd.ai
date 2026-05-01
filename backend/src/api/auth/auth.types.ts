export const roles = ['CLIENT', 'HOSPITAL', 'ADMIN'] as const;
export type Role = (typeof roles)[number];

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};
