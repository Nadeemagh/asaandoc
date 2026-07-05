// src/firebase/services.js
import {
  collection, doc, addDoc, updateDoc, getDocs, deleteDoc,
  query, where, orderBy, serverTimestamp, setDoc, getDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { db, auth } from "./config";

// ─── HELPER: Convert any value to plain JS number ─────────────────
const toNum = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseInt(val) || 0;
  if (typeof val === "object") {
    if (val.integerValue !== undefined) return parseInt(val.integerValue) || 0;
    if (val.doubleValue !== undefined) return parseFloat(val.doubleValue) || 0;
  }
  return Number(val) || 0;
};

// ─── AUTH ─────────────────────────────────────────────────────────

export const registerUser = async ({ email, password, name, role, phone = "", doctorId = null }) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });

  let finalDoctorId = doctorId;

  // If registering as doctor, auto-create doctor document
  if (role === "doctor") {
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const doctorRef = doc(collection(db, "doctors"));
    await setDoc(doctorRef, {
      name,
      email,
      specialty: "General Practitioner",
      exp: 0,
      avatar: initials,
      color: "#218EB6",
      clinics: [],
      holidays: [],
      services: "",
      qualifications: "",
      createdAt: serverTimestamp(),
    });
    finalDoctorId = doctorRef.id;
  }

  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid, name, email, role,
    phone: phone || "",
    doctorId: finalDoctorId || null,
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
    return snap.docs.map(d => {
      const data = d.data();
      // Normalize clinics — convert fees to plain numbers
      if (Array.isArray(data.clinics)) {
        data.clinics = data.clinics.map(clinic => ({
          ...clinic,
          fee: toNum(clinic.fee),
          days: Array.isArray(clinic.days) ? clinic.days : [],
          slots: Array.isArray(clinic.slots) ? clinic.slots : [],
          isOnline: clinic.isOnline === true,
        }));
      }
      if (data.fee !== undefined) {
        data.fee = toNum(data.fee);
      }
      console.log("Loaded doctor:", data.name, "clinics:", data.clinics?.map(c => `${c.name}:${c.fee}`));
      return { id: d.id, ...data };
    });
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
    const appts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    appts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return appts;
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
    const appts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    appts.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    return appts;
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

export const seedDoctors = async () => { return; };

// ─── DOCTOR SCHEDULE MANAGEMENT ───────────────────────────────────

export const updateDoctorSchedule = async (doctorId, clinics) => {
  try {
    await updateDoc(doc(db, "doctors", doctorId), {
      clinics,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("updateDoctorSchedule error:", e);
    throw e;
  }
};

export const addHoliday = async (doctorId, date, reason) => {
  try {
    const snap = await getDoc(doc(db, "doctors", doctorId));
    const data = snap.data();
    const holidays = data.holidays || [];
    if (!holidays.find(h => h.date === date)) {
      holidays.push({ date, reason: reason || "Holiday" });
    }
    await updateDoc(doc(db, "doctors", doctorId), { holidays });
  } catch (e) {
    console.error("addHoliday error:", e);
    throw e;
  }
};

export const removeHoliday = async (doctorId, date) => {
  try {
    const snap = await getDoc(doc(db, "doctors", doctorId));
    const data = snap.data();
    const holidays = (data.holidays || []).filter(h => h.date !== date);
    await updateDoc(doc(db, "doctors", doctorId), { holidays });
  } catch (e) {
    console.error("removeHoliday error:", e);
    throw e;
  }
};

export const updateDoctorProfile = async (doctorId, { exp, services, qualifications, photo }) => {
  try {
    const updateData = {
      exp: Number(exp) || 0,
      services: services || "",
      qualifications: qualifications || "",
      updatedAt: serverTimestamp(),
    };
    if (photo !== undefined) updateData.photo = photo;
    await updateDoc(doc(db, "doctors", doctorId), updateData);
  } catch (e) {
    console.error("updateDoctorProfile error:", e);
    throw e;
  }
};

// ─── ADMIN FUNCTIONS ──────────────────────────────────────────────

export const getAllUsers = async () => {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("getAllUsers error:", e);
    return [];
  }
};

export const getAllAppointments = async () => {
  try {
    const snap = await getDocs(collection(db, "appointments"));
    const appts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    appts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return appts;
  } catch (e) {
    console.error("getAllAppointments error:", e);
    return [];
  }
};

export const addDoctor = async (doctorData) => {
  try {
    const ref = await addDoc(collection(db, "doctors"), {
      ...doctorData,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    console.error("addDoctor error:", e);
    throw e;
  }
};

export const deleteDoctor = async (doctorId) => {
  try {
    await deleteDoc(doc(db, "doctors", doctorId));
  } catch (e) {
    console.error("deleteDoctor error:", e);
    throw e;
  }
};

export const updateUserPhone = async (uid, phone) => {
  try {
    await updateDoc(doc(db, "users", uid), { phone });
  } catch (e) {
    console.error("updateUserPhone error:", e);
    throw e;
  }
};

export const updateDoctorData = async (doctorId, data) => {
  try {
    await updateDoc(doc(db, "doctors", doctorId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("updateDoctorData error:", e);
    throw e;
  }
};

// ═══════════════════ PROMOTIONS (banner ads) ═══════════════════

const sortByOrder = (arr) => [...arr].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// Patient side — only active promos, in order
export const getPromotions = async () => {
  const snap = await getDocs(collection(db, "promotions"));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return sortByOrder(all.filter(p => p.active !== false));
};

// Admin side — all promos (including inactive), in order
export const getAllPromotionsAdmin = async () => {
  const snap = await getDocs(collection(db, "promotions"));
  return sortByOrder(snap.docs.map(d => ({ id: d.id, ...d.data() })));
};

// Create or update a promo. Pass an `id` to update, omit to create new.
export const savePromotion = async (promo) => {
  const { id, ...data } = promo;
  if (id) {
    await setDoc(doc(db, "promotions", id), data, { merge: true });
    return id;
  } else {
    const ref = await addDoc(collection(db, "promotions"), data);
    return ref.id;
  }
};

export const deletePromotion = async (id) => {
  await deleteDoc(doc(db, "promotions", id));
};

// ═══════════════════ MEMBERSHIP PLANS ═══════════════════

export const getMembershipPlans = async () => {
  const snap = await getDocs(collection(db, "membershipPlans"));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return sortByOrder(all.filter(p => p.active !== false));
};

export const getAllMembershipPlansAdmin = async () => {
  const snap = await getDocs(collection(db, "membershipPlans"));
  return sortByOrder(snap.docs.map(d => ({ id: d.id, ...d.data() })));
};

export const saveMembershipPlan = async (plan) => {
  const { id, ...data } = plan;
  if (id) {
    await setDoc(doc(db, "membershipPlans", id), data, { merge: true });
    return id;
  } else {
    const ref = await addDoc(collection(db, "membershipPlans"), data);
    return ref.id;
  }
};

export const deleteMembershipPlan = async (id) => {
  await deleteDoc(doc(db, "membershipPlans", id));
};
