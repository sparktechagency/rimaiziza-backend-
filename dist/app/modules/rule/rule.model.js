"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule = void 0;
const mongoose_1 = require("mongoose");
const rule_interface_1 = require("./rule.interface");
const ruleSchema = new mongoose_1.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(rule_interface_1.RULE_TYPE),
      select: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);
exports.Rule = (0, mongoose_1.model)("Rule", ruleSchema);
