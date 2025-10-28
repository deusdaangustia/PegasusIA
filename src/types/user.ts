
export type UserRole = "dono" | "admin" | "vip" | "user" | "ban";

export interface AdminPanelUser {
  uid: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt?: any;
}
