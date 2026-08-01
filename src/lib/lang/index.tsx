"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import id from "./id";
import en from "./en";

export type { TranslationKeys } from "./id";

type Lang = "id" | "en";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  _raw: typeof id;
}

const STORAGE_KEY = "pamerproject_lang";

const LangContext = createContext<LangContextValue | null>(null);

const translations: Record<string, typeof id> = { id, en };

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "id") {
        setLangState(stored);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // localStorage not available
    }
  }, []);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const dict = translations[lang];
      let value = getNested(dict as Record<string, unknown>, path);

      if (value === undefined) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[lang] Missing translation key: " + path);
        }
        value = getNested(id as Record<string, unknown>, path);
      }

      if (typeof value !== "string") {
        return path;
      }

      if (params) {
        return value.replace(/\{(\w+)\}/g, function(_: string, key: string) {
          const v = params[key];
          return v !== undefined ? String(v) : "{" + key + "}";
        });
      }

      return value;
    },
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang: lang, setLang: setLang, t: t, _raw: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useTranslation(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within a <LangProvider>");
  }
  return ctx;
}

export { id, en };
export type { Lang };
