import { Router } from "express";
import { dbConnection } from "../index.js";
import {
  ADMIN_EMAIL,
  ADMIN_EMAILPASSWORD,
  JWTSCECRETKEY,
} from "../config/app.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
export const userRoute = Router();

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: ADMIN_EMAIL,
    pass: ADMIN_EMAILPASSWORD,
  },
});
userRoute.post("/", async (req, res) => {
  try {
    const data = req.body;
    dbConnection.query(
      "SELECT email FROM Users WHERE email = ?",
      [data?.email],
      (error, result) => {
        if (error) {
          return res.status(500).json({
            status: false,
            message: "Internal Server Error",
          });
        } else {
          if (result.length > 0) {
            return res.status(409).json({
              status: false,
              message: "User Already Created",
            });
          } else {
            console.log("User Not Found, Creating...");
            dbConnection.query(
              "INSERT INTO Users SET ?",
              data,
              (error, result) => {
                if (error) {
                  return res.status(500).json({
                    status: false,
                    message: "Internal Server Error",
                  });
                } else {
                  const mailOptions = {
                    from: ADMIN_EMAIL, // Sender email address
                    to: data.email,
                    subject: "Welcome to Shop.Co.",

                    html: `<body><p>Dear ${data.name},</p><p>السلام عليكم ورحمة الله وبركاته</p><p>Thank you for signing up with Shop Co, the No.1 Shopping platform! We're thrilled to have you as part of our community</p></body>`,
                  };

                  transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                      console.error("Email sending failed:", error);
                    } else {
                      console.log("Email sent:", info.response);
                    }
                  });

                  return res.status(201).json({
                    status: true,
                    message: "User Created Successfully",
                  });
                }
              }
            );
          }
        }
      }
    );
  } catch (error) {
    res.status(400).json({
      status: false,
      message: "Try Again!",
    });
  }
});

userRoute.post("/signin", (req, res) => {
  try {
    const data = req.body;
    dbConnection.query(
      "SELECT email,password FROM Users WHERE email = ? AND password = ?",
      [data.email, data.password],
      (err, result) => {
        if (!err) {
          if (result.length > 0) {
            // Successful sign-in
            const payload = {};

            const token = jwt.sign(payload, JWTSCECRETKEY, { expiresIn: "3h" });

            res.status(200).json({
              success: true,
              message: "Sign-in successful",
              token: token,
            });
          } else {
            // No matching user found
            res.status(404).json({
              success: false,
              message: "Invalid email or password",
            });
          }
        } else {
          // Error occurred during query
          res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err,
          });
        }
      }
    );
  } catch (err) {
    // Error occurred during try block
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err,
    });
  }
});

userRoute.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Generate a random verification code
    const verificationCode = crypto.randomBytes(4).toString("hex");

    // Check if user exists in the database
    dbConnection.query(
      "SELECT * FROM Users WHERE email = ?",
      email,
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Database error" });
        }

        if (result.length > 0) {
          // Update user's verification code in the database
          dbConnection.query(
            "UPDATE Users SET verification_code = ? WHERE email = ?",
            [verificationCode, email],
            (updateErr, updateResult) => {
              if (updateErr) {
                console.error(`Error updating verification code: ${updateErr}`);
                return res.status(500).json({ message: "Update error" });
              }

              // Send the verification code to the user's email

              const mailOptions = {
                from: ADMIN_EMAIL,
                to: email,
                subject: "Password Reset Verification Code",
                text: `Your verification code is: ${verificationCode}`,
              };

              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  console.error(error);
                  res.status(500).json({ message: "Error sending email" });
                } else {
                  console.log("Email sent: " + info.response);
                  res
                    .status(200)
                    .json({ message: "Verification code sent successfully" });
                }
              });
            }
          );
        } else {
          res.status(500).json({ message: "User not found" });
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
userRoute.post("/verifycode", (req, res) => {
  const { email, verificationCode } = req.body;

  try {
    // Check if the verification code matches the one in the database
    const response = dbConnection.query(
      "SELECT * FROM Users WHERE email = ? AND verification_code = ?",
      [email, verificationCode],
      (err, result) => {
        if (result.length > 0) {
          return res.status(200).json({ message: "verification code matched" });
        }
        if (err) {
          return res.status(400).json({ message: "Db Error" });
        } else {
          return res.status(400).json({ message: "Invalid verification code" });
        }
      }
    );

    // Hash the new password
    // const hashedPassword = bcrypt.hash(newPassword, 10);

    // Update the user's password and clear the verification code
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

userRoute.post("/reset-password", async (req, res) => {
  const { email, verificationCode, newPassword } = req.body;

  try {
    // Check if the verification code matches the one in the database
    dbConnection.query(
      "SELECT * FROM Users WHERE email = ? AND verification_code = ?",
      [email, verificationCode],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Database error" });
        }

        if (result.length > 0) {
          // Verification code matched, update the password
          dbConnection.query(
            "UPDATE Users SET password = ?, verification_code = NULL WHERE email = ?",
            [newPassword, email],
            (updateErr, result2) => {
              if (updateErr) {
                console.error(updateErr);
                return res.status(500).json({ message: "Database error" });
              }

              if (result2.affectedRows > 0) {
                return res
                  .status(200)
                  .json({ message: "Password reset successful" });
              } else {
                return res
                  .status(400)
                  .json({ message: "Password not updated" });
              }
            }
          );
        } else {
          return res.status(400).json({ message: "Invalid verification code" });
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
userRoute.get("/users", (req, res) => {
  const query = "SELECT * FROM Users";

  dbConnection.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching data:", error);
      return res
        .status(500)
        .json({ error: "An error occurred while fetching data." });
    }

    return res.status(200).json({ data: results });
  });
});
userRoute.put("/users/:id", (req, res) => {
  const id = req.params.id;
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required." });
  }

  const query = "UPDATE Users SET name = ?, email = ? WHERE id = ?";

  dbConnection.query(query, [name, email, id], (error, results) => {
    if (error) {
      console.error("Error updating user:", error);
      return res
        .status(500)
        .json({ error: "An error occurred while updating User." });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({ message: "User updated successfully." });
  });
});
