import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, GripVertical } from "lucide-react";
import { usePlayer } from "@/store/player";

export function QueuePanel() {
  const queueOpen = usePlayer((s) => s.queueOpen);
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const jumpTo = usePlayer((s) => s.jumpTo);
  const removeFromQueue = usePlayer((s) => s.removeFromQueue);
  const clearQueue = usePlayer((s) => s.clearQueue);
  const setQueueOpen = usePlayer((s) => s.setQueueOpen);

  return (
    <AnimatePresence>
      {queueOpen && (
        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="pointer-events-auto glass-panel mb-3 w-full max-w-5xl rounded-2xl p-4"
        >
          <div className="flex items-center justify-between pb-3">
            <div>
              <h2 className="text-sm font-semibold">Up next</h2>
              <p className="text-[11px] text-white/45">{queue.length} in queue</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearQueue}
                className="rounded-full px-3 py-1.5 text-[11px] text-white/60 ring-1 ring-white/10 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setQueueOpen(false)}
                aria-label="Close queue"
                className="grid place-items-center h-8 w-8 rounded-full text-white/55 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {queue.length === 0 && (
              <p className="py-6 text-center text-sm text-white/45">Queue is empty.</p>
            )}
            {queue.map((t, i) => (
              <div
                key={`${t.id}-${i}`}
                className={`group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.06] ${
                  i === index ? "bg-white/[0.07]" : ""
                }`}
              >
                <GripVertical className="h-3.5 w-3.5 text-white/20" />
                <button onClick={() => jumpTo(i)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <img src={t.cover} alt="" className="h-9 w-9 rounded object-cover ring-1 ring-white/10" />
                  <div className="min-w-0">
                    <div className={`truncate text-[13px] ${i === index ? "text-white font-medium" : "text-white/85"}`}>
                      {t.title}
                    </div>
                    <div className="truncate text-[11px] text-white/45">{t.artist}</div>
                  </div>
                </button>
                {i !== index && (
                  <button
                    onClick={() => removeFromQueue(i)}
                    aria-label={`Remove ${t.title} from queue`}
                    className="opacity-0 group-hover:opacity-100 grid place-items-center h-8 w-8 rounded-full text-white/45 hover:text-white transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
