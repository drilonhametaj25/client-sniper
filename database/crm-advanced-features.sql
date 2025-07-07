-- Aggiungi tabella per commenti CRM e storage bucket per allegati
-- Eseguire questo script per completare le funzionalità CRM avanzate

-- Tabella per commenti e timeline CRM
CREATE TABLE IF NOT EXISTS crm_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'comment', -- comment, status_change, follow_up, attachment, call, email
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_crm_comments_user_lead ON crm_comments(user_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_comments_created_at ON crm_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_crm_comments_type ON crm_comments(type);

-- RLS per sicurezza
ALTER TABLE crm_comments ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di vedere solo i propri commenti
CREATE POLICY "Users can view their own CRM comments" ON crm_comments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CRM comments" ON crm_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CRM comments" ON crm_comments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CRM comments" ON crm_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Crea bucket per storage allegati CRM se non esiste
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-files',
  'crm-files',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
ON CONFLICT (id) DO NOTHING;

-- Policy per storage allegati CRM
CREATE POLICY "Users can upload CRM files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'crm-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view CRM files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'crm-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete CRM files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'crm-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_crm_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_comments_updated_at
  BEFORE UPDATE ON crm_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_comments_updated_at();
