import { NextRequest, NextResponse } from "next/server";
import { insertAssociates } from "@/lib/dao/AssociatesDao";
import { Associate } from "@/model/interfaces/Associate";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const rows = body.rows;

    try {
        const associateData = rows.map((r: Associate) => ({
            first_name: r.first_name,
            last_name: r.last_name,
            work_date: r.work_date,
            start_time: r.start_time,
            phone_number: r.phone_number,
            email_address: r.email_address,
        }));

        console.log("Sending to Supabase:", associateData);

        const inserted = await insertAssociates(associateData);
        return NextResponse.json(inserted);
    } catch (err: unknown) {
        let parsedError = err;

        if (err instanceof Error) {
            try {
                parsedError = JSON.parse(err.message);
            } catch {
                // If JSON parsing fails, use the original error
                parsedError = { message: err.message };
            }
        }

        console.error("Insert failed:", parsedError);

        return NextResponse.json(
            {
                error: "Insert failed",
                ...(typeof parsedError === 'object' && parsedError !== null ? parsedError : { message: String(parsedError) }),
            },
            { status: 500 }
        );
    }
}