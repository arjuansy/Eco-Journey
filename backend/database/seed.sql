INSERT INTO public.routes_schedules
  (origin_city, destination_city, departure_date, departure_time, arrival_time, base_price, map_coord_x, map_coord_y, image_url)
VALUES
  ('Malang','Surabaya',CURRENT_DATE + 1,'07:00','09:30',85000,35,55,'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80'),
  ('Surabaya','Yogyakarta',CURRENT_DATE + 2,'08:30','15:30',220000,55,38,'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=700&q=80'),
  ('Malang','Batu',CURRENT_DATE + 1,'12:00','12:45',65000,28,48,'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=700&q=80'),
  ('Banyuwangi','Malang',CURRENT_DATE + 3,'06:00','12:00',180000,72,62,'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=700&q=80')
ON CONFLICT (origin_city, destination_city, departure_date, departure_time) DO NOTHING;

INSERT INTO public.vehicles (vehicle_name, vehicle_type, total_seats, amenities, image_url, price_modifier)
VALUES
  ('Executive HiAce Commuter','Executive Van',12,'["AC","Reclining Seat","USB Charger","Bagasi Luas"]'::JSONB,'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=700&q=80',25000),
  ('Luxury Minivan','Luxury Van',8,'["AC","Wi-Fi","Reclining Seat"]'::JSONB,'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=700&q=80',50000),
  ('Eco Shuttle Bus','Eco Shuttle',20,'["AC","Wi-Fi","Bagasi Luas"]'::JSONB,'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=700&q=80',15000)
ON CONFLICT (vehicle_name) DO NOTHING;

INSERT INTO public.drivers (driver_name, photo_url, rating, total_trip_quota, remaining_trip_quota)
VALUES
  ('Raka Pratama','https://i.pravatar.cc/120?img=12',4.9,3,3),
  ('Dimas Saputra','https://i.pravatar.cc/120?img=11',4.8,3,1),
  ('Arif Nugraha','https://i.pravatar.cc/120?img=8',4.7,3,0)
ON CONFLICT (driver_name) DO NOTHING;
