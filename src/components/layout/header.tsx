"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell, Building2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompany } from "@/components/providers/company-provider";

export default function Header() {
  const { data: session } = useSession();
  const { companies, selectedCompanyId, selectedCompanyName, setCompany } = useCompany();

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
      {/* 会社切り替えドロップダウン */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2 h-9 px-3 font-medium">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="max-w-[200px] truncate">{selectedCompanyName}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem
            onClick={() => setCompany(null)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="font-medium">トキトグループ</span>
              <Badge variant="secondary" className="text-xs ml-1">全社</Badge>
            </div>
            {selectedCompanyId === null && <Check className="w-4 h-4 text-blue-600" />}
          </DropdownMenuItem>

          {companies.length > 0 && <DropdownMenuSeparator />}

          {companies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              onClick={() => setCompany(company.id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="truncate">{company.name}</span>
              {selectedCompanyId === company.id && <Check className="w-4 h-4 text-blue-600" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

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
