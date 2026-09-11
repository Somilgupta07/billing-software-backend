const Product = require("../models/product");

exports.createProduct = async (req, res) => {
  try {
    const { name, sku, price, quantity } = req.body;
    if (!name || !sku || price == null || quantity == null) {
      return res.status(400).json({
        success: false,
        message: "Name,SKU,price and quantity are all required",
      });
    }
    if (price < 0 || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Price and quantity must not be non-negative",
      });
    }
    const existing = await Product.findOne({ sku: sku.toUpperCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A product with this SKU already exists",
      });
    }
    const product = await Product.create({ name, sku, price, quantity });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { price, quantity } = req.body;
    if (price != null && price < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Price cannot be negative" });
    }
    if (quantity != null && quantity < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Quantitu cannot be negative" });
    }
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
