import * as uuid from "uuid";
import { SignJWT } from "jose";
import crypto from "crypto";
import { AxiosHeaders } from "axios";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

/**
 * Generates a Fireblocks-compatible JWT Authorization header value.
 * @param url The request URL (path with query string).
 * @param body The raw request body as a string (default '{}').
 * @param fireblocksSecretKey The PEM-encoded private key.
 * @param fireblocksApiKey The Fireblocks API key (sub claim).
 * @returns The value for the Authorization header ("Bearer <jwt>").
 */
export async function getFireblocksAuthorizationHeader({
    url,
    body = "{}",
    fireblocksSecretKey,
    fireblocksApiKey,
}: {
    url: string;
    body?: string;
    fireblocksSecretKey?: string;
    fireblocksApiKey?: string;
}): Promise<AxiosHeaders> {
    dotenv.config();
    // Fallback to environment variables if not provided
    const apiKey = fireblocksApiKey || process.env.FB_API_KEY;
    const secretKey = fireblocksSecretKey || process.env.FB_SECRET_KEY;
    if (!apiKey) throw new Error("Fireblocks API key is required");
    if (!secretKey) throw new Error("Fireblocks secret key is required");

    const keyData = await readFileSync(secretKey)
    
    // Hash request body (sha256, hex)
    const bodyHash = crypto.createHash("sha256").update(body).digest("hex");

    // JWT header
    const jwtHeader = {
        typ: "JWT",
        alg: "RS256",
    };

    // JWT payload
    const now = Math.floor(Date.now() / 1000);
    const jwtData = {
        uri: url,
        nonce: uuid.v4(),
        iat: now,
        exp: now + 55,
        sub: apiKey,
        bodyHash,
    };

    // Sign JWT
    const privateKey = crypto.createPrivateKey({
        key: keyData,
        format: "pem",
    });

    const jwt = await new SignJWT(jwtData)
        .setProtectedHeader(jwtHeader)
        .sign(privateKey);

    return new AxiosHeaders({
        Authorization: `Bearer ${jwt}`,
        "X-API-Key": apiKey,
    });
}
