// src/context/AppContext.js - FIXED: language persists after login
import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getLang } from "../i18n/translations";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // ✅ Always read language from localStorage first - never lose it
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("medgemma_lang") || "en";
  });
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isDoctor, setIsDoctor] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ t always reflects current language
  const t = getLang(language);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem("medgemma_lang", lang);
    // Also update html lang attribute for accessibility
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    // Apply saved language to document on mount
    document.documentElement.lang = language;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            setUserProfile(data);
            setIsDoctor(data.role === "doctor");

            // ✅ KEY FIX: Only apply profile language if user hasn't manually
            // selected a different language in this session
            // Priority: localStorage (user chose) > profile language > "en"
            const localLang = localStorage.getItem("medgemma_lang");
            const profileLang = data.language;

            if (profileLang && (!localLang || localLang === "en")) {
              // Use profile language only if no manual selection exists
              changeLanguage(profileLang);
            }
            // If user already chose a language on language screen, keep it
          }
        } catch (e) {
          console.error("Profile load error:", e);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setIsDoctor(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginUser = async (email, password) => {
    return signInWithEmailAndPassword(auth, email.trim(), password.trim());
  };

  const registerUser = async (email, password, profileData) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
    const profile = {
      ...profileData,
      uid: cred.user.uid,
      email: email.trim(),
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", cred.user.uid), profile);
    setUserProfile(profile);
    setIsDoctor(profileData.role === "doctor");
    // ✅ Apply the language chosen during registration
    if (profileData.language) changeLanguage(profileData.language);
    return cred;
  };

  const logoutUser = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    setIsDoctor(false);
    // ✅ Keep language preference even after logout
    // Don't clear localStorage language
  };

  const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());

  return (
    <AppContext.Provider value={{
      user, userProfile, language, changeLanguage, t,
      isDoctor, loading, loginUser, registerUser, logoutUser, resetPassword,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
