"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import Image from "next/image";
import { updateProfile } from "firebase/auth";
import {
  User,
  Mail,
  Lock,
  CheckCircle,
  ImageIcon,
  Upload,
  Trash2,
} from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { resetPassword } from "@/lib/firebase/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";

export default function SettingsPage() {
  const { user, loading, refreshUser } = useAuth();
  const { logoUrl, title, deptLocation, updateLogoUrl, updateProfileSettings } = useBranding();

  // Profile state
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Profile settings state
  const [titleField, setTitleField] = useState(title || "");
  const [deptLocationField, setDeptLocationField] = useState(deptLocation || "");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (title !== null) setTitleField(title);
    if (deptLocation !== null) setDeptLocationField(deptLocation);
  }, [title, deptLocation]);

  // Password reset state
  const [resetSending, setResetSending] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Branding state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPasswordUser = user?.providerData?.some(
    (p) => p.providerId === "password"
  );

  async function handleSaveDisplayName(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    const trimmedName = displayName.trim();
    if (!trimmedName || trimmedName === user.displayName) return;

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await updateProfile(user, { displayName: trimmedName });
      await refreshUser();
      setSuccess("Display name updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveProfileSettings(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSavingProfile(true);

    try {
      await updateProfileSettings({
        title: titleField.trim() || null,
        deptLocation: deptLocationField.trim() || null,
      });
      setSuccess("Profile settings updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update profile settings."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleResetPassword() {
    if (!user?.email) return;

    setError("");
    setSuccess("");
    setResetSending(true);
    setResetSuccess(false);

    try {
      await resetPassword(user.email);
      setResetSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send reset email."
      );
    } finally {
      setResetSending(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";

    setError("");
    setSuccess("");
    setUploadingLogo(true);

    try {
      const storage = getFirebaseStorage();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `branding/${user.uid}/${Date.now()}_${safeName}`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      await updateLogoUrl(downloadUrl);
      setSuccess("Company logo updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload logo."
      );
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleRemoveLogo() {
    setError("");
    setSuccess("");
    setRemovingLogo(true);

    try {
      await updateLogoUrl(null);
      setSuccess("Company logo removed.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove logo."
      );
    } finally {
      setRemovingLogo(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
        <p className="text-sm text-gray-500">
          Manage your profile and preferences
        </p>
      </header>

      <div className="max-w-2xl space-y-6">
        {/* Global feedback */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Branding Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <ImageIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800">
              Company Branding
            </h3>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Upload your company logo. It will appear in the top-left corner of
            the sidebar.
          </p>

          {/* Logo preview */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center min-h-[80px]">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Company logo"
                width={200}
                height={60}
                className="max-h-14 w-auto object-contain"
                unoptimized
              />
            ) : (
              <div className="text-center">
                <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-400">No logo uploaded</p>
              </div>
            )}
          </div>

          {/* Upload / Remove buttons */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              loading={uploadingLogo}
            >
              <Upload className="w-3.5 h-3.5" />
              {logoUrl ? "Replace Logo" : "Upload Logo"}
            </Button>
            {logoUrl && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleRemoveLogo}
                loading={removingLogo}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </Button>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Recommended: PNG or SVG, max 200 x 60px. Accepts PNG, JPEG, SVG, or
            WebP.
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800">Profile</h3>
          </div>

          {/* Avatar display */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xl">
              {user?.displayName?.charAt(0)?.toUpperCase() ||
                user?.email?.charAt(0)?.toUpperCase() ||
                "?"}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {user?.displayName || "User"}
              </p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          {/* Display Name form */}
          <form onSubmit={handleSaveDisplayName} className="space-y-4">
            <Input
              id="displayName"
              label="Display Name"
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                loading={saving}
                disabled={
                  !displayName.trim() ||
                  displayName.trim() === (user?.displayName || "")
                }
              >
                Save Changes
              </Button>
            </div>
          </form>

          {/* Title & Dept/Location form */}
          <form onSubmit={handleSaveProfileSettings} className="space-y-4 mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              These fields will auto-populate in new expense reports.
            </p>
            <Input
              id="title"
              label="Title"
              type="text"
              placeholder="e.g. Director"
              value={titleField}
              onChange={(e) => setTitleField(e.target.value)}
            />
            <Input
              id="deptLocation"
              label="Dept / Location"
              type="text"
              placeholder="e.g. Remote - SC"
              value={deptLocationField}
              onChange={(e) => setDeptLocationField(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                loading={savingProfile}
                disabled={
                  (titleField.trim() || "") === (title || "") &&
                  (deptLocationField.trim() || "") === (deptLocation || "")
                }
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>

        {/* Email Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800">
              Email Address
            </h3>
          </div>
          <Input
            id="email"
            label="Email"
            type="email"
            value={user?.email || ""}
            disabled
            className="bg-gray-50"
          />
          <p className="text-xs text-gray-400 mt-2">
            Email address cannot be changed from this page. Contact support if
            you need to update it.
          </p>
        </div>

        {/* Password Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800">Password</h3>
          </div>

          {!isPasswordUser ? (
            <p className="text-sm text-gray-500">
              You signed in with Google. Password management is handled through
              your Google account.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                We&apos;ll send a password reset link to your email address.
              </p>
              {resetSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Password reset email sent to{" "}
                  <strong>{user?.email}</strong>. Check your inbox.
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetPassword}
                loading={resetSending}
                disabled={resetSuccess}
              >
                {resetSuccess ? "Reset Email Sent" : "Send Reset Link"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
