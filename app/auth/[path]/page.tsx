import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  if (
    ![
      "sign-in",
      "sign-up",
      "verify-email",
      "forgot-password",
      "reset-password",
    ].includes(path)
  )
    notFound();
  return (
    <Suspense>
      <AuthForm mode={path} />
    </Suspense>
  );
}
