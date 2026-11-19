import { getPublicSiteBaseUrl } from "@/lib/publicSiteUrl";

// A short, plain-text guide to the site for AI assistants (llmstxt.org).
export const dynamic = "force-static";

export function GET() {
  const base = getPublicSiteBaseUrl();
  const body = `# Noon (نون)

> Noon is a studio in Muscat, Oman offering hands-on cooking and arts & crafts workshops, private group events, birthday parties and cooking competitions, plus an online shop. The site is available in Arabic (/ar) and English (/en).

## Workshops

- [Cooking workshops](${base}/en/classes/cooking): Upcoming cooking classes with dates, prices and booking
- [Arts & crafts workshops](${base}/en/classes/arts-crafts): Upcoming arts and crafts classes
- [Trainers](${base}/en/trainers): The chefs and trainers who teach at Noon

## Group events

- [Group events overview](${base}/en/group-booking-events): All event types and how booking works
- [Cooking competition](${base}/en/group-booking-events/cooking-competition): Team cooking competitions for companies and friends
- [Private workshops](${base}/en/group-booking-events/private-classes): A private cooking or arts session for a group
- [Birthday parties](${base}/en/group-booking-events/birthday-parties): Cooking-themed birthday parties for kids

## Shop

- [Shop](${base}/en/shop): Ingredients, kitchen tools and gifts, delivered within Muscat

## About and help

- [About Noon](${base}/en/about): The studio and its story
- [Contact](${base}/en/contact): Location, phone, email and contact form
- [FAQs](${base}/en/faqs): Booking, payment and cancellation questions
- [Terms & conditions](${base}/en/terms): Booking and payment terms

## Arabic

- [الصفحة الرئيسية](${base}/ar): النسخة العربية من الموقع
- [خريطة الموقع](${base}/sitemap.xml): جميع الصفحات باللغتين
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
