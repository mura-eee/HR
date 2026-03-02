"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const { data: session } = useSession();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge variant="destructive">管理者</Badge>;
      case "MANAGER":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">マネージャー</Badge>;
      default:
        return <Badge variant="secondary">一般</Badge>;
    }
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <div>
        {/* Page title will be set by each page */}
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
        </Button>

        {session?.user && (
          <div className="flex items-center gap-3">
            {getRoleBadge(session.user.role)}
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                {session.user.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </header>
  );
}
