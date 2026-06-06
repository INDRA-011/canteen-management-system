const { pool } = require("../config/db");

// GET /api/admin/menu
// Returns all menu items with their category name joined in.
// Admin uses this to populate the menu management table.
const getMenuItems = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT m.id, m.name, m.price, m.stock_qty, m.is_available,
             m.item_type, m.created_at,
             c.id AS category_id, c.name AS category_name
      FROM MenuItems m
      JOIN Categories c ON m.category_id = c.id
      ORDER BY c.name, m.name
    `);
    return res.status(200).json({ menuItems: result.recordset });
  } catch (error) {
    return res.status(500).json({ error: "Server error fetching menu." });
  }
};

// GET /api/admin/menu/categories
// Returns all categories. Used to populate the category
// dropdown when admin adds or edits a menu item.
const getCategories = async (req, res) => {
  try {
    const result = await pool.request().query("SELECT * FROM Categories");
    return res.status(200).json({ categories: result.recordset });
  } catch (error) {
    return res.status(500).json({ error: "Server error fetching categories." });
  }
};

// POST /api/admin/menu
// Creates a new menu item. item_type must be MEAL or DRINK.
const createMenuItem = async (req, res) => {
  try {
    const { name, price, stock_qty, item_type, category_id, is_available } =
      req.body;

    if (!name || !price || !item_type || !category_id) {
      return res
        .status(400)
        .json({ error: "name, price, item_type, category_id are required." });
    }

    if (!["MEAL", "DRINK"].includes(item_type)) {
      return res
        .status(400)
        .json({ error: "item_type must be MEAL or DRINK." });
    }

    await pool
      .request()
      .input("name", name.trim())
      .input("price", price)
      .input("stock_qty", stock_qty || 0)
      .input("item_type", item_type)
      .input("category_id", category_id)
      .input("is_available", is_available !== undefined ? is_available : 1)
      .query(`
        INSERT INTO MenuItems (name, price, stock_qty, item_type, category_id, is_available)
        VALUES (@name, @price, @stock_qty, @item_type, @category_id, @is_available)
      `);

    return res
      .status(201)
      .json({ message: `Menu item "${name}" created successfully.` });
  } catch (error) {
    return res.status(500).json({ error: "Server error creating menu item." });
  }
};

// PATCH /api/admin/menu/:id
// Updates any field of a menu item — price, stock, availability.
// PATCH means partial update — only send the fields you want to change.
const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock_qty, is_available, category_id } = req.body;

    // Build dynamic SET clause — only update fields that were sent
    const updates = [];
    const request = pool.request().input("id", id);

    if (name !== undefined) {
      updates.push("name = @name");
      request.input("name", name);
    }
    if (price !== undefined) {
      updates.push("price = @price");
      request.input("price", price);
    }
    if (stock_qty !== undefined) {
      updates.push("stock_qty = @stock_qty");
      request.input("stock_qty", stock_qty);
    }
    if (is_available !== undefined) {
      updates.push("is_available = @is_available");
      request.input("is_available", is_available);
    }
    if (category_id !== undefined) {
      updates.push("category_id = @category_id");
      request.input("category_id", category_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update provided." });
    }

    await request.query(
      `UPDATE MenuItems SET ${updates.join(", ")} WHERE id = @id`,
    );

    return res.status(200).json({ message: "Menu item updated successfully." });
  } catch (error) {
    return res.status(500).json({ error: "Server error updating menu item." });
  }
};

// PATCH /api/admin/menu/:id/toggle
// Quickly toggles is_available on or off.
// Admin uses this to mark an item as sold out without deleting it.
const toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    await pool
      .request()
      .input("id", id)
      .query(
        "UPDATE MenuItems SET is_available = 1 - is_available WHERE id = @id",
      );

    return res.status(200).json({ message: "Availability toggled." });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Server error toggling availability." });
  }
};

// DELETE /api/admin/menu/:id
// Deletes a menu item only if it has never been ordered.
// Protects historical order data integrity.
const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    const orders = await pool
      .request()
      .input("id", id)
      .query("SELECT id FROM OrderItems WHERE menu_item_id = @id");

    if (orders.recordset.length > 0) {
      return res
        .status(400)
        .json({
          error:
            "Cannot delete item that has been ordered. Toggle it unavailable instead.",
        });
    }

    await pool
      .request()
      .input("id", id)
      .query("DELETE FROM MenuItems WHERE id = @id");

    return res.status(200).json({ message: "Menu item deleted." });
  } catch (error) {
    return res.status(500).json({ error: "Server error deleting menu item." });
  }
};

module.exports = {
  getMenuItems,
  getCategories,
  createMenuItem,
  updateMenuItem,
  toggleAvailability,
  deleteMenuItem,
};
