-- Insertion du pack Standard pour la société Zazatiana
-- Prix du pack : 250.000 Ar

-- 1. Créer le pack
INSERT INTO packs (nom, description, prix, company_id)
VALUES (
  'Pack Standard',
  'Pack standard bébé (13 articles)',
  250000,
  (SELECT id FROM companies WHERE slug = 'zazatiana' LIMIT 1)
);

-- 2. Ajouter les produits du pack
INSERT INTO pack_produits (pack_id, produit_id, quantite) VALUES
  ((SELECT id FROM packs WHERE nom = 'Pack Standard' LIMIT 1), 1, 1),   -- NOUNOURS
  ((SELECT id FROM packs WHERE nom = 'Pack Standard' LIMIT 1), 33, 1),  -- PELUCHE 6 PIECE
  ((SELECT id FROM packs WHERE nom = 'Pack Standard' LIMIT 1), 9, 1),   -- DOUDOUNE TSARA (pull doudoune)
  ((SELECT id FROM packs WHERE nom = 'Pack Standard' LIMIT 1), 31, 1),  -- LAFIKA IMPORTE (DODO BE)
  ((SELECT id FROM packs WHERE nom = 'Pack Standard' LIMIT 1), 60, 1),  -- LAMBAN-JAZA POLAIRE
  ((SELECT id FROM packs WHERE nom = 'Pack Standard' LIMIT 1), 12, 1),  -- COUCHE 6 PIECES
  ((SELECT id FROM packs WHERE nom = 'Pack Standard' LIMIT 1), 73, 1),  -- BAVOIR IMPORTE DETAIL
  ((SELECT id FROM packs WHERE nom = 'Pack Standard' LIMIT 1), 69, 1),  -- BODOFOTSY SIMPLE
  ((SELECT id FROM packs WHERE nom = 'Pack Standard' LIMIT 1), 23, 2),  -- BRASSIERE 3P MANIFY × 2
  ((SELECT id FROM packs WHERE nom = 'Pack Standard' LIMIT 1), 22, 1),  -- BRASSIERE CULOTTE (2P)
  ((SELECT id FROM packs WHERE nom = 'Pack Standard' LIMIT 1), 41, 1),  -- CHAUSSETTE 3D
  ((SELECT id FROM packs WHERE nom = 'Pack Standard' LIMIT 1), 2, 1),   -- DOUDOUNE
  ((SELECT id FROM packs WHERE nom = 'Pack Standard' LIMIT 1), 81, 1);  -- SORTIE DE BAIN
