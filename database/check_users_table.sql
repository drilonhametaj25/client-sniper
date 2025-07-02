-- Query per verificare le colonne della tabella users
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'users'
ORDER BY 
  ordinal_position;
