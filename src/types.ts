export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: any;
}

export interface Biodata {
  id?: string;
  namaLengkap: string;
  nip?: string;
  pangkatGolongan: string;
  jabatan: string;
  nik: string;
  npwp: string;
  instansi: string;
  alamatKantor: string;
  pendidikan: string;
  telpWa: string;
  namaBank: string;
  nomorRekening: string;
  fotoKtpUrl?: string;
  fotoNpwpUrl?: string;
  userId: string;
  createdAt?: any;
  updatedAt?: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}
