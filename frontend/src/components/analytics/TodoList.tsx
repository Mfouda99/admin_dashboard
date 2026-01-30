import { useEffect, useMemo, useState } from "react";

type ApiTask = {
  id: string; // uuid
  coach_id: number;
  text: string;
  done: boolean;
  created_at?: string;
  updated_at?: string;
};

type TodoListProps = {
  coachId: number;
};

async function http<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Request failed (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export default function TodoList({ coachId }: TodoListProps) {
  const [todos, setTodos] = useState<ApiTask[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => todos.filter((t) => !t.done).length,
    [todos]
  );

  //  endpoints
  const LIST_URL = `/tasks-api/coaches/${coachId}/tasks`;
  const DETAIL_URL = (taskId: string) =>
    `/tasks-api/coaches/${coachId}/tasks/${taskId}`;

  // Load tasks when coach changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const data = await http<ApiTask[]>(LIST_URL);
        if (!cancelled) setTodos(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load tasks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (coachId) load();

    return () => {
      cancelled = true;
    };
  }, [coachId, LIST_URL]);

  const addTask = async () => {
    const text = title.trim();
    if (!text) return;

    setSaving(true);
    setErr(null);

    try {
      const created = await http<ApiTask>(LIST_URL, {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      setTodos((prev) => [created, ...prev]);
      setTitle("");
    } catch (e: any) {
      setErr(e?.message || "Failed to add task");
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task: ApiTask) => {
    const nextDone = !task.done;

    // optimistic
    setTodos((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: nextDone } : t))
    );

    try {
      await http<ApiTask>(DETAIL_URL(task.id), {
        method: "PATCH",
        body: JSON.stringify({ done: nextDone }),
      });
    } catch (e: any) {
      // rollback
      setTodos((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t))
      );
      setErr(e?.message || "Failed to update task");
    }
  };

  const deleteTask = async (taskId: string) => {
    const snapshot = todos;
    setTodos((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await http<void>(DETAIL_URL(taskId), { method: "DELETE" });
    } catch (e: any) {
      setTodos(snapshot);
      setErr(e?.message || "Failed to delete task");
    }
  };

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") addTask();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-[#442F73]">Today's Tasks</h3>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
          Pending {pendingCount}
        </span>
      </div>

      {err && (
        <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {err}
        </div>
      )}

      <div className="space-y-2 flex-1 overflow-y-auto custom-scroll">
        {loading ? (
          <div className="text-sm text-gray-500">Loading tasks...</div>
        ) : todos.length === 0 ? (
          <div className="text-sm text-gray-400">No tasks yet.</div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`p-3 rounded-lg flex items-center justify-between gap-3 ${
                todo.done ? "bg-gray-100" : "bg-[#F9F5FF]"
              }`}
            >
              <div className="min-w-0 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => toggleTask(todo)}
                />
                <span
                  className={`text-sm truncate ${
                    todo.done ? "line-through text-gray-500" : "text-gray-800"
                  }`}
                  title={todo.text}
                >
                  {todo.text}
                </span>
              </div>

              <button
                onClick={() => deleteTask(todo.id)}
                className="text-xs text-gray-500 hover:text-red-600 transition shrink-0"
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={onEnter}
          placeholder="New task..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          disabled={saving}
        />
        <button
          onClick={addTask}
          disabled={saving}
          className="px-4 rounded-lg bg-gradient-to-r from-[#cea769] to-[#b27715] text-white text-sm disabled:opacity-60"
        >
          {saving ? "Saving..." : "Add"}
        </button>
      </div>
    </div>
  );
}
