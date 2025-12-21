import {createServer} from "http";
import {env} from "./env";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import {swaggerDocument} from "./docs";
import authRoutes from "./routes/auth.route";
import cardRoutes from "./routes/card.route";
import deckRoutes from "./routes/deck.route";
import {SocketHandler} from "./sockets/game.socket";

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

// Serve static files (Socket.io test client)
app.use(express.static('public'));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Pokemon TCG API Documentation',
}));

// Health check endpoint
app.get("/api/health", (_req, res) => {
    res.json({status: "ok", message: "TCG Backend Server is running"});
});

app.use("/api/auth", authRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/decks", deckRoutes);

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io handler (creates Socket.io server internally)
new SocketHandler(httpServer);

// Start server
try {
    httpServer.listen(env.PORT, () => {
        console.log(`\n🚀 Server is running on http://localhost:${env.PORT}`);
        console.log(`📡 Socket.io is ready for connections`);
        console.log(`📚 API Documentation available at http://localhost:${env.PORT}/api-docs`);
        console.log(`🧪 Socket.io Test Client available at http://localhost:${env.PORT}`);
    });
} catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
}
