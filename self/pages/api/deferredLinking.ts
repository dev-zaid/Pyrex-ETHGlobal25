import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === "POST") {
        try {
            const payload = req.body;
            // Payload received (logging disabled)

            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch("https://api.staging.self.xyz/post-deferred-linking-token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                
                // Return a fallback token for development
                return res.status(200).json({ 
                    data: "demo-token-" + Date.now(),
                    fallback: true 
                });
            }

            const data = await response.json();
            res.status(200).json(data);
        } catch (error) {
            // Error occurred (logging disabled)
            
            // Return fallback token on any error
            res.status(200).json({ 
                data: "demo-token-" + Date.now(),
                fallback: true 
            });
        }
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}
