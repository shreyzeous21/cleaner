import {
  Archive,
  Copy,
  FileSearch,
  Globe,
  HardDrive,
  LayoutDashboard,
  PackageOpen,
  Rocket,
  ScanLine,
  Sparkles,
  Wrench,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type NavId =
  | "dashboard"
  | "smart"
  | "storage"
  | "large"
  | "duplicates"
  | "browsers"
  | "old"
  | "startup"
  | "apps"
  | "tools";

const ITEMS: { id: NavId; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
  { id: "smart", label: "Smart Scan", icon: <ScanLine /> },
  { id: "storage", label: "Storage", icon: <HardDrive /> },
  { id: "large", label: "Large Files", icon: <FileSearch /> },
  { id: "duplicates", label: "Duplicates", icon: <Copy /> },
  { id: "browsers", label: "Browsers", icon: <Globe /> },
  { id: "old", label: "Old Files", icon: <Archive /> },
  { id: "startup", label: "Startup Apps", icon: <Rocket /> },
  { id: "apps", label: "Apps", icon: <PackageOpen /> },
  { id: "tools", label: "Tools", icon: <Wrench /> },
];

export function AppSidebar({
  active,
  onNavigate,
}: {
  active: NavId;
  onNavigate: (id: NavId) => void;
}) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Cleaner</p>
            <p className="text-[11px] text-muted-foreground">PC maintenance</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {ITEMS.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={active === item.id}
                    onClick={() => onNavigate(item.id)}
                    className="h-9 gap-2.5 text-[13px]"
                    data-active={active === item.id}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
          Cleaning moves files to Trash first — nothing is permanently deleted.
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
