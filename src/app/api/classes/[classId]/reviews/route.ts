import { NextRequest, NextResponse } from "next/server";

import {
  createOrUpdateClassReview,
  getClassReviewSummary,
  findClassReviews,
} from "@/lib/db/classes";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const [reviews, summary] = await Promise.all([
      findClassReviews(classId),
      getClassReviewSummary(classId),
    ]);

    return NextResponse.json({
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.createdAt.toISOString(),
        user_full_name: review.user?.fullName ?? null,
        is_verified: true,
      })),
      summary,
    });
  } catch (error) {
    console.error("Failed to load class reviews:", error);
    return NextResponse.json({ error: "Failed to load class reviews" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { classId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      rating?: number;
      comment?: string | null;
    };

    const review = await createOrUpdateClassReview({
      classId,
      userId: user.id,
      rating: Number(body.rating ?? 0),
      comment: body.comment,
    });

    return NextResponse.json({ review, summary: review.summary });
  } catch (error) {
    console.error("Failed to save class review:", error);
    const message = error instanceof Error ? error.message : "Failed to save class review";
    const status =
      message === "Unauthorized"
        ? 401
        : message.includes("Class not found")
          ? 404
          : message.includes("Rating must")
            ? 400
            : message.includes("Only customers with a confirmed paid booking")
              ? 403
              : 500;

    return NextResponse.json({ error: message }, { status });
  }
}