import { redirect } from "next/navigation";
import { AccountPage } from "@/components/account-page";
import { getCurrentUserOptional, isAdmin } from "@/lib/auth";
import { listAuditLogs } from "@/lib/services/audit";
import { getBillingState } from "@/lib/services/billing";
import { getRuntimeSettings } from "@/lib/services/runtime-settings";
import { getProviderSettings } from "@/lib/services/settings";
import { listStudyActivity } from "@/lib/services/study-history";
import { listManagedUsers } from "@/lib/services/users";

export default async function AccountRoute() {
  const user = await getCurrentUserOptional();
  if (!user) redirect("/auth");

  const settings = await getProviderSettings(user.id);
  const billing = await getBillingState(user.id);
  const activity = await listStudyActivity(user.id, 12);
  const admin = isAdmin(user)
    ? {
        runtime: await getRuntimeSettings(),
        users: await listManagedUsers(),
        logs: await listAuditLogs(40)
      }
    : null;

  return <AccountPage user={user} initialSettings={settings} initialBilling={billing} initialAdmin={admin} initialActivity={activity} />;
}
