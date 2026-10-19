import { Heart, MoreHorizontal, ListPlus, ListEnd, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Track } from "@/lib/mock-library";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";

export function LikeButton({ track, className = "" }: { track: Track; className?: string }) {
  const liked = useLibrary((s) => s.liked.includes(track.id));
  const toggleLike = useLibrary((s) => s.toggleLike);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleLike(track.id);
        toast(liked ? "Removed from Liked Songs" : "Added to Liked Songs");
      }}
      aria-label={liked ? "Unlike" : "Like"}
      className={`grid place-items-center rounded-full transition-colors ${
        liked ? "text-[#ff4fd8]" : "text-white/45 hover:text-white"
      } ${className}`}
    >
      <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} />
    </button>
  );
}

export function TrackMenu({ track, inPlaylistId }: { track: Track; inPlaylistId?: string }) {
  const playlists = useLibrary((s) => s.playlists);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);
  const removeFromPlaylist = useLibrary((s) => s.removeFromPlaylist);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const playNext = usePlayer((s) => s.playNext);
  const addToQueue = usePlayer((s) => s.addToQueue);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          aria-label={`More options for ${track.title}`}
          className="grid place-items-center h-8 w-8 rounded-full text-white/45 hover:text-white hover:bg-white/10 transition-colors"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-panel w-56 border-white/10 text-white">
        <DropdownMenuItem
          onClick={() => {
            playNext(track);
            toast("Playing next");
          }}
        >
          <ListPlus className="mr-2 h-4 w-4" /> Play next
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            addToQueue(track);
            toast("Added to queue");
          }}
        >
          <ListEnd className="mr-2 h-4 w-4" /> Add to queue
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Plus className="mr-2 h-4 w-4" /> Add to playlist
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="glass-panel max-h-64 overflow-y-auto border-white/10 text-white">
            <DropdownMenuItem
              onClick={() => {
                const id = createPlaylist(track.album, `Started from ${track.title}`, [track.id]);
                toast.success("Playlist created");
                return id;
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New playlist
            </DropdownMenuItem>
            {playlists.length > 0 && <DropdownMenuSeparator className="bg-white/10" />}
            {playlists.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => {
                  addToPlaylist(p.id, track.id);
                  toast.success(`Added to ${p.name}`);
                }}
              >
                <span className="truncate">{p.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {inPlaylistId && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              className="text-red-300 focus:text-red-200"
              onClick={() => {
                removeFromPlaylist(inPlaylistId, track.id);
                toast("Removed from playlist");
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Remove from this playlist
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
