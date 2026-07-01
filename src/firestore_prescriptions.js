// ============================================================
// firestore_prescriptions.js
// Drop this file into your src/services/ folder
// Firebase project: asaandoc-e0581
// ============================================================
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase"; // your existing firebase.js

// ── Firestore collection path ────────────────────────────────
// prescriptions/{rxId}   (top-level, queryable by doctorId or patientId)
const COL = "prescriptions";

// ── Save a new prescription ──────────────────────────────────
// Call this when doctor clicks "Save & Done"
// rxData shape comes straight from PrescriptionPortal state
export async function savePrescription(rxData, doctorId) {
  const payload = {
    ...rxData,
    doctorId,                     // logged-in doctor's Firebase UID
    createdAt: serverTimestamp(), // Firestore server time
  };
  const ref = await addDoc(collection(db, COL), payload);
  return ref.id; // Firestore document ID
}

// ── Fetch all prescriptions written BY a doctor ──────────────
// Used on doctor portal history tab
export async function getPrescriptionsByDoctor(doctorId) {
  const q = query(
    collection(db, COL),
    where("doctorId", "==", doctorId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
}

// ── Fetch all prescriptions FOR a patient ───────────────────
// Used on patient portal — match by phone (or patientId once you have auth)
export async function getPrescriptionsByPatient(patientPhone) {
  const q = query(
    collection(db, COL),
    where("phone", "==", patientPhone),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
}

// ── Fetch a single prescription by Firestore doc ID ─────────
export async function getPrescriptionById(firestoreId) {
  const ref = doc(db, COL, firestoreId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { firestoreId: snap.id, ...snap.data() };
}
