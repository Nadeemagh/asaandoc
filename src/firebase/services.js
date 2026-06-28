// src/firebase/services.js
import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, serverTimestamp, setDoc, getDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { db, auth } from "./config";

// ─── HELPER: Convert any Firebase value to plain JS number ────────
const toNumber = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseInt(val) || 0;
  if (typeof val === "object") {
    // Firebase Timestamp or special type
    if (val.integerValue !== undefined) return parseInt(val.integerValue) || 0;
    if (val.doubleValue !== undefined) return parseFloat(val.doubleValue) || 0;
    if (val.numberValue !== undefined) return Number(val.numberValue) || 0;
  }
  return Number(val) || 0;
};

// ─── HELPER: Normalize clinic data from Firebase ──────────────────
const normalizeClinic = (clinic) => {
  if (!clinic) return clinic;
  return {
    ...clinic,
    fee: toNumber(clinic.fee),
    days: Array.isArray(clinic.days) ? clinic.days : [],
    slots: Array.isArray(clinic.slots) ? clinic.slots : [],
    isOnline: clinic.isOnline === true || clinic.isOnline === "true",
  };
};

// ─── HELPER: Normalize doctor data ────────────────────────────────
const normalizeDoctor = (data, id) => {
  const d = { id, ...data };
  if (Array.isArray(d.clinics)) {
    d.clinics = d.clinics.map(c => ({
      ...c,
      fee: typeof c.fee === "object" ? parseInt(c.fee?.integerValue || 0) : Number(c.fee) || 0,
      days: Array.isArray(c.days) ? c.days : [],
      slots: Array.isArray(c.slots) ? c.slots : [],
      isOnline: Boolean(c.isOnline),
    }));
    console.log("Clinics after normalize:", JSON.stringify(d.clinics.map(c => ({name:c.name, fee:c.fee}))));
  }
  return d;
};

// ─── AUTH ─────────────────────────────────────────────────────────

export const registerUser = async ({ email, password, name, role, doctorId = null }) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid, name, email, role,
    doctorId: doctorId || null,
    createdAt: serverTimestamp(),
  });
  return cred.user;
};

export const loginUser = async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  return { user: cred.user, profile: snap.data() };
};

export const logoutUser = () => signOut(auth);

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};

// ─── DOCTORS ──────────────────────────────────────────────────────

export const getDoctors = async () => {
  try {
    const snap = await getDocs(collection(db, "doctors"));
    const doctors = snap.docs.map(d => {
      const normalized = normalizeDoctor(d.data(), d.id);
      console.log("Doctor loaded:", normalized.name);
      if (normalized.clinics) {
        normalized.clinics.forEach(c => {
          console.log(`  Clinic: ${c.name}, fee: ${c.fee}, type: ${typeof c.fee}`);
        });
      }
      return normalized;
    });
    return doctors;
  } catch (e) {
    console.error("getDoctors error:", e);
    return [];
  }
};

// ─── APPOINTMENTS ─────────────────────────────────────────────────

export const bookAppointment = async (data) => {
  try {
    const ref = await addDoc(collection(db, "appointments"), {
      ...data,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    console.error("bookAppointment error:", e);
    throw e;
  }
};

export const getAppointmentsByPatient = async (patientUid) => {
  try {
    const q = query(
      collection(db, "appointments"),
      where("patientUid", "==", patientUid)
    );
    const snap = await getDocs(q);
    const appointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    appointments.sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      return 0;
    });
    return appointments;
  } catch (e) {
    console.error("getAppointmentsByPatient error:", e);
    return [];
  }
};

export const getAppointmentsByDoctor = async (doctorId) => {
  try {
    const q = query(
      collection(db, "appointments"),
      where("doctorId", "==", doctorId)
    );
    const snap = await getDocs(q);
    const appointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    appointments.sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date);
      return 0;
    });
    return appointments;
  } catch (e) {
    console.error("getAppointmentsByDoctor error:", e);
    return [];
  }
};

export const updateAppointmentStatus = async (appointmentId, status) => {
  try {
    await updateDoc(doc(db, "appointments", appointmentId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("updateAppointmentStatus error:", e);
    throw e;
  }
};

export const seedDoctors = async () => {
  return; // Doctors added manually via Firebase Console
};
