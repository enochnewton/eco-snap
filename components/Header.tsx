// @ts-check
"use client";

import Link from "next/link";
import {
  Menu,
  Coins,
  Leaf,
  Search,
  Bell,
  User,
  ChevronDown,
  LogIn,
  LogOut,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";

import { use, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  createUser,
  getUnreadNotifications,
  getUserBalance,
  getUserByEmail,
  markNotificationAsRead,
} from "@/utils/db/actions";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  auth,
  provider as googleProvider,
  signInWithPopup,
  signOut,
} from "@/utils/db/firebase";

interface HeaderProps {
  onMenuClick: () => void;
  totalEarnings: number;
}

export default function Header({ onMenuClick, totalEarnings }: HeaderProps) {
  const [provider, setProvider] = useState<any>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [notification, setNotification] = useState<Notification[]>([]);
  const [balance, setBalance] = useState(0);

  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Initialize Firebase Authentication
  useEffect(() => {
    const init = async () => {
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          setProvider(auth); // Firebase auth as provider
          setLoggedIn(true);
          setUserInfo(user);
          console.log("User info:", user);

          if (user.email) {
            localStorage.setItem("userEmail", user.email);
            console.log("User email:", user.email);
            try {
              await createUser(
                user.email,
                user.displayName || "Anonymous user"
              );
            } catch (error) {
              console.error("Error creating user", error);
            }
          }
        } else {
          setProvider(null);
          setLoggedIn(false);
          setUserInfo(null);
          localStorage.removeItem("userEmail");
        }
        setLoading(false);
      });
    };

    init();
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (userInfo?.email) {
        const user = await getUserByEmail(userInfo.email);
        if (user) {
          const unreadNotifications = await getUnreadNotifications(user.id);
          setNotification(unreadNotifications);
        }
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userInfo]);

  // Fetch user balance
  useEffect(() => {
    const fetchUserBalance = async () => {
      if (userInfo?.email) {
        const user = await getUserByEmail(userInfo.email);
        if (user) {
          const userBalance = await getUserBalance(user.id);
          setBalance(userBalance);
        }
      }
    };

    fetchUserBalance();
    const handleBalanceUpdate = (event: CustomEvent) =>
      setBalance(event.detail);
    window.addEventListener(
      "balanceUpdate",
      handleBalanceUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "balanceUpdate",
        handleBalanceUpdate as EventListener
      );
    };
  }, [userInfo]);

  // Login Function (Now uses Firebase)
  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      setProvider(auth);
      setLoggedIn(true);
      setUserInfo(user);

      if (user.email) {
        localStorage.setItem("userEmail", user.email);
        try {
          await createUser(user.email, user.displayName || "Anonymous user");
        } catch (error) {
          console.error("Error creating user", error);
        }
      }
    } catch (error) {
      console.error("Error logging in", error);
    }
  };

  // Logout Function (Now uses Firebase)
  const logout = async () => {
    try {
      await signOut(auth);
      setProvider(null);
      setLoggedIn(false);
      setUserInfo(null);
      localStorage.removeItem("userEmail");
    } catch (error) {
      console.error("Error logging out", error);
    }
  };

  // Get User Info Function (Now uses Firebase)
  const getUserInfo = async () => {
    if (auth.currentUser) {
      const user = auth.currentUser;
      setUserInfo(user);

      if (user.email) {
        localStorage.setItem("userEmail", user.email);
        try {
          await createUser(user.email, user.displayName || "Anonymous user");
        } catch (error) {
          console.error("Error creating user", error);
        }
      }
    }
  };

  // Handle Notification Click
  const handleNotificationClick = async (notificationId: number) => {
    await markNotificationAsRead(notificationId);
  };

  // Show Loading State
  if (loading) return <div>Loading authentication...</div>;

  return (
    <header className='bg-white border-b border-gray-200 sticky top-0 z-50'>
      <div className='flex items-center justify-between px-4 py-2 h-18'>
        <div className='flex items-center'>
          <Button
            variant='ghost'
            size='icon'
            className='mr-2 md:mr-4'
            onClick={onMenuClick}
          >
            <Menu className='h-6 w-6 text-gray-800' />
          </Button>
          <Link href='/' className='flex items-center'>
            <Leaf className='h-6 w-6 md:h-8 md:w-8 text-green-500 mr-1 md:mr-2' />
            <span className='font-bold text-base md:text-lg to-gray-800'>
              Eco Snap
            </span>
          </Link>
        </div>

        {/* notification */}
        <div className='flex items-center'>
          {isMobile && (
            <Button className='mr-2' variant='ghost' size={"icon"}>
              <Search className='h-5 w-5' />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={"ghost"} size={"icon"} className='mr-2 relative'>
                <Bell className='h-6 w-6 text-gray-800' />
                {notification.length > 0 && (
                  <Badge className='absolute -top-1 -right-1 px-1 min-w-[1.5rem] h-5'>
                    {notification.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-64'>
              {notification.length > 0 ? (
                notification.map((notification: any) => (
                  <DropdownMenuItem
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div className='flex flex-col'>
                      <span className='font-medium'>{notification.type}</span>
                      <span className='text-sm text-gray-500'>
                        {notification.message}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem>
                  <span className='text-sm text-gray-500'>
                    No new notifications
                  </span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className='mr-2 md:mr-4 flex items-center bg-gray-100 rounded-full px-2 md:px-3 py-1'>
            <Coins className='h-4 w-4 md:h-5 md:w-5 text-green-500 mr-1' />
            <span className='text-gray-800 font-semibold text-sm md:text-base'>
              {balance.toFixed(2)}
            </span>
          </div>

          {!loggedIn ? (
            <Button
              onClick={login}
              variant='outline'
              className='bg-green-600 hover:bg-green-700 text-white text-sm md:text-base'
            >
              Login
              <LogIn className='h-4 w-4 md:h-6 md:w-6 md:ml-2 ml-1' />
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='items-center flex'
                >
                  <User className='h-6 w-6 mr-1 text-gray-800' />
                  <ChevronDown className='h-4 w-4 text-gray-800' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-64'>
                <DropdownMenuItem onClick={getUserInfo}>
                  {userInfo ? userInfo.name : "Profile"}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href='/settings'>Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  Logout
                  <LogOut className='h-4 w-4 ml-1' />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
