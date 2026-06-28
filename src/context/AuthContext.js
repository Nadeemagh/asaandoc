// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext({ user: null, profile: null, loading: true });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(false); // Stop loading immediately when user found
        // Load profile in background
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          setProfile(snap.exists() ? snap.data() : null);
        } catch(e) {
          console.error("Profile load error:", e);
        }
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });
    // Fallback timeout
    const t = setTimeout(() => setLoading(false), 8000);
    return () => { unsub(); clearTimeout(t); };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
