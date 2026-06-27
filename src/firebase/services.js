// src/firebase/services.js
import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp, setDoc, getDoc,
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
    console.log("Doctors found:", snap.docs.length);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("getDoctors error:", e);
    return [];
  }
};

export const seedDoctors = async () => {
  const DOCTORS = [
    { name: "Dr. Amina Iftikhar",           specialty: "Clinical Psychologist",         exp: 14, fee: 4000, hospital: "Rainbow Obesity & Eating Disorder Centre", avatar: "AI", color: "#218EB6", available: ["Mon","Wed","Fri"],         slots: ["09:00","10:00","11:00","14:00","15:00","16:00"] },
    { name: "Dn Tayyaba Raza",              specialty: "Nutritionist & Dietitian",      exp: 3,  fee: 2000, hospital: "Multan Intensive Care (MIC)",               avatar: "TR", color: "#00C897", available: ["Tue","Thu","Sat"],         slots: ["08:00","09:00","10:00","15:00","16:00","17:00"] },
    { name: "Dr. Shamim Hashim Khan",        specialty: "Internal Medicine Specialist",  exp: 35, fee: 4000, hospital: "Novimed Specialist Clinic",                 avatar: "SH", color: "#8B5CF6", available: ["Mon","Tue","Wed","Thu"],  slots: ["10:00","11:00","12:00","14:00","15:00"] },
    { name: "Dr Asifa Saleem",              specialty: "Child Specialist (Pediatrician)",exp:19,  fee: 2500, hospital: "YCDC Young Children Development Centre",    avatar: "AS", color: "#F59E0B", available: ["Mon","Wed","Fri","Sat"], slots: ["09:00","10:00","11:00","13:00","14:00","15:00"] },
    { name: "Dr. Samar Ghufran",            specialty: "Laparoscopic & Breast Surgeon", exp: 13, fee: 3000, hospital: "Surgimed Hospital, Lahore",                 avatar: "SG", color: "#EF4444", available: ["Tue","Thu"],             slots: ["08:00","09:00","10:00","14:00","15:00","16:00"] },
    { name: "Dr. Zahid Hussain",            specialty: "Urologist & Andrologist",       exp: 35, fee: 2500, hospital: "Hussain Kidney & Gallstone Hospital",       avatar: "ZH", color: "#0EA5E9", available: ["Mon","Wed","Sat"],        slots: ["09:00","10:00","11:00","15:00","16:00","17:00"] },
    { name: "Dr. Tayyaba Khatoon",          specialty: "Clinical Psychologist",         exp: 10, fee: 3000, hospital: "Yashfi Healing & Recovery Center",          avatar: "TK", color: "#EC4899", available: ["Mon","Tue","Thu"],        slots: ["09:00","10:00","11:00","14:00","15:00"] },
    { name: "Prof. Dr. Zeeshan Ahmed Niazi",specialty: "General Surgeon",              exp: 10, fee: 3000, hospital: "Hameed Latif Hospital",                      avatar: "ZN", color: "#10B981", available: ["Tue","Wed","Fri"],        slots: ["10:00","11:00","13:00","14:00","15:00","16:00"] },
  ];
  const existing = await getDocs(collection(db, "doctors"));
  if (existing.docs.length > 0) return;
  for (const doc_ of DOCTORS) {
    await addDoc(collection(db, "doctors"), doc_);
  }
};

// ─── APPOINTMENTS ─────────────────────────────────────────────────

export const bookAppointment = async (data) => {
  const ref = await addDoc(collection(db, "appointments"), {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const getAppointmentsByPatient = async (patientUid) => {
  const q = query(
    collection(db, "appointments"),
    where("patientUid", "==", patientUid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAppointmentsByDoctor = async (doctorId) => {
  const q = query(
    collection(db, "appointments"),
    where("doctorId", "==", doctorId),
    orderBy("date", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateAppointmentStatus = async (appointmentId, status) => {
  await updateDoc(doc(db, "appointments", appointmentId), {
    status,
    updatedAt: serverTimestamp(),
  });
};
