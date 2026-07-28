delete from public.catalog_stock_overrides
where lower(code) in ('c53s654118', 'epson c53s654118')
   or lower(supplier_code) in ('c53s654118', 'epson c53s654118');

notify pgrst, 'reload schema';
