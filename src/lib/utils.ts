import { auth } from './firebase';
import { OperationType, FirestoreErrorInfo } from '../types';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const GOLONGAN_OPTIONS = [
  {
    group: "Golongan I",
    items: [
      "Juru Muda / I.a",
      "Juru Muda Tingkat I / I.b",
      "Juru / I.c",
      "Juru Tingkat I / I.d",
    ]
  },
  {
    group: "Golongan II",
    items: [
      "Pengatur Muda / II.a",
      "Pengatur Muda Tingkat I / II.b",
      "Pengatur / II.c",
      "Pengatur Tingkat I / II.d",
    ]
  },
  {
    group: "Golongan III",
    items: [
      "Penata Muda / III.a",
      "Penata Muda Tingkat I / III.b",
      "Penata / III.c",
      "Penata Tingkat I / III.d",
    ]
  },
  {
    group: "Golongan IV",
    items: [
      "Pembina / IV.a",
      "Pembina Tingkat I / IV.b",
      "Pembina Utama Muda / IV.c",
      "Pembina Utama Madya / IV.d",
      "Pembina Utama / IV.e",
    ]
  }
];
