"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <AuthForm submitLabel="Sign In" onSubmit={signIn} />
      <p className="text-sm text-white/60">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-white underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
