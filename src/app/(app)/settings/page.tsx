
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrganizationSettingsForm from "@/components/settings/OrganizationSettingsForm";
import ActionLogTable from "@/components/settings/ActionLogTable";
import { Building, ListCollapse } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization's details and view application activity.
        </p>
      </div>

      <Tabs defaultValue="organization" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:max-w-md">
          <TabsTrigger value="organization">
            <Building className="mr-2 h-4 w-4 sm:inline hidden" /> Organization
          </TabsTrigger>
          <TabsTrigger value="action-log">
            <ListCollapse className="mr-2 h-4 w-4 sm:inline hidden" /> Action Log
          </TabsTrigger>
        </TabsList>
        <TabsContent value="organization" className="mt-6">
          <OrganizationSettingsForm />
        </TabsContent>
        <TabsContent value="action-log" className="mt-6">
          <ActionLogTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
