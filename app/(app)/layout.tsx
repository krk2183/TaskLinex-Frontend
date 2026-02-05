import Sidebar from '@/components/SideBar';
import { LayoutProvider } from '@/components/LayoutContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutProvider>
      <div className="flex flex-col md:flex-row h-screen bg-gray-100 dark:bg-gray-950">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </LayoutProvider>
  );
}