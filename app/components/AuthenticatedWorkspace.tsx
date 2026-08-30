import { type Locale } from "@/lib/i18n";
import { PdfExperience } from "./PdfExperience";
import { WorkspaceShell } from "./WorkspaceShell";

export function AuthenticatedWorkspace({
  locale,
  userEmail,
}: Readonly<{
  locale: Locale;
  userEmail: string;
}>) {
  return (
    <WorkspaceShell locale={locale} userEmail={userEmail}>
      <PdfExperience locale={locale} />
    </WorkspaceShell>
  );
}
