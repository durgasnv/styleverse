import { INGESTED_PRODUCTS, INGESTED_HUBS } from './ingested-products';

export type Category = 'Men' | 'Women' | 'Kids' | 'Footwear' | 'Beauty' | 'Accessories' | 'Home & Living';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  subcategory: string;
  price: number;
  mrp: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  images: string[];
  colors: string[];
  sizes: { label: string; inStock: boolean }[];
  occasionTags: string[];
  description: string;
  deliveryEstimate: string;
}

export interface StyleHub {
  id: string;
  name: string;
  aestheticTag: string;
  description: string;
  coverImage: string;
  baseViewerCount: number;
  memberCount: number;
  trendingOutfitIds: string[];
  weeklyChallenge: string;
  topCreators: { name: string; avatar: string }[];
}

export interface Outfit {
  id: string;
  name: string;
  productIds: string[];
  createdAt: string;
  companionScore?: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  prizeText: string;
  endsAt: string;
  entries: {
    id: string;
    outfitId?: string;
    productIds: string[];
    creatorName: string;
    baseVoteCount: number;
  }[];
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Oversized Graphic T-Shirt",
    brand: "ROADSTER",
    category: "Men",
    subcategory: "T-Shirts",
    price: 599,
    mrp: 1299,
    discountPercent: 53,
    rating: 4.2,
    reviewCount: 1240,
    images: ["/img/men-tshirt.jpg"],
    colors: ["black", "neutral"],
    sizes: [{label: "S", inStock: true}, {label: "M", inStock: true}, {label: "L", inStock: false}, {label: "XL", inStock: true}],
    occasionTags: ["casual", "streetwear"],
    description: "Premium cotton oversized t-shirt with bold graphic prints, perfect for streetwear looks.",
    deliveryEstimate: "2-3 business days"
  },
  {
    id: "p2",
    name: "Floral Summer Midi Dress",
    brand: "SASSAFRAS",
    category: "Women",
    subcategory: "Dresses",
    price: 899,
    mrp: 2499,
    discountPercent: 64,
    rating: 4.5,
    reviewCount: 342,
    images: ["/img/women-dress.jpg"],
    colors: ["warm", "pink"],
    sizes: [{label: "XS", inStock: true}, {label: "S", inStock: true}, {label: "M", inStock: true}, {label: "L", inStock: true}],
    occasionTags: ["casual", "party", "summer"],
    description: "Light and breezy floral midi dress with a sweetheart neckline and side slit.",
    deliveryEstimate: "Tomorrow by 9 PM"
  },
  {
    id: "p3",
    name: "Chunky Platform Sneakers",
    brand: "PUMA",
    category: "Footwear",
    subcategory: "Sneakers",
    price: 1999,
    mrp: 3999,
    discountPercent: 50,
    rating: 4.8,
    reviewCount: 89,
    images: ["/img/sneakers.jpg"],
    colors: ["neutral", "white"],
    sizes: [{label: "UK 4", inStock: false}, {label: "UK 5", inStock: true}, {label: "UK 6", inStock: true}, {label: "UK 7", inStock: true}],
    occasionTags: ["casual", "sport", "streetwear"],
    description: "Elevate your streetwear with these chunky platform sneakers featuring soft-foam cushioning.",
    deliveryEstimate: "2-4 business days"
  },
  {
    id: "p4",
    name: "Classic Blue Wash Denim Jacket",
    brand: "LEVI'S",
    category: "Men",
    subcategory: "Jackets",
    price: 1799,
    mrp: 3599,
    discountPercent: 50,
    rating: 4.6,
    reviewCount: 2104,
    images: ["/img/denim-jacket.jpg"],
    colors: ["cool", "blue"],
    sizes: [{label: "S", inStock: true}, {label: "M", inStock: true}, {label: "L", inStock: true}],
    occasionTags: ["casual", "winter"],
    description: "The original jean jacket since 1967. A blank canvas for self-expression.",
    deliveryEstimate: "3-5 business days"
  },
  {
    id: "p5",
    name: "Quilted Leather Handbag",
    brand: "ALLEN SOLLY",
    category: "Accessories",
    subcategory: "Bags",
    price: 1299,
    mrp: 2599,
    discountPercent: 50,
    rating: 4.3,
    reviewCount: 156,
    images: ["/img/handbag.jpg"],
    colors: ["neutral", "black"],
    sizes: [{label: "One Size", inStock: true}],
    occasionTags: ["formal", "party", "casual"],
    description: "Elegant quilted design with gold-tone hardware and adjustable chain strap.",
    deliveryEstimate: "2-3 business days"
  },
  {
    id: "p6",
    name: "Retro Square Sunglasses",
    brand: "FASTRACK",
    category: "Accessories",
    subcategory: "Eyewear",
    price: 799,
    mrp: 1499,
    discountPercent: 46,
    rating: 4.1,
    reviewCount: 432,
    images: ["/img/sunglasses.jpg"],
    colors: ["black", "neutral"],
    sizes: [{label: "One Size", inStock: true}],
    occasionTags: ["casual", "summer", "beach"],
    description: "100% UV protected retro square frames, perfect for finishing off any summer look.",
    deliveryEstimate: "Tomorrow by 9 PM"
  }
];

