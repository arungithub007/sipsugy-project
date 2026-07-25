// Seed / fallback menu data. Used whenever the DB tier isn't configured yet,
// or if a query against menu_items fails for any reason. Once the database
// exists, this same shape should be loaded into the menu_items table.
const seedMenu = [
  {
    id: 'classic-cane',
    name: 'Classic Cane',
    note: 'Straight-pressed sugarcane, served over ice.',
    price: 40,
    tag: 'House favourite',
  },
  {
    id: 'ginger-zing',
    name: 'Ginger Zing',
    note: 'Cane juice muddled with fresh ginger root.',
    price: 45,
    tag: 'Warming',
  },
  {
    id: 'pudina-punch',
    name: 'Pudina Punch',
    note: 'Cane juice, crushed mint, a pinch of black salt.',
    price: 45,
    tag: 'Cooling',
  },
  {
    id: 'nimbu-cane',
    name: 'Nimbu Cane',
    note: 'Cane juice with fresh lime and chaat masala.',
    price: 45,
    tag: 'Tangy',
  },
  {
    id: 'masala-cane',
    name: 'Masala Cane',
    note: 'Roasted cumin, black pepper, black salt.',
    price: 50,
    tag: 'Roadside-style',
  },
  {
    id: 'pineapple-cane',
    name: 'Pineapple Cane Mix',
    note: 'Cane juice blended with fresh pineapple.',
    price: 55,
    tag: 'Fruit mix',
  },
]

export default seedMenu
