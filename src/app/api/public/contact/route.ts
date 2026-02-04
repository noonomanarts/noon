import { NextRequest, NextResponse } from "next/server";
import { createContactMessage } from "@/lib/db/contacts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Name, email, subject, and message are required" },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Create contact message
    const contactMessage = await createContactMessage({
      name,
      email,
      phone: phone || null,
      subject,
      message,
    });

    return NextResponse.json({
      success: true,
      message: "Contact message submitted successfully",
      id: contactMessage.id,
    });
  } catch (error) {
    console.error("Error creating contact message:", error);
    return NextResponse.json(
      { error: "Failed to submit contact message" },
      { status: 500 }
    );
  }
}
