import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function MarketingShell({ children }: { children: ReactNode }) {
  return <div className="marketing-site"><SiteHeader/>{children}<SiteFooter/></div>;
}
