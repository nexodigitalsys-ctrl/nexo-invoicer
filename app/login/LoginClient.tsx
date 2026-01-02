"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginClient() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold text-center">Login</h1>

      {error && (
        <p className="text-sm text-red-600 text-center">
          Credenciais inválidas
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          signIn("credentials", {
            email,
            password,
            callbackUrl: "/dashboard",
          });
        }}
        className="space-y-3"
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border p-2 text-sm"
          required
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border p-2 text-sm"
          required
        />

        <button
          type="submit"
          className="w-full rounded-md bg-black text-white py-2 text-sm hover:bg-slate-800"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