// Aesthetic-specific products for the new Style Hubs (Acubi, Coquette, Cottagecore, Blokecore)
MOCK_PRODUCTS.push(
  // Acubi
  {
    id: "p61",
    name: "Structured Satin Blazer",
    brand: "MANGO",
    category: "Women",
    subcategory: "Blazers",
    price: 1499,
    mrp: 2999,
    discountPercent: 50,
    rating: 4.4,
    reviewCount: 312,
    images: ["/img/acubi-blazer.jpg"],
    colors: ["neutral", "black"],
    sizes: [{label: "S", inStock: true}, {label: "M", inStock: true}, {label: "L", inStock: true}, {label: "XL", inStock: false}],
    occasionTags: ["formal", "acubi", "office"],
    description: "Sharp shoulders and a sleek satin finish — the ultimate office-siren layering piece for the acubi aesthetic.",
    deliveryEstimate: "2-3 business days"
  },
  {
    id: "p62",
    name: "Low-Rise Tailored Trousers",
    brand: "MANGO",
    category: "Women",
    subcategory: "Trousers",
    price: 1099,
    mrp: 2199,
    discountPercent: 50,
    rating: 4.3,
    reviewCount: 198,
    images: ["/img/acubi-trousers.jpg"],
    colors: ["neutral", "black"],
    sizes: [{label: "XS", inStock: true}, {label: "S", inStock: true}, {label: "M", inStock: true}, {label: "L", inStock: true}],
    occasionTags: ["formal", "acubi", "office"],
    description: "Low-rise tailored trousers with a clean crease — pairs perfectly with a fitted top for that acubi corporate edge.",
    deliveryEstimate: "2-4 business days"
  },
  {
    id: "p63",
    name: "Ribbed Bodysuit Top",
    brand: "VERO MODA",
    category: "Women",
    subcategory: "Tops",
    price: 899,
    mrp: 1799,
    discountPercent: 50,
    rating: 4.1,
    reviewCount: 267,
    images: ["/img/acubi-top.jpg"],
    colors: ["black", "neutral"],
    sizes: [{label: "XS", inStock: true}, {label: "S", inStock: true}, {label: "M", inStock: true}, {label: "L", inStock: false}],
    occasionTags: ["casual", "acubi", "party"],
    description: "Fitted ribbed bodysuit that layers seamlessly under blazers — a core acubi wardrobe staple.",
    deliveryEstimate: "Tomorrow by 9 PM"
  },
  {
    id: "p64",
    name: "Structured Baguette Bag",
    brand: "ALLEN SOLLY",
    category: "Accessories",
    subcategory: "Bags",
    price: 1199,
    mrp: 2399,
    discountPercent: 50,
    rating: 4.5,
    reviewCount: 143,
    images: ["/img/acubi-bag.jpg"],
    colors: ["neutral", "black"],
    sizes: [{label: "One Size", inStock: true}],
    occasionTags: ["formal", "acubi"],
    description: "Sleek structured baguette bag with gold-tone hardware, the finishing touch on any acubi look.",
    deliveryEstimate: "2-3 business days"
  },
  {
    id: "p65",
    name: "Chunky Combat Boots",
    brand: "STEVE MADDEN",
    category: "Footwear",
    subcategory: "Boots",
    price: 1799,
    mrp: 3599,
    discountPercent: 50,
    rating: 4.6,
    reviewCount: 176,
    images: ["/img/acubi-boots.jpg"],
    colors: ["black", "neutral"],
    sizes: [{label: "UK 4", inStock: true}, {label: "UK 5", inStock: true}, {label: "UK 6", inStock: false}, {label: "UK 7", inStock: true}],
    occasionTags: ["casual", "acubi", "streetwear"],
    description: "Chunky lace-up combat boots that ground even the sharpest acubi tailoring.",
    deliveryEstimate: "3-5 business days"
  },
  // Coquette
  {
    id: "p66",
    name: "Lace Trim Cami Top",
    brand: "FOREVER 21",
    category: "Women",
    subcategory: "Tops",
    price: 799,
    mrp: 1599,
    discountPercent: 50,
    rating: 4.2,
    reviewCount: 421,
    images: ["/img/coquette-cami.jpg"],
    colors: ["pink", "white"],
    sizes: [{label: "XS", inStock: true}, {label: "S", inStock: true}, {label: "M", inStock: true}, {label: "L", inStock: true}],
    occasionTags: ["casual", "coquette", "party"],
    description: "Delicate lace-trim cami with a ribbon bow detail — soft, feminine, coquette-core.",
    deliveryEstimate: "Tomorrow by 9 PM"
  },
  {
    id: "p67",
    name: "Cropped Knit Cardigan",
    brand: "VERO MODA",
    category: "Women",
    subcategory: "Sweaters",
    price: 1099,
    mrp: 2199,
    discountPercent: 50,
    rating: 4.3,
    reviewCount: 289,
    images: ["/img/coquette-cardigan.jpg"],
    colors: ["pink", "white", "neutral"],
    sizes: [{label: "XS", inStock: true}, {label: "S", inStock: true}, {label: "M", inStock: true}, {label: "L", inStock: false}],
    occasionTags: ["casual", "coquette"],
    description: "Cropped button-through cardigan in a soft knit — a coquette-core essential for layering.",
    deliveryEstimate: "2-3 business days"
  },
  {
    id: "p68",
    name: "Pleated Mini Skirt",
    brand: "ONLY",
    category: "Women",
    subcategory: "Skirts",
    price: 999,
    mrp: 1999,
    discountPercent: 50,
    rating: 4.0,
    reviewCount: 356,
    images: ["/img/coquette-skirt.jpg"],
    colors: ["pink", "white"],
    sizes: [{label: "XS", inStock: true}, {label: "S", inStock: true}, {label: "M", inStock: true}, {label: "L", inStock: true}],
    occasionTags: ["casual", "coquette", "party"],
    description: "Flirty pleated mini skirt with a satin bow waistband — coquette dressing at its finest.",
    deliveryEstimate: "2-4 business days"
  },
  {
    id: "p69",
    name: "Pearl Bow Drop Earrings",
    brand: "ACCESSORIZE",
    category: "Accessories",
    subcategory: "Jewellery",
    price: 449,
    mrp: 899,
    discountPercent: 50,
    rating: 4.4,
    reviewCount: 512,
    images: ["/img/coquette-earrings.jpg"],
    colors: ["white", "neutral"],
    sizes: [{label: "One Size", inStock: true}],
    occasionTags: ["party", "coquette"],
    description: "Dainty pearl and bow drop earrings that add a coquette finishing touch to any outfit.",
    deliveryEstimate: "Tomorrow by 9 PM"
  },
  {
    id: "p70",
    name: "Mary Jane Ballet Flats",
    brand: "CATWALK",
    category: "Footwear",
    subcategory: "Flats",
    price: 1299,
    mrp: 2499,
    discountPercent: 48,
    rating: 4.3,
    reviewCount: 234,
    images: ["/img/coquette-flats.jpg"],
    colors: ["black", "pink"],
    sizes: [{label: "UK 4", inStock: true}, {label: "UK 5", inStock: true}, {label: "UK 6", inStock: true}, {label: "UK 7", inStock: false}],
    occasionTags: ["casual", "coquette", "party"],
    description: "Classic Mary Jane ballet flats with a rounded toe — the coquette shoe of the season.",
    deliveryEstimate: "2-3 business days"
  },
  // Cottagecore
  {
    id: "p71",
    name: "Floral Prairie Midi Dress",
    brand: "SASSAFRAS",
    category: "Women",
    subcategory: "Dresses",
    price: 1499,
    mrp: 2999,
    discountPercent: 50,
    rating: 4.5,
    reviewCount: 198,
    images: ["/img/cottagecore-dress.jpg"],
    colors: ["warm", "white"],
    sizes: [{label: "XS", inStock: true}, {label: "S", inStock: true}, {label: "M", inStock: true}, {label: "L", inStock: true}],
    occasionTags: ["casual", "cottagecore", "summer"],
    description: "Puff-sleeve floral prairie dress with a tiered hem — dreamy cottagecore romance.",
    deliveryEstimate: "2-3 business days"
  },
  {
    id: "p72",
    name: "Puff Sleeve Cotton Blouse",
    brand: "AND",
    category: "Women",
    subcategory: "Tops",
    price: 899,
    mrp: 1799,
    discountPercent: 50,
    rating: 4.2,
    reviewCount: 167,
    images: ["/img/cottagecore-blouse.jpg"],
    colors: ["white", "warm"],
    sizes: [{label: "XS", inStock: true}, {label: "S", inStock: true}, {label: "M", inStock: true}, {label: "L", inStock: false}],
    occasionTags: ["casual", "cottagecore"],
    description: "Soft cotton blouse with billowy puff sleeves and a delicate collar, straight out of a meadow picnic.",
    deliveryEstimate: "2-4 business days"
  },
  {
    id: "p73",
    name: "Woven Straw Sunhat",
    brand: "ACCESSORIZE",
    category: "Accessories",
    subcategory: "Headwear",
    price: 599,
    mrp: 1199,
    discountPercent: 50,
    rating: 4.1,
    reviewCount: 98,
    images: ["/img/cottagecore-hat.jpg"],
    colors: ["neutral", "warm"],
    sizes: [{label: "One Size", inStock: true}],
    occasionTags: ["casual", "cottagecore", "summer", "beach"],
    description: "Wide-brimmed woven straw sunhat with a ribbon tie — cottagecore's go-to accessory.",
    deliveryEstimate: "3-5 business days"
  },
  {
    id: "p74",
    name: "Wicker Weave Basket Bag",
    brand: "ALLEN SOLLY",
    category: "Accessories",
    subcategory: "Bags",
    price: 1099,
    mrp: 2199,
    discountPercent: 50,
    rating: 4.4,
    reviewCount: 145,
    images: ["/img/cottagecore-basket.jpg"],
    colors: ["neutral", "warm"],
    sizes: [{label: "One Size", inStock: true}],
    occasionTags: ["casual", "cottagecore"],
    description: "Handwoven wicker basket bag with leather straps — carry your meadow picnic in style.",
    deliveryEstimate: "2-3 business days"
  },
  {
    id: "p75",
    name: "Crossover Strap Sandals",
    brand: "CATWALK",
    category: "Footwear",
    subcategory: "Sandals",
    price: 999,
    mrp: 1999,
    discountPercent: 50,
    rating: 4.0,
    reviewCount: 176,
    images: ["/img/cottagecore-sandals.jpg"],
    colors: ["neutral", "warm"],
    sizes: [{label: "UK 4", inStock: true}, {label: "UK 5", inStock: true}, {label: "UK 6", inStock: true}, {label: "UK 7", inStock: true}],
    occasionTags: ["casual", "cottagecore", "summer"],
    description: "Soft leather crossover strap sandals — barefoot-in-a-meadow comfort with cottagecore charm.",
    deliveryEstimate: "2-4 business days"
  },
  // Blokecore
  {
    id: "p76",
    name: "Retro Football Jersey",
    brand: "ADIDAS",
    category: "Men",
    subcategory: "Jerseys",
    price: 999,
    mrp: 1999,
    discountPercent: 50,
    rating: 4.6,
    reviewCount: 421,
    images: ["/img/blokecore-jersey.jpg"],
    colors: ["blue", "white"],
    sizes: [{label: "S", inStock: true}, {label: "M", inStock: true}, {label: "L", inStock: true}, {label: "XL", inStock: true}],
    occasionTags: ["casual", "blokecore", "sport"],
    description: "Retro-style football jersey with archive club graphics — the terrace-approved blokecore staple.",
    deliveryEstimate: "2-3 business days"
  },
  {
    id: "p77",
    name: "Straight Fit Denim Jeans",
    brand: "LEVI'S",
    category: "Men",
    subcategory: "Jeans",
    price: 1099,
    mrp: 2199,
    discountPercent: 50,
    rating: 4.5,
    reviewCount: 512,
    images: ["/img/blokecore-jeans.jpg"],
    colors: ["blue", "cool"],
    sizes: [{label: "30", inStock: true}, {label: "32", inStock: true}, {label: "34", inStock: true}, {label: "36", inStock: false}],
    occasionTags: ["casual", "blokecore"],
    description: "Classic straight-fit denim jeans built for everyday wear — the blokecore uniform bottom half.",
    deliveryEstimate: "2-4 business days"
  },
  {
    id: "p78",
    name: "Varsity Bomber Jacket",
    brand: "ROADSTER",
    category: "Men",
    subcategory: "Jackets",
    price: 1799,
    mrp: 3599,
    discountPercent: 50,
    rating: 4.4,
    reviewCount: 234,
    images: ["/img/blokecore-jacket.jpg"],
    colors: ["neutral", "black"],
    sizes: [{label: "S", inStock: true}, {label: "M", inStock: true}, {label: "L", inStock: true}, {label: "XL", inStock: true}],
    occasionTags: ["casual", "blokecore", "winter"],
    description: "Retro varsity bomber jacket with ribbed cuffs — throw it over a jersey for full blokecore effect.",
    deliveryEstimate: "3-5 business days"
  },
  {
    id: "p79",
    name: "Ribbed Knit Beanie",
    brand: "FASTRACK",
    category: "Accessories",
    subcategory: "Headwear",
    price: 399,
    mrp: 799,
    discountPercent: 50,
    rating: 4.2,
    reviewCount: 289,
    images: ["/img/blokecore-beanie.jpg"],
    colors: ["neutral", "black"],
    sizes: [{label: "One Size", inStock: true}],
    occasionTags: ["casual", "blokecore", "winter"],
    description: "Classic ribbed knit beanie — the finishing touch on any terrace-casual fit.",
    deliveryEstimate: "Tomorrow by 9 PM"
  },
  {
    id: "p80",
    name: "Retro Runner Trainers",
    brand: "PUMA",
    category: "Footwear",
    subcategory: "Sneakers",
    price: 1999,
    mrp: 3999,
    discountPercent: 50,
    rating: 4.7,
    reviewCount: 356,
    images: ["/img/blokecore-trainers.jpg"],
    colors: ["white", "neutral"],
    sizes: [{label: "UK 4", inStock: true}, {label: "UK 5", inStock: true}, {label: "UK 6", inStock: true}, {label: "UK 7", inStock: true}],
    occasionTags: ["casual", "blokecore", "sport"],
    description: "Low-profile retro runner trainers with suede panels — blokecore footwear done right.",
    deliveryEstimate: "2-3 business days"
  }
);

