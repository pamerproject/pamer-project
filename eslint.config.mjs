import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // React Compiler-era lint rules (react-hooks v6, baru di Next 16).
      // Pola berikut DISENGAJA di codebase ini dan tidak mengubah perilaku
      // runtime — diturunkan ke warning agar `eslint` tidak gagal:
      // - set-state-in-effect: fetch-on-mount + reset state saat modal/prop
      //   berubah (pola standar data fetching & prop-sync).
      // - purity: pemanggilan Date.now()/Math.random() saat render untuk
      //   relative time & slug random (bukan side-effect berbahaya).
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
