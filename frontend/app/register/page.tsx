"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import { ErrorBanner } from "@/components/States";
import { register } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { BTN_PRIMARY, FIELD_CLASS, LABEL_CLASS } from "@/lib/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      setSession(await register({ name: name.trim(), email: email.trim(), password }));
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up PaisaTrack and start tracking in a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error ? <ErrorBanner message={error} /> : null}

        <div>
          <label className={LABEL_CLASS} htmlFor="register-name">
            Name
          </label>
          <input
            id="register-name"
            autoComplete="name"
            className={FIELD_CLASS}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Sathish Kumar"
            required
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            className={FIELD_CLASS}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS} htmlFor="register-password">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              className={FIELD_CLASS}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="register-confirm">
              Confirm password
            </label>
            <input
              id="register-confirm"
              type="password"
              autoComplete="new-password"
              className={FIELD_CLASS}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Repeat password"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className={`${BTN_PRIMARY} w-full`}
          disabled={submitting}
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
