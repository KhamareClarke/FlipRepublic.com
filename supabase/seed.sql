insert into categories (name, slug, image, tagline)
values
  ('Trainers', 'trainers', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', 'Performance meets rarity'),
  ('Streetwear', 'streetwear', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80', 'Culture. Scarcity. Demand.'),
  ('Luxury', 'luxury', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80', 'Timeless assets, not accessories')
on conflict (slug) do nothing;

insert into trust_pillars (title, description)
values
  ('Authentication Guarantee', 'Every item verified by industry experts before listing'),
  ('Curated Sellers', 'Invitation-only marketplace for trusted vendors'),
  ('Secure Transactions', 'Protected payments with buyer guarantee'),
  ('White Glove Service', 'Premium packaging and insured shipping')
on conflict do nothing;
