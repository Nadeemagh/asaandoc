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
    console.log("[AUTH DEBUG] AuthProvider mounted, attaching onAuthStateChanged listener");
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[AUTH DEBUG] onAuthStateChanged fired. firebaseUser:", firebaseUser ? firebaseUser.uid : null);
      if (firebaseUser) {
        setUser(firebaseUser);
        console.log("[AUTH DEBUG] setUser called with uid:", firebaseUser.uid);
        // Check cached role first — for instant load
        try {
          const cached = localStorage.getItem("asaandoc_profile");
          if (cached) {
            const parsed = JSON.parse(cached);
            // Only use cache if it's for the same user
            if (parsed._uid === firebaseUser.uid) {
              setProfile(parsed);
              setLoading(false); // Show correct portal immediately from cache
              console.log("[AUTH DEBUG] Used cached profile, loading=false");
            }
          }
        } catch(e) {}
        // Always verify with Firestore in background
        try {
          console.log("[AUTH DEBUG] Checking doctors/" + firebaseUser.uid);
          const doctorSnap = await getDoc(doc(db, "doctors", firebaseUser.uid));
          console.log("[AUTH DEBUG] doctors doc exists:", doctorSnap.exists());
          if (doctorSnap.exists()) {
            const resolved = { ...doctorSnap.data(), role: "doctor", _uid: firebaseUser.uid };
            setProfile(resolved);
            localStorage.setItem("asaandoc_profile", JSON.stringify(resolved));
            console.log("[AUTH DEBUG] Resolved as DOCTOR:", resolved);
          } else {
            console.log("[AUTH DEBUG] Checking patients/" + firebaseUser.uid);
            const patientSnap = await getDoc(doc(db, "patients", firebaseUser.uid));
            console.log("[AUTH DEBUG] patients doc exists:", patientSnap.exists());
            if (patientSnap.exists()) {
              const resolved = { ...patientSnap.data(), role: "patient", _uid: firebaseUser.uid };
              setProfile(resolved);
              localStorage.setItem("asaandoc_profile", JSON.stringify(resolved));
              console.log("[AUTH DEBUG] Resolved as PATIENT (patients collection):", resolved);
            } else {
              console.log("[AUTH DEBUG] Checking users/" + firebaseUser.uid);
              const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
              console.log("[AUTH DEBUG] users doc exists:", userSnap.exists());
              if (userSnap.exists()) {
                const resolved = { ...userSnap.data(), _uid: firebaseUser.uid };
                setProfile(resolved);
                localStorage.setItem("asaandoc_profile", JSON.stringify(resolved));
                console.log("[AUTH DEBUG] Resolved from USERS collection:", resolved);
              } else {
                const fallback = { role: "patient", _uid: firebaseUser.uid };
                setProfile(fallback);
                localStorage.setItem("asaandoc_profile", JSON.stringify(fallback));
                console.log("[AUTH DEBUG] No doc found anywhere, using fallback:", fallback);
              }
            }
          }
        } catch(e) {
          console.error("[AUTH DEBUG] Profile load error:", e);
          // Keep cached profile on error
        } finally {
          setLoading(false); // Always stop loading after Firestore resolves
          console.log("[AUTH DEBUG] finally block: setLoading(false) called");
        }
      } else {
        // Logged out
        setUser(null);
        setProfile(null);
        localStorage.removeItem("asaandoc_profile");
        setLoading(false);
        console.log("[AUTH DEBUG] No firebaseUser — set to logged out state");
      }
    });
    // Safety timeout — 8 seconds max
    const t = setTimeout(() => {
      console.log("[AUTH DEBUG] 8-second safety timeout fired, forcing loading=false");
      setLoading(false);
    }, 8000);
    return () => { unsub(); clearTimeout(t); };
  }, []);
  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
