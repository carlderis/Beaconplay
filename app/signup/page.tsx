"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import AuthForm from "@/components/AuthForm";

export default function SignupPage() {
  const { user, loading, signUp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <AuthForm submitLabel="Sign Up" onSubmit={signUp} />
      <p className="text-sm text-white/60">
        Already have an account?{" "}
        <Link href="/login" className="text-white underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
