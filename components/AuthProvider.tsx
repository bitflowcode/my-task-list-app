"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

type UserProfile = {
  nombre: string;
  email: string;
  fechaCreacion: string;
  ultimoAcceso: string;
};

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, nombre: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (nombre: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  updateUserProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const fetchUserProfile = useCallback(async (uid: string) => {
    const userDoc = await getDoc(doc(db, "usuarios", uid));
    if (userDoc.exists()) {
      setUserProfile(userDoc.data() as UserProfile);
    } else if (user) {
      await createUserProfile(
        user.uid,
        user.email || "",
        user.displayName || user.email || ""
      );
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  const createUserProfile = async (uid: string, email: string, nombre: string) => {
    const userProfile: UserProfile = {
      nombre,
      email,
      fechaCreacion: new Date().toISOString(),
      ultimoAcceso: new Date().toISOString(),
    };
    await setDoc(doc(db, "usuarios", uid), userProfile);
    setUserProfile(userProfile);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    if (result.user) {
      const userDoc = await getDoc(doc(db, "usuarios", result.user.uid));
      if (!userDoc.exists()) {
        await createUserProfile(
          result.user.uid,
          result.user.email || "",
          result.user.displayName || result.user.email || ""
        );
      }
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = async (email: string, password: string, nombre: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, {
      displayName: nombre
    });
    await createUserProfile(userCredential.user.uid, email, nombre);
  };

  const updateUserProfile = async (nombre: string) => {
    if (!user || !userProfile) return;
    
    await updateProfile(user, {
      displayName: nombre
    });
    
    const updatedProfile: UserProfile = {
      nombre,
      email: userProfile.email,
      fechaCreacion: userProfile.fechaCreacion,
      ultimoAcceso: new Date().toISOString(),
    };
    
    await setDoc(doc(db, "usuarios", user.uid), updatedProfile);
    setUserProfile(updatedProfile);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        resetPassword,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};