import { CatalogData } from '../types';

export const INITIAL_CATALOG_DATA: CatalogData = {
  whatsappNumber: '526321037155',
  distributorName: 'Yesenia Jiménez',
  distributorLocation: 'Hermosillo, Sonora',
  lastUpdated: new Date().toISOString(),
  categories: [
    {
      id: 'lo-nuevo-en-casa',
      name: 'Lo Nuevo en Casa',
      pageNumber: '01',
      pdfPage: 3,
      color: '#57B3E4',
      imageUrl: '/assets/catalog/page_004.jpg',
      description: 'Lanzamientos 2026: suplementos de última generación y clásicos en presentaciones prácticas.'
    },
    {
      id: 'bienestar-interior',
      name: 'Bienestar desde el Interior',
      pageNumber: '08',
      pdfPage: 10,
      color: '#E37C4B',
      imageUrl: '/assets/catalog/page_007.jpg',
      description: 'Nutrición avanzada, extractos botánicos, vitaminas y minerales para el equilibrio diario.'
    },
    {
      id: 'cuidado-capilar',
      name: 'Cuidado Capilar',
      pageNumber: '42',
      pdfPage: 44,
      color: '#1A968A',
      imageUrl: '/assets/catalog/page_009.jpg',
      description: 'Shampoos herbales, tratamientos fortalecedores y nutrición profunda para tu cabello.'
    },
    {
      id: 'familia-baba-caracol',
      name: 'Familia Baba de Caracol',
      pageNumber: '64',
      pdfPage: 66,
      color: '#2B93CE',
      imageUrl: '/assets/catalog/page_011.jpg',
      description: 'La línea estrella con alantoína, colágeno y elastina para regenerar e hidratar tu piel.'
    },
    {
      id: 'cuidado-especial-corporal',
      name: 'Cuidado Especial Corporal',
      pageNumber: '68',
      pdfPage: 70,
      color: '#EC8EA9',
      imageUrl: '/assets/catalog/page_013.jpg',
      description: 'Shampoos corporales frutales, jabones artesanales y cremas nutritivas para todo el cuerpo.'
    },
    {
      id: 'cuidado-especial',
      name: 'Cuidado Especial',
      pageNumber: '84',
      pdfPage: 86,
      color: '#4CB357',
      imageUrl: '/assets/catalog/page_015.jpg',
      description: 'Geles tópicos refrescantes, hielo mineral y fórmulas de alivio tras el esfuerzo físico.'
    },
    {
      id: 'cuidado-ojos-rostro',
      name: 'Cuidado Especial Ojos y Rostro',
      pageNumber: '94',
      pdfPage: 96,
      color: '#D84376',
      imageUrl: '/assets/catalog/page_017.jpg',
      description: 'Desmaquillantes, agua micelar, ácido hialurónico y sueros faciales de alta eficacia.'
    },
    {
      id: 'cosmeticos',
      name: 'Cosméticos',
      pageNumber: '114',
      pdfPage: 116,
      color: '#D3295E',
      imageUrl: '/assets/catalog/page_019.jpg',
      description: 'Pre-bases, maquillaje de larga duración y color que realza tu belleza natural.'
    },
    {
      id: 'esencias-corporales',
      name: 'Esencias Corporales',
      pageNumber: '126',
      pdfPage: 128,
      color: '#9FA1A6',
      imageUrl: '/assets/catalog/page_021.jpg',
      description: 'Perfumería fina de alta gama para dama y caballero con fijación prolongada.'
    },
    {
      id: 'aromaterapia',
      name: 'Aromaterapia',
      pageNumber: '128',
      pdfPage: 130,
      color: '#8D3E8A',
      imageUrl: '/assets/catalog/page_023.jpg',
      description: 'Aceites esenciales para masaje y splashes relajantes de lavanda, bergamota y eucalipto.'
    },
    {
      id: 'linea-infantil',
      name: 'Línea Infantil',
      pageNumber: '132',
      pdfPage: 134,
      color: '#ECC442',
      textColor: '#1E293B',
      imageUrl: '/assets/catalog/page_025.jpg',
      description: 'Fórmulas hipoalergénicas, suaves y seguras para el baño y cuidado diario de tu bebé.'
    },
    {
      id: 'linea-hogar',
      name: 'Línea del Hogar',
      pageNumber: '138',
      pdfPage: 140,
      color: '#C84130',
      imageUrl: '/assets/catalog/page_027.jpg',
      description: 'Esencias ambientales con difusor de bambú y soluciones ecológicas para armonizar tu hogar.'
    },
    {
      id: 'mascotas',
      name: 'Mascotas',
      pageNumber: '142',
      pdfPage: 144,
      color: '#0D8FD3',
      imageUrl: '/assets/catalog/page_029.jpg',
      description: 'Cuidado botánico antipulgas para limpiar, dar brillo y proteger el pelaje de perros y gatos.'
    }
  ],
  products: [
    // 01. Lo Nuevo en Casa
    {
      id: 'prod-s1701',
      clave: 'S1701',
      name: 'Baba de Caracol Crema Facial (Versión Viaje)',
      subtitle: 'Crema Facial con Alantoína, Colágeno y Elastina',
      description: 'Todos los beneficios de la alantoína, el colágeno y la elastina. Nuestro clásico favorito ahora en una versión práctica de 100 ml para llevar a todos lados.',
      presentation: '100 ml',
      price: 149,
      categoryId: 'lo-nuevo-en-casa',
      catalogPage: '01',
      imageUrl: '/assets/catalog/page_003.jpg',
      featured: true,
      priceTagStyle: 'blue'
    },
    {
      id: 'prod-s1703',
      clave: 'S1703',
      name: 'Agua Termal Facial Hidratante',
      subtitle: 'Rica en Minerales · Hidrata y Nutre la Piel',
      description: 'Hidratación inmediata que ayuda a mantener la comodidad, frescura y el equilibrio natural de tu rostro durante todo el día.',
      presentation: '140 ml',
      price: 199,
      categoryId: 'lo-nuevo-en-casa',
      catalogPage: '01',
      imageUrl: '/assets/catalog/page_003.jpg',
      featured: true,
      priceTagStyle: 'emerald'
    },
    {
      id: 'prod-s1706',
      clave: 'S1706',
      name: 'Melena de León con Antocianinas',
      subtitle: 'Suplemento Alimenticio para Claridad y Enfoque',
      description: 'Combinación del hongo melena de león y antocianinas del arándano, ingredientes naturales que acompañan tu desempeño mental, enfoque y calma diaria.',
      presentation: '250 g',
      price: 399,
      categoryId: 'lo-nuevo-en-casa',
      catalogPage: '02',
      imageUrl: '/assets/catalog/page_004.jpg',
      featured: true,
      priceTagStyle: 'blue'
    },
    {
      id: 'prod-s1704',
      clave: 'S1704',
      name: 'Rhodiola Suplemento Alimenticio',
      subtitle: 'Adaptógeno para Exigencia Física y Mental',
      description: 'Rhodiola es una planta tradicionalmente asociada al bienestar y resistencia durante momentos de alta exigencia física o mental.',
      presentation: '250 g',
      price: 399,
      categoryId: 'lo-nuevo-en-casa',
      catalogPage: '02',
      imageUrl: '/assets/catalog/page_004.jpg',
      priceTagStyle: 'rose'
    },
    {
      id: 'prod-s1707',
      clave: 'S1707',
      name: 'NAD + Colágeno Hidrolizado + Resveratrol',
      subtitle: 'Energía Celular y Protección Antioxidante',
      description: 'Fórmula avanzada con NAD, colágeno hidrolizado, resveratrol y pulpa de frutas deshidratadas para procesos energéticos y cuidado antiedad.',
      presentation: '250 g',
      price: 579,
      categoryId: 'lo-nuevo-en-casa',
      catalogPage: '02',
      imageUrl: '/assets/catalog/page_004.jpg',
      featured: true,
      priceTagStyle: 'purple'
    },
    {
      id: 'prod-s1708',
      clave: 'S1708',
      name: 'Triple Extracto de Ajo Concentrado',
      subtitle: 'Ajo Blanco, Ajo Negro y Ajo Japonés',
      description: 'Tres variedades de ajo reunidas en gotas para ofrecer una máxima concentración que impulsa tu equilibrio interno y bienestar cardiovascular.',
      presentation: '30 ml',
      price: 304,
      categoryId: 'lo-nuevo-en-casa',
      catalogPage: '03',
      imageUrl: '/assets/catalog/page_005.jpg',
      priceTagStyle: 'amber'
    },
    {
      id: 'prod-s1712',
      clave: 'S1712',
      name: 'Ciruelo Africano & Sabal',
      subtitle: 'Bienestar Integral del Hombre',
      description: 'Ciruelo africano y sabal en perfecta sinergia para acompañar el bienestar masculino en cada etapa. Presentación en sobres individuales.',
      presentation: '20 sobres de 25 g c/u',
      price: 524,
      categoryId: 'lo-nuevo-en-casa',
      catalogPage: '03',
      imageUrl: '/assets/catalog/page_005.jpg',
      priceTagStyle: 'blue'
    },
    {
      id: 'prod-s1705',
      clave: 'S1705',
      name: 'L-Glutamina en Polvo',
      subtitle: 'Soporte Nutricional y Recuperación Física',
      description: 'Uno de los aminoácidos más abundantes del cuerpo, ideal en periodos de mayor exigencia física para dar soporte adicional a tu nutrición.',
      presentation: '250 g',
      price: 550,
      categoryId: 'lo-nuevo-en-casa',
      catalogPage: '03',
      imageUrl: '/assets/catalog/page_005.jpg',
      priceTagStyle: 'emerald'
    },

    // 08. Bienestar desde el Interior
    {
      id: 'prod-s1622',
      clave: 'S1622',
      name: 'Gotas de Zinc Suplemento Alimenticio',
      subtitle: 'Mineral Esencial de Alta Absorción',
      description: 'Aporta zinc, un mineral esencial que tu cuerpo necesita para el sistema inmune y metabolismo celular.',
      presentation: '30 ml',
      price: 237,
      categoryId: 'bienestar-interior',
      catalogPage: '09',
      imageUrl: '/assets/catalog/page_008.jpg',
      priceTagStyle: 'blue'
    },
    {
      id: 'prod-s514',
      clave: 'S514',
      name: 'SN-S3 Pasiflora, Melisa y Valeriana',
      subtitle: 'Extracto Herbal Relajante en Gotas',
      description: 'Combinación natural de pasiflora, melisa y valeriana; tu apoyo ideal para relajarte y descansar en los días más intensos.',
      presentation: '30 ml',
      price: 314,
      categoryId: 'bienestar-interior',
      catalogPage: '09',
      imageUrl: '/assets/catalog/page_008.jpg',
      priceTagStyle: 'emerald'
    },
    {
      id: 'prod-s1623',
      clave: 'S1623',
      name: 'Polvo con Citrato de Magnesio',
      subtitle: 'Suplemento Alimenticio para Equilibrio Diario',
      description: 'Un aliado esencial para el equilibrio muscular, nervioso y el bienestar diario en práctica presentación en polvo.',
      presentation: '250 g',
      price: 525,
      categoryId: 'bienestar-interior',
      catalogPage: '09',
      imageUrl: '/assets/catalog/page_008.jpg',
      featured: true,
      priceTagStyle: 'blue'
    },

    // 42. Cuidado Capilar
    {
      id: 'prod-s731',
      clave: 'S731',
      name: 'Shampoo de Cola de Caballo',
      subtitle: 'Nutrición y Crecimiento Capilar',
      description: 'Nutre y fortalece desde la raíz, dejando tu cabello visiblemente más brillante, sedoso y resistente día a día.',
      presentation: '950 ml',
      price: 398,
      categoryId: 'cuidado-capilar',
      catalogPage: '43',
      imageUrl: '/assets/catalog/page_010.jpg',
      featured: true,
      priceTagStyle: 'emerald'
    },
    {
      id: 'prod-s1612',
      clave: 'S1612',
      name: 'Shampoo de Cebolla y Linaza Antioxidante',
      subtitle: 'Sin Aroma a Cebolla · Cuero Cabelludo Saludable',
      description: 'Cebolla morada y linaza para una limpieza profunda que fortalece desde la raíz y protege el cuero cabelludo de forma natural.',
      presentation: '530 ml',
      price: 158,
      categoryId: 'cuidado-capilar',
      catalogPage: '43',
      imageUrl: '/assets/catalog/page_010.jpg',
      priceTagStyle: 'purple'
    },

    // 64. Familia Baba de Caracol
    {
      id: 'prod-s001',
      clave: 'S001',
      name: 'Baba de Caracol Crema Facial Clásica',
      subtitle: 'Producto Estrella · Hidratación y Firmeza',
      description: 'Ideal para una piel hidratada, firme y renovada gracias a su alta concentración de extracto de baba de caracol, colágeno y elastina.',
      presentation: '250 ml',
      price: 304,
      categoryId: 'familia-baba-caracol',
      catalogPage: '65',
      imageUrl: '/assets/catalog/page_012.jpg',
      featured: true,
      priceTagStyle: 'blue'
    },
    {
      id: 'prod-s161',
      clave: 'S161',
      name: 'Baba de Caracol Jabón Facial y Corporal',
      subtitle: 'Producto Estrella · Suavidad Extrema',
      description: 'Limpieza profunda y cuidado reparador en barra para rostro y cuerpo en un solo paso.',
      presentation: '100 g',
      price: 83,
      categoryId: 'familia-baba-caracol',
      catalogPage: '65',
      imageUrl: '/assets/catalog/page_012.jpg',
      priceTagStyle: 'blue'
    },

    // 68. Cuidado Especial Corporal
    {
      id: 'prod-s182',
      clave: 'S182',
      name: 'Arándano Shampoo Corporal',
      subtitle: 'Piel Limpia, Fresca y Revitalizada',
      description: 'Gel de baño corporal con extracto de arándano que refresca tu piel y deja un aroma suave y duradero.',
      presentation: '530 ml',
      price: 142,
      categoryId: 'cuidado-especial-corporal',
      catalogPage: '69',
      imageUrl: '/assets/catalog/page_014.jpg',
      priceTagStyle: 'rose'
    },
    {
      id: 'prod-s239',
      clave: 'S239',
      name: 'Piña Colada Shampoo Corporal',
      subtitle: 'Extracto de Piña y Té Verde',
      description: 'El poder relajante e hidratante del extracto de piña, coco y té verde en un solo baño corporal.',
      presentation: '530 ml',
      price: 142,
      categoryId: 'cuidado-especial-corporal',
      catalogPage: '69',
      imageUrl: '/assets/catalog/page_014.jpg',
      priceTagStyle: 'amber'
    },
    {
      id: 'prod-s729',
      clave: 'S729',
      name: 'Jabón Artesanal del Bosque',
      subtitle: 'Aceite de Coco y Fragancia de Pino',
      description: 'Barra artesanal con aceite de coco y notas frescas de pino que revitalizan tus sentidos con una sensación energizante.',
      presentation: '100 g',
      price: 79,
      categoryId: 'cuidado-especial-corporal',
      catalogPage: '69',
      imageUrl: '/assets/catalog/page_014.jpg',
      priceTagStyle: 'emerald'
    },

    // 84. Cuidado Especial
    {
      id: 'prod-s061',
      clave: 'S061',
      name: 'Gel Tópico Therapygel con Mentol',
      subtitle: 'Extracto de Menta Piperita y Alcanfor',
      description: 'Proporciona una sensación refrescante y reconfortante inmediata al contacto con la piel cansada.',
      presentation: '250 ml',
      price: 251,
      categoryId: 'cuidado-especial',
      catalogPage: '85',
      imageUrl: '/assets/catalog/page_016.jpg',
      priceTagStyle: 'blue'
    },
    {
      id: 'prod-s060',
      clave: 'S060',
      name: 'Hielo Mineral en Spray',
      subtitle: 'Producto Estrella · Especial para Deportistas',
      description: 'Spray refrescante con mentol y eucalipto para una sensación de alivio inmediato después del esfuerzo físico.',
      presentation: '265 ml',
      price: 314,
      categoryId: 'cuidado-especial',
      catalogPage: '85',
      imageUrl: '/assets/catalog/page_016.jpg',
      featured: true,
      priceTagStyle: 'emerald'
    },

    // 94. Cuidado Especial Ojos y Rostro
    {
      id: 'prod-s115',
      clave: 'S115',
      name: 'Desmaquillante Profesional Bifásico',
      subtitle: 'Con Sábila y Manzanilla · Libre de Aceite',
      description: 'Fórmula bifásica suave para desmaquillar ojos y labios a prueba de agua sin irritación.',
      presentation: '130 ml',
      price: 262,
      categoryId: 'cuidado-ojos-rostro',
      catalogPage: '95',
      imageUrl: '/assets/catalog/page_018.jpg',
      priceTagStyle: 'blue'
    },
    {
      id: 'prod-s1409',
      clave: 'S1409',
      name: 'Toallitas Desmaquillantes con Ácido Hialurónico',
      subtitle: 'Ácido Hialurónico, Manzanilla y Agua de Rosas',
      description: 'Ayudan a limpiar el rostro y remover maquillaje e impurezas mientras aportan hidratación y suavidad.',
      presentation: '25 Toallitas',
      price: 146,
      categoryId: 'cuidado-ojos-rostro',
      catalogPage: '95',
      imageUrl: '/assets/catalog/page_018.jpg',
      priceTagStyle: 'rose'
    },
    {
      id: 'prod-s704',
      clave: 'S704',
      name: 'Agua Micelar Limpieza Profunda',
      subtitle: 'Desmaquilla y Limpia sin Resecar',
      description: 'Elimina maquillaje, impurezas y exceso de grasa dejando el rostro fresco y tonificado.',
      presentation: '140 ml',
      price: 283,
      categoryId: 'cuidado-ojos-rostro',
      catalogPage: '95',
      imageUrl: '/assets/catalog/page_018.jpg',
      priceTagStyle: 'rose'
    },

    // 114. Cosméticos
    {
      id: 'prod-s1403',
      clave: 'S1403',
      name: 'Pre Base Primer Para Rostro',
      subtitle: 'Minimiza Poros y Líneas de Expresión',
      description: 'Suaviza la textura de la piel antes del maquillaje, prolonga la fijación de la base y deja un acabado sedoso.',
      presentation: '30 g',
      price: 242,
      categoryId: 'cosmeticos',
      catalogPage: '115',
      imageUrl: '/assets/catalog/page_020.jpg',
      featured: true,
      priceTagStyle: 'dark'
    },

    // 126. Esencias Corporales
    {
      id: 'prod-s1513',
      clave: 'S1513',
      name: 'Esencia Corporal Alta Gama Caballero (Azul Profundo)',
      subtitle: 'Familia Olfativa Amaderada Aromática',
      description: 'Perfume de alta gama para caballero con notas frescas y amaderadas de larga duración. Disponible también en Fortaleza (S1514), Pasión (S1515) y Triunfo (S1516).',
      presentation: '60 ml',
      price: 535,
      categoryId: 'esencias-corporales',
      catalogPage: '127',
      imageUrl: '/assets/catalog/page_022.jpg',
      featured: true,
      priceTagStyle: 'dark'
    },
    {
      id: 'prod-s1509',
      clave: 'S1509',
      name: 'Esencia Corporal Alta Gama Dama (Vida)',
      subtitle: 'Familia Olfativa Floral Frutal Gourmand',
      description: 'Perfume de alta gama para dama con notas dulces y florales que perduran todo el día. Disponible también en Amor (S1510), Plenitud (S1511) y Momentos (S1512).',
      presentation: '60 ml',
      price: 535,
      categoryId: 'esencias-corporales',
      catalogPage: '127',
      imageUrl: '/assets/catalog/page_022.jpg',
      priceTagStyle: 'rose'
    },

    // 128. Aromaterapia
    {
      id: 'prod-s725',
      clave: 'S725',
      name: 'Aceite para Masaje de Hierbas',
      subtitle: 'Vainilla, Limón, Lavanda y Eucalipto',
      description: 'Fórmula con aceites esenciales puros que facilitan el masaje y promueven la relajación profunda.',
      presentation: '140 ml',
      price: 262,
      categoryId: 'aromaterapia',
      catalogPage: '129',
      imageUrl: '/assets/catalog/page_024.jpg',
      priceTagStyle: 'purple'
    },
    {
      id: 'prod-s236',
      clave: 'S236',
      name: 'Aceite para Masaje RELAX',
      subtitle: 'Bergamota, Ciprés, Canela, Geranio y Jazmín',
      description: 'Mezcla rica en aceites esenciales que deja una sensación de confort, descanso y armonía en la piel.',
      presentation: '140 ml',
      price: 258,
      categoryId: 'aromaterapia',
      catalogPage: '129',
      imageUrl: '/assets/catalog/page_024.jpg',
      priceTagStyle: 'blue'
    },
    {
      id: 'prod-s154',
      clave: 'S154',
      name: 'Splash Relajante Corporal y Ambiental',
      subtitle: 'Lavanda, Manzanilla, Valeriana y Tila',
      description: 'Loción ligera ideal para rociar sobre la almohada o el cuerpo, creando un ambiente de calma antes de dormir.',
      presentation: '140 ml',
      price: 258,
      categoryId: 'aromaterapia',
      catalogPage: '129',
      imageUrl: '/assets/catalog/page_024.jpg',
      priceTagStyle: 'purple'
    },

    // 132. Línea Infantil
    {
      id: 'prod-s1602',
      clave: 'S1602',
      name: 'Jabón Neutro para Bebé Sin Aroma',
      subtitle: 'Fórmula Hipoalergénica Facial y Corporal',
      description: 'Barra extra suave sin fragancia añadida para el baño diario de la delicada piel del bebé.',
      presentation: '100 g',
      price: 63,
      categoryId: 'linea-infantil',
      catalogPage: '133',
      imageUrl: '/assets/catalog/page_026.jpg',
      priceTagStyle: 'blue'
    },
    {
      id: 'prod-s166',
      clave: 'S166',
      name: 'Shampoo Bebé Suavidad y Brillo',
      subtitle: 'Cuidado Delicado con Dispensador',
      description: 'Fórmula suave que ayuda a limpiar y mantener el brillo natural del cabello de tu bebé sin irritar sus ojos.',
      presentation: '500 ml',
      price: 178,
      categoryId: 'linea-infantil',
      catalogPage: '133',
      imageUrl: '/assets/catalog/page_026.jpg',
      priceTagStyle: 'amber'
    },

    // 138. Línea del Hogar
    {
      id: 'prod-s1519',
      clave: 'S1519',
      name: 'Esencia Ambiental Lavanda con Difusor',
      subtitle: 'Aromaterapia para el Hogar con Varitas de Bambú',
      description: 'Transporta tus sentidos y envuelve los espacios de tu hogar con frescura y tranquilidad de lavanda.',
      presentation: '80 ml',
      price: 419,
      categoryId: 'linea-hogar',
      catalogPage: '139',
      imageUrl: '/assets/catalog/page_028.jpg',
      featured: true,
      priceTagStyle: 'rose'
    },

    // 142. Mascotas
    {
      id: 'prod-s1206',
      clave: 'S1206',
      name: 'Shampoo Mascota Protección Anti-Pulgas',
      subtitle: 'Para Perros y Gatos · Ingredientes Botánicos',
      description: 'Baño natural que limpia, da brillo y huele bien, con extractos botánicos que cuidan y protegen el pelaje de tu mascota.',
      presentation: '400 ml',
      price: 199,
      categoryId: 'mascotas',
      catalogPage: '143',
      imageUrl: '/assets/catalog/page_030.jpg',
      featured: true,
      priceTagStyle: 'blue'
    }
  ]
};
