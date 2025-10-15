export type Role = 'admin' | 'triage' | 'service' | 'panel' | 'user';

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
};