"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import PageHeader from "@/components/PageHeader";
import { ErrorBanner } from "@/components/States";
import { useTheme, type Theme } from "@/components/ThemeProvider";
import { changePassword, updateProfile } from "@/lib/api";
import {
  clearSession,
  getAuthServerSnapshot,
  getAuthSnapshot,
  initialsOf,
  subscribeAuth,
  updateSessionUser,
} from "@/lib/auth";
import {
  BTN_DANGER,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD_CLASS,
  FIELD_CLASS,
  LABEL_CLASS,
} from "@/lib/ui";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "password", label: "Password" },
  { id: "appearance", label: "Appearance" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>("profile");

  return (
    <>
      <PageHeader title="Settings" />

      <div className="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
        {/* Mobile: the tabs and the panel share one card. Desktop: split into two columns. */}
        <div className={`${CARD_CLASS} md:contents`}>
          <nav
            role="tablist"
            aria-label="Settings sections"
            className="flex gap-1 overflow-x-auto border-b border-slate-200 p-2 md:flex-col md:overflow-visible md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-2 md:shadow-sm dark:border-slate-800 dark:md:border-slate-800 dark:md:bg-slate-900"
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`settings-tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls="settings-panel"
                onClick={() => setTab(item.id)}
                className={`inline-flex shrink-0 items-center rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:w-full ${
                  tab === item.id
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="md:rounded-2xl md:border md:border-slate-200 md:bg-white md:shadow-sm dark:md:border-slate-800 dark:md:bg-slate-900">
            <div
              role="tabpanel"
              id="settings-panel"
              aria-labelledby={`settings-tab-${tab}`}
              className="divide-y divide-slate-200 dark:divide-slate-800"
            >
              {tab === "profile" ? (
                <>
                  <PhotoSection />
                  <ProfileSection />
                </>
              ) : null}
              {tab === "password" ? <PasswordSection /> : null}
              {tab === "appearance" ? <AppearanceSection /> : null}
            </div>

           
          </div>
        </div>
      </div>
    </>
  );
}

const AVATAR_SIZE = 256;

/** Centre-crops the chosen file to a square and returns a small JPEG data URL. */
function toAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not read the image in this browser."));
        return;
      }
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      // Flatten transparency onto white so a PNG does not come out black as JPEG.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
      context.drawImage(
        image,
        (image.naturalWidth - side) / 2,
        (image.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        AVATAR_SIZE,
        AVATAR_SIZE,
      );
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("That file could not be read as an image."));
    };
    image.src = objectUrl;
  });
}

function PhotoSection() {
  const session = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getAuthServerSnapshot,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) return null;

  const shown = pending ?? session.user.avatar;

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still fires a change event.
    event.target.value = "";
    if (!file) return;

    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Please choose an image smaller than 5 MB.");
      return;
    }

    try {
      setPending(await toAvatarDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that image.");
    }
  }

  async function save() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      updateSessionUser(await updateProfile({ avatar: pending }));
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the picture.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      updateSessionUser(await updateProfile({ avatar: null }));
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the picture.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="p-5">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Profile picture
      </h2>

      <div className="mt-4 flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-600 text-xl font-semibold text-white">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- the avatar is a data URL, which next/image cannot optimise
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>{initialsOf(session.user.name)}</span>
          )}
        </span>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={BTN_SECONDARY}
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            Choose photo
          </button>
          {pending ? (
            <button
              type="button"
              className={BTN_PRIMARY}
              onClick={save}
              disabled={busy}
            >
              {busy ? "Saving…" : "Save photo"}
            </button>
          ) : null}
          {session.user.avatar ? (
            <button
              type="button"
              className={BTN_DANGER}
              onClick={remove}
              disabled={busy}
            >
              Remove
            </button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={pick}
          className="sr-only"
        />
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      ) : null}
    </section>
  );
}

function ProfileSection() {
  const session = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getAuthServerSnapshot,
  );
  const [name, setName] = useState(session?.user.name ?? "");
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setBusy(true);
    try {
      updateSessionUser(
        await updateProfile({ name: name.trim(), email: email.trim() }),
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="p-5">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Profile
      </h2>

      <form onSubmit={submit} className="mt-4 space-y-4">
        {error ? <ErrorBanner message={error} /> : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="profile-name">
              Name
            </label>
            <input
              id="profile-name"
              className={FIELD_CLASS}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="profile-email">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              autoComplete="email"
              className={FIELD_CLASS}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            {saved ? "Profile updated." : ""}
          </span>
          <button type="submit" className={BTN_PRIMARY} disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </section>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (newPassword.length < 8) {
      setError("Choose a new password with at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("The two new passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not change the password.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="p-5">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Password
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Enter your current password, then pick a new one.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        {error ? <ErrorBanner message={error} /> : null}

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS} htmlFor="password-current">
              Current password
            </label>
            <input
              id="password-current"
              type="password"
              autoComplete="current-password"
              className={FIELD_CLASS}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="password-new">
              New password
            </label>
            <input
              id="password-new"
              type="password"
              autoComplete="new-password"
              className={FIELD_CLASS}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={LABEL_CLASS} htmlFor="password-confirm">
              Confirm new password
            </label>
            <input
              id="password-confirm"
              type="password"
              autoComplete="new-password"
              className={FIELD_CLASS}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            {saved ? "Password updated." : ""}
          </span>
          <button type="submit" className={BTN_PRIMARY} disabled={busy}>
            {busy ? "Updating…" : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; label: string; hint: string; icon: string }[] = [
    { value: "light", label: "Light", hint: "Bright, low-contrast surfaces", icon: "☀️" },
    { value: "dark", label: "Dark", hint: "Easy on the eyes at night", icon: "🌙" },
  ];

  return (
    <section className="p-5">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Appearance
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Your preference is saved in this browser and defaults to your system
        setting.
      </p>

      <fieldset className="mt-4 grid grid-cols-2 gap-3">
        <legend className="sr-only">Theme</legend>
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition sm:gap-3 ${
              theme === option.value
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                : "border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            }`}
          >
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={theme === option.value}
              onChange={() => setTheme(option.value)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                <span aria-hidden className="mr-1">
                  {option.icon}
                </span>
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                {option.hint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
