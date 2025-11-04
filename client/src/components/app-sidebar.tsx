import { Home, Users, Building2, BarChart3, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/lib/utils";
import logoUrl from "@assets/LOGO 7º BIS_1761200936316.png";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAdmin, isManager } = useAuth();

  const mainItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
    },
    {
      title: "Efetivo",
      url: "/militares",
      icon: Users,
    },
    {
      title: "Companhias",
      url: "/companhias",
      icon: Building2,
    },
    {
      title: "Relatórios",
      url: "/relatorios",
      icon: BarChart3,
    },
  ];

  const adminItems = [
    {
      title: "Administração",
      url: "/admin",
      icon: Settings,
    },
  ];

  const getRoleBadge = (role: string | undefined) => {
    if (role === "administrator") return <Badge variant="default" className="text-xs">Admin</Badge>;
    if (role === "manager") return <Badge variant="secondary" className="text-xs">Gerente</Badge>;
    return <Badge variant="outline" className="text-xs">Usuário</Badge>;
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="7º BIS" className="h-12 w-12 object-contain flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-xs text-sidebar-foreground truncate leading-tight">
              SIGE-MIL
            </h2>
            <p className="text-xs text-muted-foreground leading-tight">C Fron RR/ 7º BIS</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAdmin || isManager) && (
          <SidebarGroup>
            <SidebarGroupLabel>Gerenciamento</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(`${user?.firstName} ${user?.lastName}`)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <div className="flex items-center gap-2">
              {getRoleBadge(user?.role)}
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
