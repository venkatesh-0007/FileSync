import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getExpiredFilesForCleanup, deleteFileMetadata } from "@/lib/db";
import { deleteFileFromStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return false;
  }

  const tokenBuffer = Buffer.from(parts[1]);
  const secretBuffer = Buffer.from(cronSecret);

  if (tokenBuffer.length !== secretBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(tokenBuffer, secretBuffer);
}

/**
 * Scheduled cron job to clean up expired files and old trashed files
 * from both Supabase Storage and database.
 */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET is not configured on the server" },
      { status: 500 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const expiredFiles = await getExpiredFilesForCleanup();

    let storageDeleted = 0;
    let recordsDeleted = 0;
    const errors: string[] = [];

    for (const file of expiredFiles) {
      try {
        // 1. Remove storage object
        await deleteFileFromStorage(file.storage_path);
        storageDeleted++;
      } catch (err: unknown) {
        errors.push(`Storage delete error for ${file.id}: ${err instanceof Error ? err.message : String(err)}`);
      }

      try {
        // 2. Remove database record
        await deleteFileMetadata(file.id);
        recordsDeleted++;
      } catch (err: unknown) {
        errors.push(`DB delete error for ${file.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${recordsDeleted} expired/trashed files`,
      totalExpiredFound: expiredFiles.length,
      storageObjectsDeleted: storageDeleted,
      databaseRecordsDeleted: recordsDeleted,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cleanup execution failed"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
