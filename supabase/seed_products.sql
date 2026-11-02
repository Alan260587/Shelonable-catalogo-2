-- =============================================================================
-- SHELÓ NABEL 2026 — SEMILLA DE LOS 33 PRODUCTOS OFICIALES (seed_products.sql)
-- Instrucciones: Ejecuta este script en el SQL Editor de Supabase DESPUÉS de
-- haber ejecutado supabase/schema.sql.
-- Usa ON CONFLICT (key) DO NOTHING para no sobrescribir precios ni imágenes
-- que ya hayas editado en tu base de datos.
-- =============================================================================

insert into public.products (
  key,
  name,
  subtitle,
  description,
  price,
  image_url,
  image_path,
  category,
  page,
  size,
  is_active
)
values
  -- 01. Lo Nuevo en Casa (8 productos)
  (
    'S1701',
    'Baba de Caracol Crema Facial (Versión Viaje)',
    'Crema Facial con Alantoína, Colágeno y Elastina',
    'Todos los beneficios de la alantoína, el colágeno y la elastina. Nuestro clásico favorito ahora en una versión práctica de 100 ml para llevar a todos lados.',
    149.00,
    '/assets/catalog/page_003.jpg',
    '',
    'lo-nuevo-en-casa',
    1,
    '100 ml',
    true
  ),
  (
    'S1703',
    'Agua Termal Facial Hidratante',
    'Rica en Minerales · Hidrata y Nutre la Piel',
    'Hidratación inmediata que ayuda a mantener la comodidad, frescura y el equilibrio natural de tu rostro durante todo el día.',
    199.00,
    '/assets/catalog/page_003.jpg',
    '',
    'lo-nuevo-en-casa',
    1,
    '140 ml',
    true
  ),
  (
    'S1706',
    'Melena de León con Antocianinas',
    'Suplemento Alimenticio para Claridad y Enfoque',
    'Combinación del hongo melena de león y antocianinas del arándano, ingredientes naturales que acompañan tu desempeño mental, enfoque y calma diaria.',
    399.00,
    '/assets/catalog/page_004.jpg',
    '',
    'lo-nuevo-en-casa',
    2,
    '250 g',
    true
  ),
  (
    'S1704',
    'Rhodiola Suplemento Alimenticio',
    'Adaptógeno para Exigencia Física y Mental',
    'Rhodiola es una planta tradicionalmente asociada al bienestar y resistencia durante momentos de alta exigencia física o mental.',
    399.00,
    '/assets/catalog/page_004.jpg',
    '',
    'lo-nuevo-en-casa',
    2,
    '250 g',
    true
  ),
  (
    'S1707',
    'NAD + Colágeno Hidrolizado + Resveratrol',
    'Energía Celular y Protección Antioxidante',
    'Fórmula avanzada con NAD, colágeno hidrolizado, resveratrol y pulpa de frutas deshidratadas para procesos energéticos y cuidado antiedad.',
    579.00,
    '/assets/catalog/page_004.jpg',
    '',
    'lo-nuevo-en-casa',
    2,
    '250 g',
    true
  ),
  (
    'S1708',
    'Triple Extracto de Ajo Concentrado',
    'Ajo Blanco, Ajo Negro y Ajo Japonés',
    'Tres variedades de ajo reunidas en gotas para ofrecer una máxima concentración que impulsa tu equilibrio interno y bienestar cardiovascular.',
    304.00,
    '/assets/catalog/page_005.jpg',
    '',
    'lo-nuevo-en-casa',
    3,
    '30 ml',
    true
  ),
  (
    'S1712',
    'Ciruelo Africano & Sabal',
    'Bienestar Integral del Hombre',
    'Ciruelo africano y sabal en perfecta sinergia para acompañar el bienestar masculino en cada etapa. Presentación en sobres individuales.',
    524.00,
    '/assets/catalog/page_005.jpg',
    '',
    'lo-nuevo-en-casa',
    3,
    '20 sobres de 25 g c/u',
    true
  ),
  (
    'S1705',
    'L-Glutamina en Polvo',
    'Soporte Nutricional y Recuperación Física',
    'Uno de los aminoácidos más abundantes del cuerpo, ideal en periodos de mayor exigencia física para dar soporte adicional a tu nutrición.',
    550.00,
    '/assets/catalog/page_005.jpg',
    '',
    'lo-nuevo-en-casa',
    3,
    '250 g',
    true
  ),

  -- 08. Bienestar desde el Interior (3 productos)
  (
    'S1622',
    'Gotas de Zinc Suplemento Alimenticio',
    'Mineral Esencial de Alta Absorción',
    'Aporta zinc, un mineral esencial que tu cuerpo necesita para el sistema inmune y metabolismo celular.',
    237.00,
    '/assets/catalog/page_008.jpg',
    '',
    'bienestar-interior',
    9,
    '30 ml',
    true
  ),
  (
    'S514',
    'SN-S3 Pasiflora, Melisa y Valeriana',
    'Extracto Herbal Relajante en Gotas',
    'Combinación natural de pasiflora, melisa y valeriana; tu apoyo ideal para relajarte y descansar en los días más intensos.',
    314.00,
    '/assets/catalog/page_008.jpg',
    '',
    'bienestar-interior',
    9,
    '30 ml',
    true
  ),
  (
    'S1623',
    'Polvo con Citrato de Magnesio',
    'Suplemento Alimenticio para Equilibrio Diario',
    'Un aliado esencial para el equilibrio muscular, nervioso y el bienestar diario en práctica presentación en polvo.',
    525.00,
    '/assets/catalog/page_008.jpg',
    '',
    'bienestar-interior',
    9,
    '250 g',
    true
  ),

  -- 42. Cuidado Capilar (2 productos)
  (
    'S731',
    'Shampoo de Cola de Caballo',
    'Nutrición y Crecimiento Capilar',
    'Nutre y fortalece desde la raíz, dejando tu cabello visiblemente más brillante, sedoso y resistente día a día.',
    398.00,
    '/assets/catalog/page_010.jpg',
    '',
    'cuidado-capilar',
    43,
    '950 ml',
    true
  ),
  (
    'S1612',
    'Shampoo de Cebolla y Linaza Antioxidante',
    'Sin Aroma a Cebolla · Cuero Cabelludo Saludable',
    'Cebolla morada y linaza para una limpieza profunda que fortalece desde la raíz y protege el cuero cabelludo de forma natural.',
    158.00,
    '/assets/catalog/page_010.jpg',
    '',
    'cuidado-capilar',
    43,
    '530 ml',
    true
  ),

  -- 64. Familia Baba de Caracol (2 productos)
  (
    'S001',
    'Baba de Caracol Crema Facial Clásica',
    'Producto Estrella · Hidratación y Firmeza',
    'Ideal para una piel hidratada, firme y renovada gracias a su alta concentración de extracto de baba de caracol, colágeno y elastina.',
    304.00,
    '/assets/catalog/page_012.jpg',
    '',
    'familia-baba-caracol',
    65,
    '250 ml',
    true
  ),
  (
    'S161',
    'Baba de Caracol Jabón Facial y Corporal',
    'Producto Estrella · Suavidad Extrema',
    'Limpieza profunda y cuidado reparador en barra para rostro y cuerpo en un solo paso.',
    83.00,
    '/assets/catalog/page_012.jpg',
    '',
    'familia-baba-caracol',
    65,
    '100 g',
    true
  ),

  -- 68. Cuidado Especial Corporal (3 productos)
  (
    'S182',
    'Arándano Shampoo Corporal',
    'Piel Limpia, Fresca y Revitalizada',
    'Gel de baño corporal con extracto de arándano que refresca tu piel y deja un aroma suave y duradero.',
    142.00,
    '/assets/catalog/page_014.jpg',
    '',
    'cuidado-especial-corporal',
    69,
    '530 ml',
    true
  ),
  (
    'S239',
    'Piña Colada Shampoo Corporal',
    'Extracto de Piña y Té Verde',
    'El poder relajante e hidratante del extracto de piña, coco y té verde en un solo baño corporal.',
    142.00,
    '/assets/catalog/page_014.jpg',
    '',
    'cuidado-especial-corporal',
    69,
    '530 ml',
    true
  ),
  (
    'S729',
    'Jabón Artesanal del Bosque',
    'Aceite de Coco y Fragancia de Pino',
    'Barra artesanal con aceite de coco y notas frescas de pino que revitalizan tus sentidos con una sensación energizante.',
    79.00,
    '/assets/catalog/page_014.jpg',
    '',
    'cuidado-especial-corporal',
    69,
    '100 g',
    true
  ),

  -- 84. Cuidado Especial (2 productos)
  (
    'S061',
    'Gel Tópico Therapygel con Mentol',
    'Extracto de Menta Piperita y Alcanfor',
    'Proporciona una sensación refrescante y reconfortante inmediata al contacto con la piel cansada.',
    251.00,
    '/assets/catalog/page_016.jpg',
    '',
    'cuidado-especial',
    85,
    '250 ml',
    true
  ),
  (
    'S060',
    'Hielo Mineral en Spray',
    'Producto Estrella · Especial para Deportistas',
    'Spray refrescante con mentol y eucalipto para una sensación de alivio inmediato después del esfuerzo físico.',
    314.00,
    '/assets/catalog/page_016.jpg',
    '',
    'cuidado-especial',
    85,
    '265 ml',
    true
  ),

  -- 94. Cuidado Especial Ojos y Rostro (3 productos)
  (
    'S115',
    'Desmaquillante Profesional Bifásico',
    'Con Sábila y Manzanilla · Libre de Aceite',
    'Fórmula bifásica suave para desmaquillar ojos y labios a prueba de agua sin irritación.',
    262.00,
    '/assets/catalog/page_018.jpg',
    '',
    'cuidado-ojos-rostro',
    95,
    '130 ml',
    true
  ),
  (
    'S1409',
    'Toallitas Desmaquillantes con Ácido Hialurónico',
    'Ácido Hialurónico, Manzanilla y Agua de Rosas',
    'Ayudan a limpiar el rostro y remover maquillaje e impurezas mientras aportan hidratación y suavidad.',
    146.00,
    '/assets/catalog/page_018.jpg',
    '',
    'cuidado-ojos-rostro',
    95,
    '25 Toallitas',
    true
  ),
  (
    'S704',
    'Agua Micelar Limpieza Profunda',
    'Desmaquilla y Limpia sin Resecar',
    'Elimina maquillaje, impurezas y exceso de grasa dejando el rostro fresco y tonificado.',
    283.00,
    '/assets/catalog/page_018.jpg',
    '',
    'cuidado-ojos-rostro',
    95,
    '140 ml',
    true
  ),

  -- 114. Cosméticos (1 producto)
  (
    'S1403',
    'Pre Base Primer Para Rostro',
    'Minimiza Poros y Líneas de Expresión',
    'Suaviza la textura de la piel antes del maquillaje, prolonga la fijación de la base y deja un acabado sedoso.',
    242.00,
    '/assets/catalog/page_020.jpg',
    '',
    'cosmeticos',
    115,
    '30 g',
    true
  ),

  -- 126. Esencias Corporales (2 productos)
  (
    'S1513',
    'Esencia Corporal Alta Gama Caballero (Azul Profundo)',
    'Familia Olfativa Amaderada Aromática',
    'Perfume de alta gama para caballero con notas frescas y amaderadas de larga duración. Disponible también en Fortaleza (S1514), Pasión (S1515) y Triunfo (S1516).',
    535.00,
    '/assets/catalog/page_022.jpg',
    '',
    'esencias-corporales',
    127,
    '60 ml',
    true
  ),
  (
    'S1509',
    'Esencia Corporal Alta Gama Dama (Vida)',
    'Familia Olfativa Floral Frutal Gourmand',
    'Perfume de alta gama para dama con notas dulces y florales que perduran todo el día. Disponible también en Amor (S1510), Plenitud (S1511) y Momentos (S1512).',
    535.00,
    '/assets/catalog/page_022.jpg',
    '',
    'esencias-corporales',
    127,
    '60 ml',
    true
  ),

  -- 128. Aromaterapia (3 productos)
  (
    'S725',
    'Aceite para Masaje de Hierbas',
    'Vainilla, Limón, Lavanda y Eucalipto',
    'Fórmula con aceites esenciales puros que facilitan el masaje y promueven la relajación profunda.',
    262.00,
    '/assets/catalog/page_024.jpg',
    '',
    'aromaterapia',
    129,
    '140 ml',
    true
  ),
  (
    'S236',
    'Aceite para Masaje RELAX',
    'Bergamota, Ciprés, Canela, Geranio y Jazmín',
    'Mezcla rica en aceites esenciales que deja una sensación de confort, descanso y armonía en la piel.',
    258.00,
    '/assets/catalog/page_024.jpg',
    '',
    'aromaterapia',
    129,
    '140 ml',
    true
  ),
  (
    'S154',
    'Splash Relajante Corporal y Ambiental',
    'Lavanda, Manzanilla, Valeriana y Tila',
    'Loción ligera ideal para rociar sobre la almohada o el cuerpo, creando un ambiente de calma antes de dormir.',
    258.00,
    '/assets/catalog/page_024.jpg',
    '',
    'aromaterapia',
    129,
    '140 ml',
    true
  ),

  -- 132. Línea Infantil (2 productos)
  (
    'S1602',
    'Jabón Neutro para Bebé Sin Aroma',
    'Fórmula Hipoalergénica Facial y Corporal',
    'Barra extra suave sin fragancia añadida para el baño diario de la delicada piel del bebé.',
    63.00,
    '/assets/catalog/page_026.jpg',
    '',
    'linea-infantil',
    133,
    '100 g',
    true
  ),
  (
    'S166',
    'Shampoo Bebé Suavidad y Brillo',
    'Cuidado Delicado con Dispensador',
    'Fórmula suave que ayuda a limpiar y mantener el brillo natural del cabello de tu bebé sin irritar sus ojos.',
    178.00,
    '/assets/catalog/page_026.jpg',
    '',
    'linea-infantil',
    133,
    '500 ml',
    true
  ),

  -- 138. Línea del Hogar (1 producto)
  (
    'S1519',
    'Esencia Ambiental Lavanda con Difusor',
    'Aromaterapia para el Hogar con Varitas de Bambú',
    'Transporta tus sentidos y envuelve los espacios de tu hogar con frescura y tranquilidad de lavanda.',
    419.00,
    '/assets/catalog/page_028.jpg',
    '',
    'linea-hogar',
    139,
    '80 ml',
    true
  ),

  -- 142. Mascotas (1 producto)
  (
    'S1206',
    'Shampoo Mascota Protección Anti-Pulgas',
    'Para Perros y Gatos · Ingredientes Botánicos',
    'Baño natural que limpia, da brillo y huele bien, con extractos botánicos que cuidan y protegen el pelaje de tu mascota.',
    199.00,
    '/assets/catalog/page_030.jpg',
    '',
    'mascotas',
    143,
    '400 ml',
    true
  )
on conflict (key) do nothing;

