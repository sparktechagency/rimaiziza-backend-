"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
const getFilePath_1 = require("../../shared/getFilePath");
const parseAllFilesData = (...fields) => {
  return (req, res, next) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        const fileData = {};
        for (const field of fields) {
          const fieldName = typeof field === "string" ? field : field.fieldName;
          const forceMultiple =
            typeof field !== "string" && field.forceMultiple;
          const forceSingle = typeof field !== "string" && field.forceSingle;
          let filePaths;
          if (forceMultiple) {
            filePaths = (0, getFilePath_1.getMultipleFilesPath)(
              req.files,
              fieldName,
            );
          } else if (forceSingle) {
            filePaths = (0, getFilePath_1.getSingleFilePath)(
              req.files,
              fieldName,
            );
          } else {
            const files = req.files[fieldName];
            filePaths = files ? files.map((file) => file.path) : [];
          }
          if (filePaths) {
            fileData[fieldName] = filePaths;
          }
        }
        // Handle body data and merge with file paths
        if (req.body && req.body.data) {
          const data = JSON.parse(req.body.data);
          req.body = Object.assign(Object.assign({}, data), fileData);
        } else {
          req.body = Object.assign({}, fileData);
        }
        next();
      } catch (error) {
        next(error);
      }
    });
};
exports.default = parseAllFilesData;
