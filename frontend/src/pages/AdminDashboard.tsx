import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useIsAdmin } from '../hooks/useQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import PageEditor from '../components/admin/PageEditor';
import EssayManager from '../components/admin/EssayManager';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading } = useIsAdmin();

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto px-6 py-16">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container max-w-6xl mx-auto px-6 py-16">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-6 py-16">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate({ to: '/' })} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Site
        </Button>
        <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
      </div>

      <Tabs defaultValue="pages" className="space-y-8">
        <TabsList>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="essays">Essays</TabsTrigger>
        </TabsList>

        <TabsContent value="pages">
          <PageEditor />
        </TabsContent>

        <TabsContent value="essays">
          <EssayManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
