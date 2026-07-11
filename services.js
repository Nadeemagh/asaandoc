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

export const registerUser = async ({ email, password, name, role, phone = "", doctorId = null, clinicId = null }) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });

  let finalDoctorId = doctorId;

  // If registering as doctor, auto-create doctor document
  if (role === "doctor") {
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const doctorRef = doc(collection(db, "doctors"));
    const slug = generateDoctorSlug({ id: doctorRef.id, name, specialty: "General Practitioner" });
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
      slug,
      createdAt: serverTimestamp(),
    });
    finalDoctorId = doctorRef.id;
  }

  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid, name, email, role,
    phone: phone || "",
    doctorId: finalDoctorId || null,
    clinicId: clinicId || null,
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
    const ref = doc(collection(db, "appointments"));
    // Give every "Online" appointment its own private video room, tied to
    // the appointment's own random Firestore ID so it can't be guessed.
    const videoRoomId = data.type === "Online" ? `asaandoc-${ref.id}` : null;
    await setDoc(ref, {
      ...data,
      videoRoomId,
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

// For appointments booked before the video feature existed (so they have
// no videoRoomId saved yet). Generates and saves one on first use, so old
// "Online" appointments get video calling retroactively without needing
// a manual backfill step.
export const ensureAppointmentVideoRoom = async (appointmentId, existingRoomId) => {
  if (existingRoomId) return existingRoomId;
  const roomId = `asaandoc-${appointmentId}`;
  await updateDoc(doc(db, "appointments", appointmentId), { videoRoomId: roomId });
  return roomId;
};

// Fetches a patient's full prescription history (matches by phone with/without
// +92 prefix, and by email) — used by the Health Records Vault to build a
// chronological clinical timeline and vitals trend.
export const getPrescriptionsForPatient = async (profile, user) => {
  try {
    const phone = profile?.phone ? "+92" + profile.phone : "";
    const phone2 = profile?.phone || "";
    const email = user?.email || "";
    const candidates = [phone, phone2, email].filter(Boolean);
    const results = [];
    const ids = new Set();
    for (const val of candidates) {
      const q = query(collection(db, "prescriptions"), where("phone", "==", val));
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        if (!ids.has(d.id)) { ids.add(d.id); results.push({ firestoreId: d.id, ...d.data() }); }
      });
    }
    // Chronological ascending — needed so vitals trend comparisons (latest vs previous) work correctly.
    results.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    return results;
  } catch (e) {
    console.error("getPrescriptionsForPatient error:", e);
    return [];
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

// ─── CLINICS (multi-tenant support) ────────────────────────────────
// A doctor/patient with no clinicId behaves exactly as before (open
// AsaanDoc marketplace — visible to/sees everyone). Setting clinicId
// on both scopes them to only see each other.

export const createClinic = async ({ name, address = "", phone = "", logo = "" }) => {
  const ref = doc(collection(db, "clinics"));
  const slug = `${slugify(name)}-${ref.id.slice(-4)}`.toLowerCase();
  await setDoc(ref, { name, address, phone, logo, slug, active: true, createdAt: serverTimestamp() });
  return { id: ref.id, slug };
};

export const getAllClinics = async () => {
  const snap = await getDocs(collection(db, "clinics"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getClinicById = async (clinicId) => {
  if (!clinicId) return null;
  const snap = await getDoc(doc(db, "clinics", clinicId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getClinicBySlug = async (slug) => {
  const q = query(collection(db, "clinics"), where("slug", "==", (slug || "").toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

export const updateClinic = async (clinicId, data) => {
  await updateDoc(doc(db, "clinics", clinicId), data);
};

// Deletes a clinic and un-assigns any doctors that were scoped to it,
// so they fall back to the open AsaanDoc marketplace rather than being
// left pointing at a clinic that no longer exists.
export const deleteClinic = async (clinicId) => {
  const snap = await getDocs(query(collection(db, "doctors"), where("clinicId", "==", clinicId)));
  await Promise.all(snap.docs.map(d => updateDoc(doc(db, "doctors", d.id), { clinicId: null })));
  await deleteDoc(doc(db, "clinics", clinicId));
};

// Deletes a patient's profile document. NOTE: this does not delete their
// underlying Firebase Auth account/credentials (that requires the Admin
// SDK via a Cloud Function) — it removes their app profile/access only.
export const deletePatientProfile = async (uid) => {
  await deleteDoc(doc(db, "users", uid));
};

export const assignDoctorToClinic = async (doctorId, clinicId) => {
  // clinicId === null unassigns the doctor back to the open marketplace
  await updateDoc(doc(db, "doctors", doctorId), { clinicId: clinicId || null });
};

// Fetches doctors scoped correctly: a clinic patient sees only that
// clinic's doctors; an open-marketplace patient (no clinicId) sees only
// independent doctors, exactly like before this feature existed.
export const getDoctorsForPatient = async (patientClinicId) => {
  const all = await getDoctors();
  if (patientClinicId) return all.filter(d => d.clinicId === patientClinicId);
  return all.filter(d => !d.clinicId);
};
// Turns "Dr. Javaid Iqbal" into "dr-javaid-iqbal" — used to build
// human-readable public URLs like /doctor/dr-javaid-iqbal-cardiologist-a1b2
export const slugify = (str) =>
  (str || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

// Builds a slug from name + specialty + a short unique suffix from the doc id,
// so two doctors with the same name never collide.
export const generateDoctorSlug = (doctor) => {
  const base = slugify(`${doctor.name || "doctor"}-${doctor.specialty || ""}`);
  const suffix = (doctor.id || "").slice(-4) || Math.random().toString(36).slice(-4);
  return `${base}-${suffix}`.toLowerCase();
};

// Look up a doctor by their public slug (used by the public profile page).
export const getDoctorBySlug = async (slug) => {
  try {
    const q = query(collection(db, "doctors"), where("slug", "==", (slug || "").toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  } catch (e) {
    console.error("getDoctorBySlug error:", e);
    return null;
  }
};

// Makes sure a specific doctor has a slug, generating + saving one if missing.
// Returns the slug either way. Safe to call repeatedly.
export const ensureDoctorSlug = async (doctorLike) => {
  if (doctorLike.slug) return doctorLike.slug;
  const slug = generateDoctorSlug(doctorLike);
  await updateDoc(doc(db, "doctors", doctorLike.id), { slug });
  return slug;
};

// Bulk-fills slugs for any existing doctors that don't have one yet.
// Call this once from the Admin Panel after adding this feature.
export const backfillDoctorSlugs = async () => {
  const snap = await getDocs(collection(db, "doctors"));
  const updated = [];
  for (const d of snap.docs) {
    const data = { id: d.id, ...d.data() };
    if (!data.slug) {
      const slug = generateDoctorSlug(data);
      await updateDoc(doc(db, "doctors", d.id), { slug });
      updated.push({ id: d.id, name: data.name, slug });
    }
  }
  return updated;
};

// ─── BACKUP & RESTORE ───────────────────────────────────────────────
// Generic helpers: works with any collection, since backup/restore
// just needs { id, ...data } shaped documents either way.

export const getAllDocsRaw = async (collectionName) => {
  const snap = await getDocs(collection(db, collectionName));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Overwrites (or creates) each document at its original id.
// Returns a per-collection success/failure count so the UI can report it.
export const restoreCollectionDocs = async (collectionName, docsArray) => {
  let success = 0, failed = 0;
  for (const item of docsArray) {
    const { id, ...data } = item;
    if (!id) { failed++; continue; }
    try {
      await setDoc(doc(db, collectionName, id), data);
      success++;
    } catch (e) {
      console.error(`Restore failed for ${collectionName}/${id}:`, e);
      failed++;
    }
  }
  return { collection: collectionName, success, failed };
};

// ═══════════════════ PROMOTIONS (banner ads) ═══════════════════

const sortByOrder = (arr) => [...arr].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// Patient side — only active promos, in order
export const getPromotions = async () => {
  const snap = await getDocs(collection(db, "promotions"));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log("[promotions] raw docs from Firestore:", all);
  const active = all.filter(p => p.active !== false);
  console.log("[promotions] active after filter:", active);
  return sortByOrder(active);
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
