import Image from "next/image";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/locale";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const t = {
    pageTitle: locale === "ar" ? "من نحن" : "About Us",
    aboutTitle: locale === "ar" ? "عن نون" : "About Noon",
    aboutBody:
      locale === "ar"
        ? "نون مساحة للتعلّم والمرح عبر الطبخ والفنون والحِرَف. نصمم تجارب عملية يقودها خبراء، مع مجتمع دافئ يشجع على المشاركة والتجربة."
        : "Noon is a space for learning and joy through cooking, arts, and crafts. We design hands‑on, expert‑led experiences with a warm community that encourages sharing and exploration.",
    founderTitle: locale === "ar" ? "تعرف على المؤسسة" : "Meet the Founder",
    founderQuote:
      locale === "ar"
        ? "“أؤمن أن الطهي والفن يقرّبان الناس ويخلقان ذكريات جميلة.”"
        : "“I believe cooking and art bring people together and create lasting memories.”",
    founderBody:
      locale === "ar"
        ? "أسست نون لتكون وجهة تجمع بين التعلم العملي والإبداع. نؤمن بالتجارب الغنية التي تلهم وتدعم الثقة بالنفس."
        : "Noon was founded to blend hands‑on learning with creativity. We believe in rich experiences that inspire and build confidence.",
    whatWeDoTitle: locale === "ar" ? "ماذا نقدم" : "What We Do",
    teamTitle: locale === "ar" ? "فريق نون" : "The Noon Team",
    trainersTitle: locale === "ar" ? "مدربو نون" : "Noon Trainers",
    trainersCta: locale === "ar" ? "عرض جميع المدربين" : "View all trainers",
    familyTitle: locale === "ar" ? "عائلة نون الكبيرة" : "The Bigger Noon Family",
    familyBody:
      locale === "ar"
        ? "خلف كل صف وحملة فريق من أكثر من 15 مستقلاً موثوقاً يجعل التجربة أجمل." 
        : "Behind every class and campaign is a crew of 15+ trusted freelancers who make the experience shine.",
  };

  const whatWeDo =
    locale === "ar"
      ? [
          "دورات عملية بقيادة خبراء",
          "ورش فنون وحِرَف لجميع المستويات",
          "فعاليات جماعية وتجارب للشركات",
          "مواد تدريبية ووصفات قابلة للتحميل",
          "مجتمع ودود يشجع المشاركة",
        ]
      : [
          "Expert‑led, hands‑on classes",
          "Arts & crafts workshops for all levels",
          "Group events and corporate experiences",
          "Downloadable recipes and class resources",
          "A welcoming, community‑first atmosphere",
        ];

  const team =
    locale === "ar"
      ? [
          { name: "ريم العبد", role: "مديرة البرامج" },
          { name: "سارة الكعبي", role: "منسقة الفعاليات" },
          { name: "عمر الحارثي", role: "تجربة العملاء" },
          { name: "هند الفارس", role: "المحتوى والتسويق" },
        ]
      : [
          { name: "Reem Al Abd", role: "Programs Lead" },
          { name: "Sara Al Kaabi", role: "Events Coordinator" },
          { name: "Omar Al Harthi", role: "Customer Experience" },
          { name: "Hind Al Faris", role: "Content & Marketing" },
        ];

  const trainers =
    locale === "ar"
      ? [
          { name: "الشيف مايا" },
          { name: "الشيف راشد" },
          { name: "مدربة فنون: لينا" },
          { name: "مدرب حلويات: ناصر" },
        ]
      : [
          { name: "Chef Maya" },
          { name: "Chef Rashid" },
          { name: "Arts Trainer: Lina" },
          { name: "Pastry Trainer: Nasser" },
        ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <h1 className="noon-text text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.pageTitle}
          </h1>
          <p className="noon-text-muted mt-4 max-w-3xl text-sm leading-7">
            {t.aboutBody}
          </p>
        </div>
        <div className="relative aspect-square w-full max-w-sm justify-self-center overflow-hidden rounded-3xl border border-[color:var(--border)]/70 bg-[color:var(--muted)] shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900">
          <Image
            src="/images/cooking.png"
            alt={locale === "ar" ? "تجربة طبخ" : "Cooking experience"}
            fill
            className="object-contain"
            sizes="(min-width: 1024px) 40vw, 100vw"
            priority
          />
        </div>
      </div>

      <section className="mt-14 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="noon-text text-2xl font-semibold tracking-tight">
            {t.aboutTitle}
          </h2>
          <p className="noon-text-muted mt-3 text-sm leading-7">
            {t.aboutBody}
          </p>
        </div>
        <div className="rounded-3xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] p-6 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--muted)] dark:border-zinc-800/60 dark:bg-zinc-900">
              <Image
                src="/images/logo-noon.png"
                alt={locale === "ar" ? "المؤسسة" : "Founder"}
                fill
                className="object-contain"
                sizes="96px"
              />
            </div>
            <div>
              <p className="noon-text text-base font-semibold">{t.founderTitle}</p>
              <p className="noon-text-muted mt-1 text-sm leading-6">
                {t.founderBody}
              </p>
            </div>
          </div>
          <blockquote className="noon-text mt-5 text-sm italic leading-7">
            {t.founderQuote}
          </blockquote>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="noon-text text-2xl font-semibold tracking-tight">
          {t.whatWeDoTitle}
        </h2>
        <ul className="mt-4 grid gap-3 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
          {whatWeDo.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] p-4 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950"
            >
              <span className="mt-1 size-2 rounded-full bg-zinc-900 dark:bg-[color:var(--surface)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="noon-text text-2xl font-semibold tracking-tight">
          {t.teamTitle}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((member) => (
            <div
              key={member.name}
              className="rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] p-4 text-sm shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950"
            >
              <div className="relative mb-3 aspect-square w-20 overflow-hidden rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--muted)] dark:border-zinc-800/60 dark:bg-zinc-900">
                <Image
                  src="/images/art.png"
                  alt={member.name}
                  fill
                  className="object-contain"
                  sizes="80px"
                />
              </div>
              <p className="noon-text font-semibold">{member.name}</p>
              <p className="noon-text-muted mt-1 text-xs">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-center justify-between gap-3">
          <h2 className="noon-text text-2xl font-semibold tracking-tight">
            {t.trainersTitle}
          </h2>
          <Link
            href={`/${locale}/trainers`}
            className="text-sm font-medium text-[color:var(--text)] underline-offset-4 transition hover:underline dark:text-zinc-100"
          >
            {t.trainersCta}
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trainers.map((trainer) => (
            <div
              key={trainer.name}
              className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] p-4 text-sm shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950"
            >
              <div className="relative aspect-square w-12 overflow-hidden rounded-xl border border-[color:var(--border)]/70 bg-[color:var(--muted)] dark:border-zinc-800/60 dark:bg-zinc-900">
                <Image
                  src="/images/cooking.png"
                  alt={trainer.name}
                  fill
                  className="object-contain"
                  sizes="48px"
                />
              </div>
              <span className="noon-text font-medium">{trainer.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="grid gap-6 rounded-3xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] p-6 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--muted)] dark:border-zinc-800/60 dark:bg-zinc-900">
            <Image
              src="/images/art.png"
              alt={locale === "ar" ? "فريق نون" : "Noon team"}
              fill
              className="object-contain"
              sizes="(min-width: 1024px) 40vw, 100vw"
            />
          </div>
          <div>
            <h2 className="noon-text text-2xl font-semibold tracking-tight">
              {t.familyTitle}
            </h2>
            <p className="noon-text-muted mt-3 text-sm leading-7">
              {t.familyBody}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
