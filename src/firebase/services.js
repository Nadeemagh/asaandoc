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
    console.log("Total doctors:", snap.size);
    const doctors = snap.docs.map(d => {
      const data = d.data();
      console.log("Doctor:", data);
      return { id: d.id, ...data };
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
    // Simple query without orderBy to avoid index requirement
    const q = query(
      collection(db, "appointments"),
      where("patientUid", "==", patientUid)
    );
    const snap = await getDocs(q);
    const appointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort client-side instead
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
    // Sort client-side by date
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
  // Kept for compatibility but does nothing now
  // Add doctors manually via Firebase Console
  return;
};
