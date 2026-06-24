import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

export default function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
