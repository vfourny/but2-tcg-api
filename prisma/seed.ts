import bcrypt from "bcryptjs";
import {readFileSync} from "fs";
import {join} from "path";
import {prisma} from "../src/database";
import {CardModel} from "../src/generated/prisma/models/Card";
import {PokemonType} from "../src/generated/prisma/enums";

async function main() {
    console.log("🌱 Starting database seed...");

    await prisma.deckCard.deleteMany();
    await prisma.deck.deleteMany();
    await prisma.card.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash("password123", 10);

    await prisma.user.createMany({
        data: [
            {
                username: "red",
                email: "red@example.com",
                password: hashedPassword,
            },
            {
                username: "blue",
                email: "blue@example.com",
                password: hashedPassword,
            },
        ],
    });

    const redUser = await prisma.user.findUnique({where: {email: "red@example.com"}});
    const blueUser = await prisma.user.findUnique({where: {email: "blue@example.com"}});

    if (!redUser || !blueUser) {
        throw new Error("Failed to create users");
    }

    console.log("✅ Created users:", redUser.username, blueUser.username);

    const pokemonDataPath = join(__dirname, "data", "pokemon.json");
    const pokemonJson = readFileSync(pokemonDataPath, "utf-8");
    const pokemonData: CardModel[] = JSON.parse(pokemonJson);

    await prisma.card.createMany({
        data: pokemonData.map((pokemon) => ({
            id: pokemon.id,
            name: pokemon.name,
            hp: pokemon.hp,
            attack: pokemon.attack,
            defense: pokemon.defense,
            type: PokemonType[pokemon.type as keyof typeof PokemonType],
            pokedexNumber: pokemon.pokedexNumber,
            imgUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokedexNumber}.png`,
        })),
    });

    console.log(`✅ Created ${pokemonData.length} Pokemon cards`);

    // Create decks for each user
    const users = [
        {user: redUser, deckName: "Red's Deck"},
        {user: blueUser, deckName: "Blue's Deck"},
    ];

    for (const {user, deckName} of users) {
        const shuffledPokemon = [...pokemonData].sort(() => Math.random() - 0.5);
        const randomCards = shuffledPokemon.slice(0, 20);

        await prisma.deck.create({
            data: {
                name: deckName,
                userId: user.id,
                cards: {
                    create: randomCards.map((pokemon) => ({
                        cardId: pokemon.id,
                    })),
                },
            },
        });

        console.log(
            `✅ Created ${deckName} for ${user.username} with 20 random cards`,
        );
    }
    console.log("\n🎉 Database seeding completed!");
}

main()
    .catch((e) => {
        console.error("❌ Error seeding database:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
