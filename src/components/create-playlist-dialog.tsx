import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLibrary } from "@/store/library";

export function CreatePlaylistDialog({
  trigger,
  onCreated,
}: {
  trigger?: React.ReactNode;
  onCreated?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createPlaylist = useLibrary((s) => s.createPlaylist);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const label = name.trim() || "New Playlist";
    const id = createPlaylist(label, description.trim());
    setName("");
    setDescription("");
    setOpen(false);
    toast.success(`"${label}" created`);
    onCreated?.(id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/15 hover:bg-white/15 transition-colors">
            <Plus className="h-4 w-4" />
            Create playlist
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-panel border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New playlist</DialogTitle>
          <DialogDescription className="text-white/55">
            Give it a name now — you can add tracks from anywhere in Reson8.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pl-name">Name</Label>
            <Input
              id="pl-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Late night drive"
              className="bg-white/[0.06] border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-desc">Description</Label>
            <Textarea
              id="pl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              rows={2}
              className="bg-white/[0.06] border-white/10 resize-none"
            />
          </div>
          <DialogFooter>
            <button
              type="submit"
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
            >
              Create
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
