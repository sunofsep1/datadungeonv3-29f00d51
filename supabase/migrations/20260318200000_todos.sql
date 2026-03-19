-- To-do list items (user-scoped, simple checklist)
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own todos" ON public.todos;
CREATE POLICY "Users can view their own todos"
  ON public.todos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own todos" ON public.todos;
CREATE POLICY "Users can insert their own todos"
  ON public.todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own todos" ON public.todos;
CREATE POLICY "Users can update their own todos"
  ON public.todos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;
CREATE POLICY "Users can delete their own todos"
  ON public.todos FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_todos_updated_at ON public.todos;
CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_user_sort ON public.todos(user_id, sort_order);
