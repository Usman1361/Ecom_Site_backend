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
productRouter.get('/productsn', (req, res) => {
  try {
    // Retrieve products with categories using JOIN and GROUP_CONCAT
    const query = `
      SELECT
        p.id AS product_id,
        p.title,
        p.price,
        p.discountPercentage,
        p.discountedPrice,
        p.metaDescription,
        p.imagePaths,
        GROUP_CONCAT(c.colorname) AS colorname,
        GROUP_CONCAT(c.color) AS color,
        GROUP_CONCAT(c.size_small) AS size_small,
        GROUP_CONCAT(c.size_medium) AS size_medium,
        GROUP_CONCAT(c.size_large) AS size_large
      FROM
        products p
      LEFT JOIN
        catagory c ON p.id = c.product_id
      GROUP BY
        p.id, p.title, p.price, p.discountPercentage, p.discountedPrice, p.metaDescription, p.imagePaths
    `;

    dbConnection.query(query, (error, results) => {
      if (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        // Format the result according to the desired structure
        const formattedResults = results.map((result) => ({
          id: result.product_id,
          title: result.title,
          price: result.price,
          discountPercentage: result.discountPercentage,
          discountedPrice: result.discountedPrice,
          metaDescription: result.metaDescription,
          image: result.imagePaths
          .split(',')
          .map((imagePath) => imagePath.trim().replace(/\\/g, '/')), // Split and trim image paths
          catagory: result.colorname.split(',').map((colorname, index) => ({
            id: index + 1,
            product_id: result.product_id,
            colorname: colorname,
            color: result.color.split(',')[index],
            size_small: parseInt(result.size_small.split(',')[index]),
            size_medium: parseInt(result.size_medium.split(',')[index]),
            size_large: parseInt(result.size_large.split(',')[index]),
          })),
        }));

        res.status(200).json({ products: formattedResults });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// API endpoint to get all categories
productRouter.get("/categories", (req, res) => {
  const sql = "SELECT * FROM catagory";

  dbConnection.query(sql, (err, result) => {
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
