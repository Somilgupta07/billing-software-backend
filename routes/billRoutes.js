const express = require("express");
const router = express.Router();
const {
  createBill,
  getBills,
  getBillById,
} = require("../controllers/billController");

router.route("/").post(createBill).get(getBills);
router.route("/:id").get(getBillById);

module.exports = router;
