import {Response} from 'express';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {env} from "../env";
import {prisma} from "../database";
import {JwtPayload, SignInRequest, SignUpRequest} from "../types/auth.type";

/**
 * Gère l'inscription d'un nouvel utilisateur.
 *
 * @param req - Requête Express contenant email, password et username
 * @param res - Réponse Express
 * @returns Token JWT et données utilisateur
 *
 * @remarks
 * Hash le mot de passe avec bcrypt avant stockage. Le token JWT expire après 7 jours.
 */
export const signUp = async (
    req: SignUpRequest,
    res: Response
) => {
    try {
        const {email, password, username} = req.body;

        if (!email || !password || !username) {
            res.status(400).json({
                error: "Bad Request",
                message: "All fields are required"
            });
            return;
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{email}, {username}],
            },
        });

        if (existingUser) {
            res.status(409).json({
                error: "Conflict",
                message: "User with this email or username already exists",
            });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                username,
            },
        });

        const token = jwt.sign(
            {userId: user.id, email: user.email} satisfies JwtPayload,
            env.JWT_SECRET,
            {expiresIn: '7d'},
        );

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
            },
        });
    } catch (error) {
        console.error("Sign up error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to sign up user",
        });
    }
};

/**
 * Gère l'authentification d'un utilisateur existant.
 *
 * @param req - Requête Express contenant email et password
 * @param res - Réponse Express
 * @returns Token JWT et données utilisateur
 *
 * @remarks
 * Valide les credentials avec bcrypt. Le token JWT expire après 7 jours.
 */
export const signIn = async (
    req: SignInRequest,
    res: Response
) => {
    try {
        const {email, password} = req.body;

        if (!email || !password) {
            res.status(400).json({
                error: "Bad Request",
                message: "Email and password are required",
            });
            return;
        }

        const user = await prisma.user.findUnique({
            where: {email: email.toLowerCase()},
        });

        if (!user) {
            res.status(401).json({
                error: "Unauthorized",
                message: "Invalid credentials"
            });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            res.status(401).json({
                error: "Unauthorized",
                message: "Invalid credentials"
            });
            return;
        }

        const token = jwt.sign(
            {userId: user.id, email: user.email} satisfies JwtPayload,
            env.JWT_SECRET,
            {expiresIn: '7d'},
        );

        res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
            },
        });
    } catch (error) {
        console.error("Sign in error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to sign in"
        });
    }
};
