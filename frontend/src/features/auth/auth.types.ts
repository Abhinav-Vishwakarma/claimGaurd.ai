export type Role = "CLIENT" | "HOSPITAL" | "ADMIN";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  name?: string;
  role: Role;
};
