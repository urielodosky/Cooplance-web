const pool = require('../db'); // Assuming a configured pg pool
const bcrypt = require('bcrypt'); // Suggested library for passwords

/**
 * Controller to create a new user with global uniqueness check
 */
const createUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // 1. Backend Normalization
        // Remove whitespace from ends and normalize case for logic
        const cleanUsername = username ? username.trim().toLowerCase() : '';
        const cleanEmail = email ? email.trim().toLowerCase() : '';

        // 2. Validate Input
        if (!cleanUsername || cleanUsername.length < 3) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Username must be at least 3 characters long."
            });
        }

        // 3. Hash Password (Best Practice)
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 4. Insert into Database
        // Note: We insert the original (trimmed) username for display preference, 
        // but the UNIQUE INDEX (LOWER(TRIM(username))) ensures no collisions.
        const query = `
            INSERT INTO users (username, email, password_hash, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, email, role, created_at
        `;

        const values = [username.trim(), cleanEmail, passwordHash, role];
        const result = await pool.query(query, values);

        // 5. Success Response
        res.status(201).json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Error creating user:", error);

        // 6. Handle Database Errors
        // PostgreSQL Error Code 23505 = Unique Violation
        if (error.code === '23505') {
            // Check which field caused the conflict
            if (error.constraint === 'users_username_unique_idx') {
                return res.status(409).json({
                    error: "Conflict",
                    code: "USERNAME_TAKEN",
                    message: `El nombre de usuario '${req.body.username}' ya está en uso.`
                });
            }
            if (error.constraint === 'users_email_key') {
                return res.status(409).json({
                    error: "Conflict",
                    code: "EMAIL_TAKEN",
                    message: `El correo electrónico '${req.body.email}' ya está registrado.`
                });
            }
        }

        // Generic Error
        res.status(500).json({
            error: "Internal Server Error",
            message: "An unexpected error occurred."
        });
    }
};

/**
 * Controller to update user profile with uniqueness check
 */
/**
 * Controller to update user profile with uniqueness check
 */
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { username } = req.body; // + other fields like firstName, bio...

        // 1. Normalizar username
        // Remove whitespace from ends and normalize case for logic
        const newUsername = username ? username.trim().toLowerCase() : '';

        if (!newUsername || newUsername.length < 3) {
            return res.status(400).json({
                message: "Validación: El nombre de usuario debe tener al menos 3 caracteres."
            });
        }

        // 2. Validar existencia manual (excluyendo al propio usuario)
        const checkQuery = `
            SELECT id FROM users 
            WHERE LOWER(username) = LOWER($1) 
            AND id != $2
        `;
        const existingUser = await pool.query(checkQuery, [newUsername, userId]);

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "El nombre de usuario ya está en uso"
            });
        }

        // 3. Update en Base de Datos
        // Aquí actualizamos el campo a su valor. Si quieres conservar mayúsculas/minúsculas originales
        // podrías usar el valor sin toLowerCase(), pero para el ejemplo usamos newUsername.
        const updateQuery = `
            UPDATE users 
            SET username = $1, 
                updated_at = NOW()
            WHERE id = $2
            RETURNING id, username
        `;

        await pool.query(updateQuery, [newUsername, userId]);

        return res.json({ message: "Actualizado correctamente" });

    } catch (error) {
        console.error("Error updating profile:", error);

        // 4. Manejo de Error de Base de Datos (Constraint Violation)
        if (error.code === '23505') {
            return res.status(409).json({
                message: "El nombre de usuario ya está en uso"
            });
        }

        return res.status(500).json({
            message: "Error interno"
        });
    }
};

module.exports = { createUser, updateProfile };
