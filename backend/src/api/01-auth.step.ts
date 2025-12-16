import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";


// Step-1 : Configure the step
export const config: ApiRouteConfig = {
    name: "AuthStep",
    type: "api",
    path: "/auth",
    method: "POST",
    description: "Authentication endpoint",
    // TODO: Add "auth-success" and "auth-error" when downstream steps are created
    emits: [],
    flows: ["auth-flow"],
    bodySchema: z.object({
        email: z.string().email(),
        password: z.string().min(8),
    }),
    responseSchema: {
        200: z.object({
            message: z.string(),
            userId: z.string().optional(),
        }),
        401: z.object({
            error: z.string(),
        }),
    },
};

// Step-2 : Handle Logic
export const handler: Handlers['AuthStep'] = async (req, { emit, logger }) => {
    const { email, password } = req.body;
    logger.info("Authenticating user", { email });

    // TODO: Uncomment when downstream steps are created
    // await emit({
    //     topic: "auth-success",
    //     data: {
    //         email,
    //         timestamp: new Date().toISOString(),
    //     }
    // })

    return {
        status: 200,
        body: {
            email,
            message: "User authenticated successfully",
        },
    };
}