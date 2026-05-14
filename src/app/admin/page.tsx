import type { Metadata } from "next";
import { AdminDashboard } from "@/app/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Cyclos Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
