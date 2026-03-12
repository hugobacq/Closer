import BottomNav from "@/components/BottomNav";
import AutoRefreshListener from "@/components/AutoRefreshListener";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AutoRefreshListener />
      {children}
      <BottomNav />
    </>
  );
}
