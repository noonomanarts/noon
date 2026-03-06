import { NextRequest, NextResponse } from "next/server";
import { createContactMessage } from "@/lib/db/contacts";
import { notifyRole } from "@/lib/notificationService";
import { isValidEmail, isValidPhone } from "@/lib/forms/eventBooking";

function parseSafeString(value: unknown, maxLength = 3000): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = parseSafeString(body.name, 255);
    const email = parseSafeString(body.email, 255).toLowerCase();
    const phone = parseSafeString(body.phone, 50);
    const subject = parseSafeString(body.subject, 255);
    const message = parseSafeString(body.message, 4000);

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Name, email, subject, and message are required" },
        { status: 400 }
      );
    }

    // Email validation
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json(
        { error: "Invalid phone format" },
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

    await notifyRole("ADMIN", {
      type: "contact_message_new",
      title: "New Contact Message",
      message: `${name} sent a new contact request: ${subject}`,
      data: {
        contactMessageId: contactMessage.id,
        name,
        email,
        subject,
      },
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
