const { pool } = require('../config/db')

const getMenuItems = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT m.id, m.name, m.price, m.stock_qty, m.is_available,
             m.item_type, m.image_url, m.created_at,
             c.id AS category_id, c.name AS category_name
      FROM MenuItems m
      JOIN Categories c ON m.category_id = c.id
      ORDER BY c.name, m.name
    `)
    res.json({ items: result.recordset })
  } catch(e) { res.status(500).json({ error: e.message }) }
}

const getCategories = async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM Categories ORDER BY name')
    res.json({ categories: result.recordset })
  } catch(e) { res.status(500).json({ error: e.message }) }
}

const createMenuItem = async (req, res) => {
  try {
    const { name, category_id, price, stock_qty, item_type, is_available, image_url } = req.body
    if (!name || !category_id || !price || !item_type)
      return res.status(400).json({ error: 'name, category_id, price, item_type are required.' })
    await pool.request()
      .input('name',         name)
      .input('category_id',  parseInt(category_id))
      .input('price',        parseFloat(price))
      .input('stock_qty',    parseInt(stock_qty) || 0)
      .input('item_type',    item_type)
      .input('is_available', is_available !== false ? 1 : 0)
      .input('image_url',    image_url || null)
      .query(`
        INSERT INTO MenuItems (name, category_id, price, stock_qty, item_type, is_available, image_url)
        VALUES (@name, @category_id, @price, @stock_qty, @item_type, @is_available, @image_url)
      `)
    res.status(201).json({ message: 'Menu item created.' })
  } catch(e) { res.status(500).json({ error: e.message }) }
}

const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params
    const { name, category_id, price, stock_qty, item_type, is_available, image_url } = req.body
    const r = pool.request().input('id', id)
    const sets = []
    if (name         !== undefined) { r.input('name',        name);                    sets.push('name = @name') }
    if (category_id  !== undefined) { r.input('category_id', parseInt(category_id));   sets.push('category_id = @category_id') }
    if (price        !== undefined) { r.input('price',       parseFloat(price));        sets.push('price = @price') }
    if (stock_qty    !== undefined) { r.input('stock_qty',   parseInt(stock_qty));      sets.push('stock_qty = @stock_qty') }
    if (item_type    !== undefined) { r.input('item_type',   item_type);               sets.push('item_type = @item_type') }
    if (is_available !== undefined) { r.input('is_available', is_available ? 1 : 0);   sets.push('is_available = @is_available') }
    if (image_url    !== undefined) { r.input('image_url',   image_url || null);        sets.push('image_url = @image_url') }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update.' })
    await r.query(`UPDATE MenuItems SET ${sets.join(', ')} WHERE id = @id`)
    res.json({ message: 'Menu item updated.' })
  } catch(e) { res.status(500).json({ error: e.message }) }
}

const toggleAvailability = async (req, res) => {
  try {
    await pool.request()
      .input('id', req.params.id)
      .query('UPDATE MenuItems SET is_available = 1 - is_available WHERE id = @id')
    res.json({ message: 'Toggled.' })
  } catch(e) { res.status(500).json({ error: e.message }) }
}

const deleteMenuItem = async (req, res) => {
  try {
    const orders = await pool.request()
      .input('id', req.params.id)
      .query('SELECT id FROM OrderItems WHERE menu_item_id = @id')
    if (orders.recordset.length > 0)
      return res.status(400).json({ error: 'Cannot delete item with existing orders.' })
    await pool.request()
      .input('id', req.params.id)
      .query('DELETE FROM MenuItems WHERE id = @id')
    res.json({ message: 'Deleted.' })
  } catch(e) { res.status(500).json({ error: e.message }) }
}

module.exports = { getMenuItems, getCategories, createMenuItem, updateMenuItem, toggleAvailability, deleteMenuItem }