MOCK_PRODUCTS.push(...INGESTED_PRODUCTS);

export const MOCK_HUBS: StyleHub[] = [
  {
    id: "h1",
    name: "Y2K Nostalgia",
    aestheticTag: "y2k",
    description: "Low-rise jeans, baby tees, and butterfly clips. We're bringing the 2000s back.",
    coverImage: "/img/y2k-hub.jpg",
    baseViewerCount: 342,
    memberCount: 12500,
    trendingOutfitIds: ["o1", "o2"],
    weeklyChallenge: "Mean Girls Aesthetic",
    topCreators: [{name: "@y2k_queen", avatar: ""}, {name: "@retro_vibes", avatar: ""}]
  },
  {
    id: "h2",
    name: "Streetwear Central",
    aestheticTag: "streetwear",
    description: "Sneakers, oversized hoodies, and urban aesthetics. Your daily drip check.",
    coverImage: "/img/streetwear-hub.jpg",
    baseViewerCount: 890,
    memberCount: 45200,
    trendingOutfitIds: ["o3"],
    weeklyChallenge: "Best Sneaker Fit",
    topCreators: [{name: "@hypebeast_in", avatar: ""}]
  },
  {
    id: "h3",
    name: "Minimalist Edit",
    aestheticTag: "minimalist",
    description: "Clean lines, neutral tones, and capsule wardrobes. Less is more.",
    coverImage: "/img/minimalist-hub.jpg",
    baseViewerCount: 210,
    memberCount: 8900,
    trendingOutfitIds: [],
    weeklyChallenge: "The 3-Color Rule",
    topCreators: [{name: "@clean_slate", avatar: ""}]
  },
  {
    id: "h4",
    name: "K-Fashion Pop",
    aestheticTag: "k-fashion",
    description: "Seoul street style, pastel tones, and layered aesthetics.",
    coverImage: "/img/kfashion-hub.jpg",
    baseViewerCount: 560,
    memberCount: 23100,
    trendingOutfitIds: [],
    weeklyChallenge: "Idol Airport Look",
    topCreators: [{name: "@seoul_style", avatar: ""}]
  },
  {
    id: "h5",
    name: "Acubi Edit",
    aestheticTag: "acubi",
    description: "Sharp blazers, low-slung trousers, and sleek bags. Office-siren meets Y2K minimalism.",
    coverImage: "/img/acubi-hub.jpg",
    baseViewerCount: 275,
    memberCount: 9800,
    trendingOutfitIds: [],
    weeklyChallenge: "Corporate Off-Duty",
    topCreators: [{name: "@acubi_girl", avatar: ""}]
  },
  {
    id: "h6",
    name: "Coquette Dreams",
    aestheticTag: "coquette",
    description: "Bows, lace, and ballet flats. Soft, feminine, and a little rebellious.",
    coverImage: "/img/coquette-hub.jpg",
    baseViewerCount: 430,
    memberCount: 18700,
    trendingOutfitIds: [],
    weeklyChallenge: "Bow-Core Challenge",
    topCreators: [{name: "@bow_babe", avatar: ""}]
  },
  {
    id: "h7",
    name: "Cottagecore Corner",
    aestheticTag: "cottagecore",
    description: "Prairie dresses, wicker baskets, and soft florals. Romanticizing the simple life.",
    coverImage: "/img/cottagecore-hub.jpg",
    baseViewerCount: 190,
    memberCount: 7300,
    trendingOutfitIds: [],
    weeklyChallenge: "Meadow Picnic Look",
    topCreators: [{name: "@meadow_muse", avatar: ""}]
  },
  {
    id: "h8",
    name: "Blokecore Terrace",
    aestheticTag: "blokecore",
    description: "Vintage football jerseys, straight-leg jeans, and retro trainers. Terrace casual energy.",
    coverImage: "/img/blokecore-hub.jpg",
    baseViewerCount: 610,
    memberCount: 15400,
    trendingOutfitIds: [],
    weeklyChallenge: "Matchday Fit",
    topCreators: [{name: "@terrace_king", avatar: ""}]
  }
];

MOCK_HUBS.push(...INGESTED_HUBS);

export const MOCK_CHALLENGES: Challenge[] = [
  {
    id: "c1",
    title: "Outfit Under ₹1500",
    description: "Put together a full cohesive look without breaking the bank. Shoes included!",
    prizeText: "Win ₹5000 Myntra Credit",
    endsAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    entries: [
      { id: "e1", productIds: ["p1", "p3", "p6"], creatorName: "@budget_king", baseVoteCount: 124 },
      { id: "e2", productIds: ["p2", "p5"], creatorName: "@deal_hunter", baseVoteCount: 89 }
    ]
  },
  {
    id: "c2",
    title: "Monsoon Ready",
    description: "Stylish but practical outfits for the rainy season. No white pants allowed!",
    prizeText: "Win a Premium Raincoat + ₹2000 Credit",
    endsAt: new Date(Date.now() + 86400000 * 5).toISOString(),
    entries: [
      { id: "e3", productIds: ["p4", "p1", "p3"], creatorName: "@monsoon_child", baseVoteCount: 312 }
    ]
  }
];
