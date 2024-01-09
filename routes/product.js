import { Router } from "express";
import { dbConnection } from "../index.js";
import { uploadFile } from "../middleware/fileupload.js";

export const productRouter = Router();

productRouter.post("/product", uploadFile.array("images", 5), (req, res) => {
  try {
    // Extract product data from both form fields and uploaded files
    const {
      title,
      price,
      discountPercentage,
      discountedPrice,
      metaDescription,
    } = req.body;

    // Extract file paths from uploaded files
    const imagePaths = req.files.map((file) => file.path);

    // Concatenate image paths into a comma-separated string
    const imagePathsString = imagePaths.join(",");

    // Insert product data into the 'products' table
    dbConnection.query(
      "INSERT INTO products (title, price, discountPercentage, discountedPrice, metaDescription, imagePaths) VALUES (?, ?, ?, ?, ?, ?)",
      [
        title,
        price,
        discountPercentage,
        discountedPrice,
        metaDescription,
        imagePathsString,
      ],
      (error, result) => {
        if (error) {
          console.error(error);
          res.status(500).json({ error: "Internal Server Error" });
        } else {
          res.status(201).json({
            message: "Product created successfully",
            productId: result.insertId,
          });
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

productRouter.get("/products", (req, res) => {
  try {
    // Retrieve all products from the 'products' table
    dbConnection.query("SELECT * FROM products", (error, results) => {
      if (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.status(200).json({ products: results });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// API endpoint to get all categories
productRouter.get("/categories", (req, res) => {
  const sql = "SELECT * FROM category";

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching categories: ", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.status(200).json(result);
    }
  });
});

// API endpoint to insert categories
productRouter.post("/categories", (req, res) => {
  try {
    const categories = req.body;
    const productId = categories.productid;
    const data = categories.category;

    data.forEach((item) => {
      const { colorName, color, small, medium, large } = item;

      const sql = `
        INSERT INTO catagory (product_id, colorname, color, size_small, size_medium, size_large)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const values = [productId, colorName, color, small, medium, large];

      dbConnection.query(sql, values, (err, result) => {
        if (err) {
          console.error("Error inserting data:", err);
        } else {
          console.log("Data inserted successfully:", result);
        }
      });
    });

    res.status(201).json({ message: "Category data inserted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
