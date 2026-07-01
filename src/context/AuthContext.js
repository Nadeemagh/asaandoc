// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext({ user: null, profile: null, loading: true });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(() => {
    // Load cached profile instantly on page load — prevents flash to wrong portal
    try {
      const cached = localStorage.getItem("asaandoc_profile");
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
         

          // Step 1: Check doctors collection
          const doctorSnap = await getDoc(doc(db, "doctors", firebaseUser.uid));

          if (doctorSnap.exists()) {
            const data = doctorSnap.data();
            const resolved = { ...data, role: "doctor" };
            setProfile(resolved);
            // Cache so next refresh is instant
            localStorage.setItem("asaandoc_profile", JSON.stringify(resolved));
          } else {
            // Step 2: Check patients collection
            const patientSnap = await getDoc(doc(db, "patients", firebaseUser.uid));

            if (patientSnap.exists()) {
              const data = patientSnap.data();
              const resolved = { ...data, role: "patient" };
              setProfile(resolved);
              localStorage.setItem("asaandoc_profile", JSON.stringify(resolved));
            } else {
              // Step 3: Fallback to users collection
              const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
              if (userSnap.exists()) {
                const data = userSnap.data();
                setProfile(data);
                localStorage.setItem("asaandoc_profile", JSON.stringify(data));
              } else {
                const fallback = { role: "patient" };
                setProfile(fallback);
                localStorage.setItem("asaandoc_profile", JSON.stringify(fallback));
              }
            }
          }
        } catch (e) {
          console.error("Profile load error:", e);
          // Keep cached profile if available, don't wipe it on error
          const cached = localStorage.getItem("asaandoc_profile");
          if (!cached) {
            setProfile({ role: "patient" });
          }
        } finally {
          setLoading(false);
        }

      } else {
        // Logged out — clear everything
        setUser(null);
        setProfile(null);
        localStorage.removeItem("asaandoc_profile");
        setLoading(false);
      }
    });

    const t = setTimeout(() => setLoading(false), 10000);
    return () => { unsub(); clearTimeout(t); };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
