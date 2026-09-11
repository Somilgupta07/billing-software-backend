const mongoose = require("mongoose");
const Bill = require("../models/Bill");
const Customer = require("../models/customer");
const Product = require("../models/product");
const product = require("../models/product");

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

exports.createBill = async (req, res) => {
  const { customerId, items, discountPercent = 0, taxPercent = 0 } = req.body;

  if (!customerId) {
    return res
      .status(400)
      .json({ success: false, message: "Customer must be selected" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "At least one product must be added" });
  }
  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Each item requires a valid productId and a quantity greater than 0",
      });
    }
  }
  if (discountPercen < 0 || discountPercent > 100) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Discount percent must be between 0 and 100",
      });
  }
  if (taxPercent < 0 || taxPercent > 100) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Tax percent must be between 0 and 100",
      });
  }

  const customer = await Customer.findById(customerId).catch(() => null);
  if (!customer) {
    return res.status(400).json({
      success: false,
      message: "Customer not found",
    });
  }

  const decrementedProductIds = [];
  const billItems = [];

  try {
    for (const { productId, quantity } of items) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: productId, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: true },
      );
      if (!updatedProduct) {
        const existsCheck = await Product.findById(productId);
        if (!existsCheck) {
          throw { status: 404, message: `Product not found: ${productId}` };
        }
        throw {
          status: 400,
          message: `Insufficient stock for "${existsCheck.name}". Available: ${existsCheck.quantity}, requested: ${quantity}`,
        };
      }
      decrementedProductIds.push({ productId, quantity });

      const itemTotal = round2(updatedProduct.price * quantity);
      billItems.push({
        product: updatedProduct._id,
        name: updatedProduct.name,
        sku: updatedProduct.sku,
        price: updatedProduct.price,
        quantity,
        itemTotal,
      });
    }
  } catch (err) {
    await rollbackStock(decrementedProductIds);
    const status = err.status || 500;
    return res
      .status(status)
      .json({
        success: false,
        message: err.message || "Failed to reserve stock",
      });
  }

  try {
    const subtotal = round2(
      billItems.reduce((sum, item) => sum + item.itemTotal, 0),
    );
    const discountAmount = round2((subtotal * discountPercent) / 100);
    const afterDiscount = round2(subtotal - discountAmount);
    const taxAmount = round2((afterDiscount * taxPercent) / 100);
    const totalAmount = round2(afterDiscount + taxAmount);

    const bill = await Bill.create({
      customer: customer._id,
      items: billItems,
      subtotal,
      discountPercent,
      discountAmount,
      taxPercent,
      taxAmount,
      totalAmount,
    });

    const populatedBill = await Bill.findById(bill._id).populate(
      "customer",
      "name phone address",
    );

    res.status(201).json({ sucess: true, data: populatedBill });
  } catch (error) {
    await rollBackStock(decrementedProductIds);
    res.status(500).json({ sucess: false, message: error.message });
  }
};

async function rollBackStock(decrementedProductIds) {
  for (const { productId, quantity } of decrementedProductIds) {
    await Product.findByIdAndUpdate(productId, { $inc: { quantity } }).catch(
      () => {},
    );
  }
}

exports.getBills = async (req, res) => {
  try {
    const bills = await Bill.find()
      .populate("customer", "name phone address")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: bills.length, data: bills });
  } catch (error) {
    res.status(500).json({ sucess: false, message: error.message });
  }
};

exports.getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate(
      "customer",
      "name phone address",
    );
    if (!bill) {
      return res
        .status(404)
        .json({ success: false, message: "Bill not found" });
    }
    res.status(200).json({ success: true, data: bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
