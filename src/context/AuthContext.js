// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext({ user: null, profile: null, loading: true });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); // stays TRUE until role confirmed

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Check cached role first — for instant load
        try {
          const cached = localStorage.getItem("asaandoc_profile");
          if (cached) {
            const parsed = JSON.parse(cached);
            // Only use cache if it's for the same user
            if (parsed._uid === firebaseUser.uid) {
              setProfile(parsed);
              setLoading(false); // Show correct portal immediately from cache
            }
          }
        } catch(e) {}

        // Always verify with Firestore in background
        try {
          const doctorSnap = await getDoc(doc(db, "doctors", firebaseUser.uid));

          if (doctorSnap.exists()) {
            const resolved = { ...doctorSnap.data(), role: "doctor", _uid: firebaseUser.uid };
            setProfile(resolved);
            localStorage.setItem("asaandoc_profile", JSON.stringify(resolved));
          } else {
            const patientSnap = await getDoc(doc(db, "patients", firebaseUser.uid));
            if (patientSnap.exists()) {
              const resolved = { ...patientSnap.data(), role: "patient", _uid: firebaseUser.uid };
              setProfile(resolved);
              localStorage.setItem("asaandoc_profile", JSON.stringify(resolved));
            } else {
              const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
              if (userSnap.exists()) {
                const resolved = { ...userSnap.data(), _uid: firebaseUser.uid };
                setProfile(resolved);
                localStorage.setItem("asaandoc_profile", JSON.stringify(resolved));
              } else {
                const fallback = { role: "patient", _uid: firebaseUser.uid };
                setProfile(fallback);
                localStorage.setItem("asaandoc_profile", JSON.stringify(fallback));
              }
            }
          }
        } catch(e) {
          console.error("Profile load error:", e);
          // Keep cached profile on error
        } finally {
          setLoading(false); // Always stop loading after Firestore resolves
        }

      } else {
        // Logged out
        setUser(null);
        setProfile(null);
        localStorage.removeItem("asaandoc_profile");
        setLoading(false);
      }
    });

    // Safety timeout — 8 seconds max
    const t = setTimeout(() => setLoading(false), 8000);
    return () => { unsub(); clearTimeout(t); };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
