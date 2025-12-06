import {createServer} from "http";
import {Server} from "socket.io";
import {env} from "./config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import {swaggerSpec} from "./config/swagger";
import authRoutes from "./modules/auth/auth.route";
import cardRoutes from "./modules/card/card.route";
import deckRoutes from "./modules/deck/deck.route";
import {SocketHandler} from "./modules/game/game.socket";

// Create Express app
const app = express();

// Middlewares
app.use(
    cors({
        origin: env.CORS_ORIGIN,
        credentials: true,
    }),
);

app.use(express.json());

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Pokemon TCG API Documentation',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
    res.json({status: "ok", message: "TCG Backend Server is running"});
});

app.use("/api/auth", authRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/decks", deckRoutes);

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.io server
const io = new Server(httpServer, {
    cors: {
        origin: env.CORS_ORIGIN,
        credentials: true,
    },
});

// Initialize Socket.io handler
new SocketHandler(io);

// Start server
try {
    httpServer.listen(env.PORT, () => {
        console.log(`\n🚀 Server is running on http://localhost:${env.PORT}`);
        console.log(`📡 Socket.io is ready for connections`);
        console.log(`📚 API Documentation available at http://localhost:${env.PORT}/api-docs`);
    });
} catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
}
