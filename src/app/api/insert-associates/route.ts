import { NextRequest, NextResponse } from "next/server";
import { insertAssociate } from "@/lib/dao/AssociatesDao";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const rows = body.rows;

    try {
        const associateData = rows.map((r: any) => ({
            first_name: r.first_name,
            last_name: r.last_name,
            work_date: r.work_date,
            start_time: r.start_time,
            phone_number: r.phone_number,
            email_address: r.email_address,
        }));

        console.log("Sending to Supabase:", associateData);

        const inserted = await insertAssociate(associateData);
        return NextResponse.json(inserted);
    } catch (err: any) {
        let parsedError = err;

        try {
            parsedError = JSON.parse(err.message);
        } catch {}

        console.error("Insert failed:", parsedError);

        return NextResponse.json(
            {
                error: "Insert failed",
                ...parsedError,
            },
            { status: 500 }
        );
    }
}