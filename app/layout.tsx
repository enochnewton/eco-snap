"use client";

import Header from "@/components/Header";
import "./globals.css";
import { Inter } from "next/font/google";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import Sidebar from "@/components/Sidebar";
import { getAvailableRewards, getUserByEmail } from "@/utils/db/actions";
// import "leaflet/dist/leaflet.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sideBarOpen, setSideBarOpen] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    const fetchTotalEarnings = async () => {
      try {
        const userEmail = localStorage.getItem("userEmail");
        if (userEmail) {
          const user = await getUserByEmail(userEmail);

          if (user) {
            const availableRewards = (await getAvailableRewards(
              user.id
            )) as any;
            setTotalEarnings(availableRewards);
          }
        }
      } catch (error) {
        console.error("Error fetching total earnings:", error);
      }
    };

    fetchTotalEarnings();
  }, []);

  return (
    <html lang='en'>
      <body className={inter.className}>
        <div className='min-h-screen flex flex-col bg-gray-50'>
          {/* header */}
          <Header
            onMenuClick={() => setSideBarOpen(!sideBarOpen)}
            totalEarnings={totalEarnings}
          />
          <div className='flex flex-1'>
            {/* sidebar */}
            <Sidebar open={sideBarOpen} />
            <main className='flex-1 p-4 lg:p-8 ml-0 lg:ml-64 transition-all duration-300'>
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
