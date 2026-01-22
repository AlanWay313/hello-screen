'use client'

import { Dashboard } from "@/components/dashboard";
import { TitlePage } from "@/components/title";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <TitlePage title="Dashboard" />
      <Dashboard />
    </div>
  );
}
