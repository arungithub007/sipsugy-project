-- SipSugy — schema (tier 3)
-- Matches the queries in backend/src/controllers/{menu,orders}.controller.js
-- exactly. If you rename a column here, update those queries too.

CREATE TABLE IF NOT EXISTS menu_items (
  id            VARCHAR(64)    NOT NULL PRIMARY KEY,
  name          VARCHAR(100)   NOT NULL,
  note          VARCHAR(255)   NULL,
  price         DECIMAL(10,2)  NOT NULL,
  tag           VARCHAR(50)    NULL,
  is_available  TINYINT(1)     NOT NULL DEFAULT 1,
  created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id             INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_name  VARCHAR(100)    NULL,
  customer_phone VARCHAR(20)     NULL,
  subtotal       DECIMAL(10,2)   NOT NULL,
  status         VARCHAR(30)     NOT NULL DEFAULT 'received',
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id            INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id      INT            NOT NULL,
  menu_item_id  VARCHAR(64)    NOT NULL,
  name          VARCHAR(100)   NOT NULL,
  price         DECIMAL(10,2)  NOT NULL,
  quantity      INT            NOT NULL,
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_menu_item
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_order_items_order_id ON order_items (order_id);

-- Seed menu — same ids/prices as frontend/src/data/menu.js and
-- backend/src/data/menu.seed.js, so all three tiers agree.
INSERT INTO menu_items (id, name, note, price, tag) VALUES
  ('classic-cane',    'Classic Cane',        'Straight-pressed sugarcane, served over ice.',      40.00, 'House favourite'),
  ('ginger-zing',     'Ginger Zing',         'Cane juice muddled with fresh ginger root.',        45.00, 'Warming'),
  ('pudina-punch',    'Pudina Punch',        'Cane juice, crushed mint, a pinch of black salt.',  45.00, 'Cooling'),
  ('nimbu-cane',      'Nimbu Cane',          'Cane juice with fresh lime and chaat masala.',      45.00, 'Tangy'),
  ('masala-cane',     'Masala Cane',         'Roasted cumin, black pepper, black salt.',          50.00, 'Roadside-style'),
  ('pineapple-cane',  'Pineapple Cane Mix',  'Cane juice blended with fresh pineapple.',          55.00, 'Fruit mix')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  note = VALUES(note),
  price = VALUES(price),
  tag = VALUES(tag);
