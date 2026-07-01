// src/context/AuthContext.js
// FIX: Wait for profile before rendering, and check 'doctors' collection for role
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext({ user: null, profile: null, loading: true });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          // Step 1: Check if this user is a doctor
          const doctorSnap = await getDoc(doc(db, "doctors", firebaseUser.uid));

          if (doctorSnap.exists()) {
            // ✅ Found in doctors collection → role = doctor
            setProfile({ ...doctorSnap.data(), role: "doctor" });
          } else {
            // Step 2: Check patients collection
            const patientSnap = await getDoc(doc(db, "patients", firebaseUser.uid));

            if (patientSnap.exists()) {
              setProfile({ ...patientSnap.data(), role: "patient" });
            } else {
              // Step 3: Fallback to users collection (old records)
              const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
              if (userSnap.exists()) {
                setProfile(userSnap.data()); // uses whatever role is stored
              } else {
                setProfile({ role: "patient" }); // default to patient
              }
            }
          }
        } catch (e) {
          console.error("Profile load error:", e);
          setProfile({ role: "patient" }); // safe fallback
        } finally {
          setLoading(false); // ✅ Only stop loading AFTER profile is resolved
        }

      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // Safety timeout — 10 seconds max
    const t = setTimeout(() => setLoading(false), 10000);
    return () => { unsub(); clearTimeout(t); };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
