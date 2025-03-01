import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { Trash, MapPin, Coins, Home } from "lucide-react";

const sidebarItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "reports", icon: MapPin, label: "Report waste" },
  { href: "collect", icon: Trash, label: "Collect waste" },
  { href: "rewards", icon: Coins, label: "Rewards" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void; // Function to close sidebar
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 w-64 bg-white border-r pt-20 text-gray-800 border-gray-200 z-30
         transform-transition transition-all duration-300 ease-in-out lg:translate-x-0 ${
           open ? "translate-x-0" : "-translate-x-full"
         }`}
    >
      <nav className='flex h-full flex-col justify-between'>
        <div className='px-4 py-6 space-x-8'>
          {sidebarItems.map((item) => (
            <Link key={item.href} href={item.href} passHref>
              <Button
                variant={item.href === pathname ? "secondary" : "ghost"}
                className={`w-full justify-start flex items-center space-x-4 py-3 px-4 rounded-md transition-colors
              ${pathname === item.href ? "bg-gray-100 text-primary" : ""}
              `}
                onClick={onClose}
              >
                <item.icon className='mr-3 h-5 w-5' />
                <span className='text-base'>{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}
