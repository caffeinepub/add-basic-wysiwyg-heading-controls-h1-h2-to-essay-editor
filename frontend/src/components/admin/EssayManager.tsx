import { useState } from 'react';
import { useGetAllEssaysForAdmin, useDeleteEssay } from '../../hooks/useQueries';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import EssayEditor from './EssayEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import type { Essay } from '../../backend';

export default function EssayManager() {
  const { data: essays, isLoading } = useGetAllEssaysForAdmin();
  const deleteEssay = useDeleteEssay();
  const [editingEssay, setEditingEssay] = useState<Essay | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<bigint | null>(null);

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleDelete = async (id: bigint) => {
    await deleteEssay.mutateAsync(id);
    setDeleteConfirm(null);
  };

  if (isCreating || editingEssay) {
    return (
      <EssayEditor
        essay={editingEssay}
        onClose={() => {
          setIsCreating(false);
          setEditingEssay(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Essays</h2>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Essay
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading essays...</p>
      ) : essays && essays.length > 0 ? (
        <div className="space-y-4">
          {essays.map((essay) => (
            <Card key={essay.id.toString()}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle>{essay.title}</CardTitle>
                      <Badge variant={essay.isPublished ? 'default' : 'outline'}>
                        {essay.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{essay.subtitle}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{formatDate(essay.publishDate)}</span>
                      {essay.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{essay.tags.join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingEssay(essay)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(essay.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No essays yet. Create your first one!</p>
      )}

      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Essay</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this essay? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
