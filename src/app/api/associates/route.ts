import { NextResponse } from "next/server";
import { getAssociates } from "@/lib/dao/AssociatesDao";

export async function GET() {
    try {
        const associates = await getAssociates();
        return NextResponse.json(associates);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}