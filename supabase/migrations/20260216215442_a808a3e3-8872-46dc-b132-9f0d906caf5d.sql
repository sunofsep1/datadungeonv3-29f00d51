
-- Create vision board items table
CREATE TABLE public.vision_board_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'from-primary/30 to-primary/5 border-primary/40',
  target_date DATE,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vision_board_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vision board items"
  ON public.vision_board_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vision board items"
  ON public.vision_board_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vision board items"
  ON public.vision_board_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vision board items"
  ON public.vision_board_items FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_vision_board_items_updated_at
  BEFORE UPDATE ON public.vision_board_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for vision board images
INSERT INTO storage.buckets (id, name, public) VALUES ('vision-board', 'vision-board', true);

-- Storage policies
CREATE POLICY "Anyone can view vision board images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vision-board');

CREATE POLICY "Users can upload their own vision board images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vision-board' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own vision board images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'vision-board' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own vision board images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vision-board' AND auth.uid()::text = (storage.foldername(name))[1]);
