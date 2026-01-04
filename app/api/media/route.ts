import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDynamicImageUrlSchema } from "@/app/schemas";
import { getDynamicImageUrl } from "@/app/features/shared/actions/upload-to-gcs";
import logger from "@/app/logger";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const gcsUri = searchParams.get("uri");
    const download = searchParams.get("download") === "true";

    if (!gcsUri) {
        return NextResponse.json({ error: "Missing uri" }, { status: 400 });
    }

    // Validate using existing schema
    const parseResult = getDynamicImageUrlSchema.safeParse({
        gcsUri,
        download,
    });

    if (!parseResult.success) {
        return NextResponse.json(
            { error: "Invalid URI format", details: parseResult.error },
            { status: 400 },
        );
    }

    try {
        const result = await getDynamicImageUrl(gcsUri, download);

        return NextResponse.json(result, {
            headers: {
                "Cache-Control": "private, max-age=3000",
            },
        });
    } catch (error) {
        logger.error("Error in URL API:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
